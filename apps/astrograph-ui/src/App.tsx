import { ChangeEvent, useEffect, useState } from "react";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import BookmarksPanel from "./components/BookmarksPanel";
import { useAnalysisStore } from "./state/store";
import { AnalysisResult } from "./types";

const App = () => {
  const loadAnalysis = useAnalysisStore((state) => state.loadAnalysis);
  const analysis = useAnalysisStore((state) => state.analysis);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
