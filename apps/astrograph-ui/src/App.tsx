import { ChangeEvent, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import BookmarksPanel from "./components/BookmarksPanel";
import { useAnalysisStore } from "./state/store";
import { AnalysisResult } from "./types";

const isTauri = Boolean(import.meta.env.TAURI_PLATFORM);

const App = () => {
  const loadAnalysis = useAnalysisStore((state) => state.loadAnalysis);
  const analysis = useAnalysisStore((state) => state.analysis);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await loadFile(file);
  };

  const loadFile = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as AnalysisResult;
      loadAnalysis(parsed);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to parse analysis JSON. Make sure it's a valid Astrograph output file.");
    }
  };

  const handleAnalyzeProject = async () => {
    try {
      setError(null);
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected == null) {
        return;
      }
      setIsAnalyzing(true);
      const path = typeof selected === "string" ? selected : String(selected);
      const result = await invoke<AnalysisResult>("analyze_project_dir", { path });
      loadAnalysis(result);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Drag and drop support
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer?.files[0];
      const isJson =
        file &&
        (file.type === "application/json" ||
          file.name.toLowerCase().endsWith(".json"));
      if (isJson) {
        await loadFile(file);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div className={`app ${isDragging ? "dragging" : ""}`}>
      <header className="app-header">
        <div className="logo">✦ Astrograph</div>
        <div className="header-actions">
          {isTauri && (
            <button
              type="button"
              className="file-button"
              onClick={handleAnalyzeProject}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analyzing…" : "Analyze project"}
            </button>
          )}
          <label className="file-button">
            Load analysis
            <input
              type="file"
              accept="application/json"
              onChange={handleFileLoad}
            />
          </label>
          {analysis && (
            <div className="header-meta">
              <span>{analysis.stats.file_count} files</span>
              <span>{analysis.stats.symbol_count} symbols</span>
              <span>{analysis.stats.call_count} calls</span>
            </div>
          )}
        </div>
      </header>
      {error && <div className="error-banner">{error}</div>}
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-message">Drop analysis.json here</div>
        </div>
      )}
      <div className="app-body">
        <Sidebar />
        <main className="graph-panel">
          <GraphView />
        </main>
        <BookmarksPanel />
      </div>
    </div>
  );
};

export default App;
