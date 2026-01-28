import { ChangeEvent, useState } from "react";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import BookmarksPanel from "./components/BookmarksPanel";
import { useAnalysisStore } from "./state/store";
import { AnalysisResult } from "./types";

const App = () => {
  const loadAnalysis = useAnalysisStore((state) => state.loadAnalysis);
  const analysis = useAnalysisStore((state) => state.analysis);
  const [error, setError] = useState<string | null>(null);

  const handleFileLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as AnalysisResult;
      loadAnalysis(parsed);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to parse analysis JSON.");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">Astrograph</div>
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
            </div>
          )}
        </div>
      </header>
      {error && <div className="error-banner">{error}</div>}
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
