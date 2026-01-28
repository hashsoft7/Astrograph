import { useMemo, useState } from "react";
import { useAnalysisStore } from "../state/store";
import { FileInfo } from "../types";

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
  file?: FileInfo;
}

const buildTree = (files: FileInfo[]): TreeNode => {
  const root: TreeNode = {
    name: "",
    path: "",
    isFile: false,
    children: new Map(),
  };

  for (const file of files) {
    const parts = file.path.split(/[/\\]/);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const pathSoFar = parts.slice(0, i + 1).join("/");

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: pathSoFar,
          isFile: isLast,
          children: new Map(),
          file: isLast ? file : undefined,
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
};

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
}

const TreeNodeView = ({
  node,
  depth,
  selectedFile,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
}: TreeNodeViewProps) => {
  const children = Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  if (node.isFile) {
    const isSelected = selectedFile === node.path;
    return (
      <button
        className={`file-tree-item file ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => onSelectFile(node.path)}
        title={node.path}
      >
        <span className="file-icon">📄</span>
        <span className="file-name">{node.name}</span>
        {node.file && (
          <span className="file-lang">{node.file.language}</span>
        )}
      </button>
    );
  }

  const isExpanded = expandedPaths.has(node.path);

  return (
    <div className="file-tree-folder">
      {node.name && (
        <button
          className="file-tree-item folder"
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => onToggleExpand(node.path)}
        >
          <span className="folder-icon">{isExpanded ? "📂" : "📁"}</span>
          <span className="folder-name">{node.name}</span>
        </button>
      )}
      {(isExpanded || !node.name) && (
        <div className="file-tree-children">
          {children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={child}
              depth={node.name ? depth + 1 : depth}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = () => {
  const analysis = useAnalysisStore((state) => state.analysis);
  const setSelectedFile = useAnalysisStore((state) => state.setSelectedFile);
  const selectedFile = useAnalysisStore((state) => state.selectedFile);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set([""])
  );

  const tree = useMemo(() => {
    if (!analysis) {
      return null;
    }
    return buildTree(analysis.files);
  }, [analysis]);

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (!tree) {
    return <div className="empty-state">Load analysis to see files.</div>;
  }

  return (
    <div className="file-tree">
      <TreeNodeView
        node={tree}
        depth={0}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
        expandedPaths={expandedPaths}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
};

export default FileTree;
