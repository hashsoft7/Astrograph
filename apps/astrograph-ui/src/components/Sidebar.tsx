import { useMemo, useState } from "react";
import { useAnalysisStore, type SidebarTab } from "../state/store";
import { SymbolKind } from "../types";
import FileTree from "./FileTree";

const kindIcons: Record<SymbolKind, string> = {
  class: "C",
  struct: "S",
  enum: "E",
  interface: "I",
  trait: "T",
  module: "M",
  namespace: "N",
  function: "ƒ",
  method: "m",
};

const Sidebar = () => {
  const analysis = useAnalysisStore((state) => state.analysis);
  const search = useAnalysisStore((state) => state.search);
  const setSearch = useAnalysisStore((state) => state.setSearch);
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);
  const selectedFile = useAnalysisStore((state) => state.selectedFile);
  const selectSymbol = useAnalysisStore((state) => state.selectSymbol);
  const setSelectedFile = useAnalysisStore((state) => state.setSelectedFile);
  const activeTab = useAnalysisStore((state) => state.activeSidebarTab);
  const setActiveTab = useAnalysisStore((state) => state.setActiveSidebarTab);

  const [kindFilter, setKindFilter] = useState<SymbolKind | "all">("all");

  const symbols = useMemo(() => {
    if (!analysis) {
      return [];
    }
    const term = search.trim().toLowerCase();
    return analysis.symbols
      .filter((symbol) => {
        // Filter by search term
        if (term) {
          const matchesSearch =
            symbol.name.toLowerCase().includes(term) ||
            symbol.fq_name.toLowerCase().includes(term);
          if (!matchesSearch) return false;
        }
        // Filter by kind
        if (kindFilter !== "all" && symbol.kind !== kindFilter) {
          return false;
        }
        // Filter by selected file
        if (selectedFile && symbol.file !== selectedFile) {
          return false;
        }
        return true;
      })
      .slice(0, 500);
  }, [analysis, search, kindFilter, selectedFile]);

  const entrypoints = useMemo(() => {
    if (!analysis) {
      return [];
    }
    return analysis.symbols.filter((symbol) => symbol.is_entrypoint);
  }, [analysis]);

  const uniqueKinds = useMemo(() => {
    if (!analysis) return [];
    const kinds = new Set(analysis.symbols.map((s) => s.kind));
    return Array.from(kinds).sort();
  }, [analysis]);

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "symbols", label: "Symbols", count: analysis?.stats.symbol_count },
    { id: "files", label: "Files", count: analysis?.stats.file_count },
    {
      id: "entrypoints",
      label: "Entrypoints",
      count: analysis?.stats.entrypoint_count,
    },
  ];

  return (
    <div className="sidebar">
      {/* Tab navigation */}
      <div className="sidebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search and filters for symbols tab */}
      {activeTab === "symbols" && (
        <div className="panel">
          <input
            id="search"
            className="input"
            placeholder="Search symbols by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="filter-row">
            <select
              className="filter-select"
              value={kindFilter}
              onChange={(e) =>
                setKindFilter(e.target.value as SymbolKind | "all")
              }
            >
              <option value="all">All kinds</option>
              {uniqueKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
            {selectedFile && (
              <button
                className="clear-filter"
                onClick={() => setSelectedFile(null)}
                title="Clear file filter"
              >
                × {selectedFile.split("/").pop()}
              </button>
            )}
          </div>
          <div className="stats">
            <span>Showing {symbols.length} symbols</span>
            <span>Calls: {analysis?.stats.call_count ?? 0}</span>
          </div>
        </div>
      )}

      {/* Symbol list */}
      {activeTab === "symbols" && (
        <div className="symbol-list">
          {symbols.map((symbol) => (
            <button
              key={symbol.id}
              className={`symbol-row ${
                symbol.id === selectedSymbolId ? "selected" : ""
              }`}
              onClick={() => selectSymbol(symbol.id)}
            >
              <span className="symbol-icon" data-kind={symbol.kind}>
                {kindIcons[symbol.kind]}
              </span>
              <div className="symbol-info">
                <span className="symbol-name">
                  {symbol.name}
                  {symbol.is_entrypoint && (
                    <span className="entry-badge" title="Entrypoint">
                      ★
                    </span>
                  )}
                </span>
                <span className="symbol-path">{symbol.file}</span>
              </div>
            </button>
          ))}
          {!analysis && (
            <div className="empty-state">
              Load an analysis to browse symbols.
            </div>
          )}
          {analysis && symbols.length === 0 && (
            <div className="empty-state">No symbols match the filter.</div>
          )}
        </div>
      )}

      {/* File tree */}
      {activeTab === "files" && <FileTree />}

      {/* Entrypoints list */}
      {activeTab === "entrypoints" && (
        <div className="symbol-list">
          {entrypoints.map((symbol) => (
            <button
              key={symbol.id}
              className={`symbol-row ${
                symbol.id === selectedSymbolId ? "selected" : ""
              }`}
              onClick={() => selectSymbol(symbol.id)}
            >
              <span className="symbol-icon entrypoint">★</span>
              <div className="symbol-info">
                <span className="symbol-name">{symbol.name}</span>
                <span className="symbol-fq">{symbol.fq_name}</span>
                <span className="symbol-path">{symbol.file}</span>
              </div>
            </button>
          ))}
          {!analysis && (
            <div className="empty-state">Load an analysis to see entrypoints.</div>
          )}
          {analysis && entrypoints.length === 0 && (
            <div className="empty-state">No entrypoints found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
