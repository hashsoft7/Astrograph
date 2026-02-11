import { useEffect, useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import { invoke } from "@tauri-apps/api/core";
import { Symbol, Span } from "../types";

interface SourcePreviewProps {
  symbol: Symbol;
  rootPath: string | null;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "rs":
      return "rust";
    case "js":
    case "cjs":
    case "mjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    default:
      return "text";
  }
}

function getCodeSnippet(
  content: string,
  span: Span,
  contextLines: number = 5,
): { code: string; startLine: number; highlightedStart: number; highlightedEnd: number } {
  const lines = content.split("\n");
  const startLine = Math.max(0, span.start_line - 1 - contextLines);
  const endLine = Math.min(lines.length, span.end_line + contextLines);
  const snippet = lines.slice(startLine, endLine).join("\n");
  
  // Calculate the highlighted range within the snippet
  const highlightedStart = span.start_line - 1 - startLine;
  const highlightedEnd = span.end_line - startLine;
  
  return {
    code: snippet,
    startLine: startLine + 1, // 1-indexed for display
    highlightedStart,
    highlightedEnd,
  };
}

function highlightSpan(
  code: string,
  snippetStartLine: number,
  spanStartLine: number,
  spanEndLine: number,
  spanStartCol: number,
  spanEndCol: number,
): string {
  const lines = code.split("\n");
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = snippetStartLine + i;
    const line = lines[i];
    
    if (currentLine === spanStartLine - 1 && currentLine === spanEndLine - 1) {
      // Single line span
      const before = line.substring(0, spanStartCol - 1);
      const highlight = line.substring(spanStartCol - 1, spanEndCol);
      const after = line.substring(spanEndCol);
      result.push(
        `${before}<mark class="symbol-highlight">${highlight}</mark>${after}`,
      );
    } else if (currentLine === spanStartLine - 1) {
      // First line of multi-line span
      const before = line.substring(0, spanStartCol - 1);
      const highlight = line.substring(spanStartCol - 1);
      result.push(
        `${before}<mark class="symbol-highlight">${highlight}</mark>`,
      );
    } else if (currentLine > spanStartLine - 1 && currentLine < spanEndLine - 1) {
      // Middle lines of multi-line span
      result.push(`<mark class="symbol-highlight">${line}</mark>`);
    } else if (currentLine === spanEndLine - 1) {
      // Last line of multi-line span
      const highlight = line.substring(0, spanEndCol);
      const after = line.substring(spanEndCol);
      result.push(
        `<mark class="symbol-highlight">${highlight}</mark>${after}`,
      );
    } else {
      result.push(line);
    }
  }
  
  return result.join("\n");
}

// Check if Tauri is available (same method as App.tsx)
const isTauri = Boolean(import.meta.env.TAURI_PLATFORM);

const SourcePreview = ({ symbol, rootPath }: SourcePreviewProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const language = useMemo(() => detectLanguage(symbol.file), [symbol.file]);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    if (!rootPath) {
      setError("No project root path available");
      return;
    }

    setLoading(true);
    setError(null);
    setContent(null);

    invoke<string>("read_file_content", {
      rootPath,
      filePath: symbol.file,
    })
      .then((fileContent) => {
        setContent(fileContent);
        setLoading(false);
      })
      .catch((err) => {
        const anyErr = err as unknown as { payload?: { code?: string; message?: string } };
        const payload = anyErr?.payload;
        
        if (payload?.code === "file_not_found") {
          setError(`File not found: ${symbol.file}`);
        } else if (payload?.code === "io_error") {
          setError(payload.message || "Error reading file");
        } else {
          setError(payload?.message || "Failed to read file");
        }
        setLoading(false);
      });
  }, [symbol.file, rootPath]);

  const highlightedCode = useMemo(() => {
    if (!content) return null;

    const { code, startLine, highlightedStart, highlightedEnd } = getCodeSnippet(
      content,
      symbol.span,
    );

    // Apply span highlighting
    const lines = code.split("\n");
    const spanStartLine = symbol.span.start_line;
    const spanEndLine = symbol.span.end_line;
    const spanStartCol = symbol.span.start_col;
    const spanEndCol = symbol.span.end_col;

    const highlighted = highlightSpan(
      code,
      startLine,
      spanStartLine,
      spanEndLine,
      spanStartCol,
      spanEndCol,
    );

    // Apply syntax highlighting with Prism
    const prismLang = language === "tsx" ? "tsx" : language;
    const syntaxHighlighted = Prism.highlight(highlighted, Prism.languages[prismLang] || Prism.languages.text, prismLang);

    return { code: syntaxHighlighted, startLine };
  }, [content, symbol.span, language]);

  // Don't render anything if Tauri is not available (e.g., in browser/e2e tests)
  if (!isTauri) {
    return null;
  }

  if (loading) {
    return (
      <div className="source-preview">
        <div className="source-preview-loading">Loading source code...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="source-preview">
        <div className="source-preview-error">{error}</div>
      </div>
    );
  }

  if (!highlightedCode) {
    return null;
  }

  const handleOpenInEditor = async () => {
    if (!isTauri || !rootPath) return;

    try {
      await invoke("open_file_in_editor", {
        rootPath,
        filePath: symbol.file,
        line: symbol.span.start_line,
      });
    } catch (err) {
      console.error("Failed to open file in editor:", err);
    }
  };

  return (
    <div className="source-preview">
      <div className="source-preview-header">
        <span className="source-preview-file">{symbol.file}</span>
        <span className="source-preview-location">
          Lines {symbol.span.start_line}:{symbol.span.start_col} - {symbol.span.end_line}:{symbol.span.end_col}
        </span>
      </div>
      {isTauri && (
        <div className="source-preview-actions">
          <button
            className="button secondary"
            onClick={handleOpenInEditor}
            title="Open file in default editor"
          >
            Open in Editor
          </button>
        </div>
      )}
      <div className="source-preview-code">
        <pre className={`language-${language}`}>
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode.code }}
          />
        </pre>
      </div>
    </div>
  );
};

export default SourcePreview;

