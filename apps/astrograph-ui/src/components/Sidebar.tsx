import { useMemo } from "react";
import { useAnalysisStore } from "../state/store";

const Sidebar = () => {
  const analysis = useAnalysisStore((state) => state.analysis);
  const search = useAnalysisStore((state) => state.search);
  const setSearch = useAnalysisStore((state) => state.setSearch);
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);
  const selectSymbol = useAnalysisStore((state) => state.selectSymbol);

  const symbols = useMemo(() => {
    if (!analysis) {
      return [];
    }
    const term = search.trim().toLowerCase();
    return analysis.symbols
      .filter((symbol) => {
        if (!term) {
          return true;
        }
        return (
          symbol.name.toLowerCase().includes(term) ||
          symbol.fq_name.toLowerCase().includes(term)
        );
      })
      .slice(0, 500);
  }, [analysis, search]);

  return (
    <div className="sidebar">
      <div className="panel">
        <label className="panel-label" htmlFor="search">
          Symbol search
        </label>
        <input
          id="search"
          className="input"
          placeholder="Search symbols"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="stats">
          <span>Symbols: {analysis?.stats.symbol_count ?? 0}</span>
          <span>Calls: {analysis?.stats.call_count ?? 0}</span>
        </div>
      </div>
      <div className="symbol-list">
        {symbols.map((symbol) => (
          <button
            key={symbol.id}
            className={
              symbol.id === selectedSymbolId
                ? "symbol-row selected"
                : "symbol-row"
            }
            onClick={() => selectSymbol(symbol.id)}
          >
            <span className="symbol-name">{symbol.name}</span>
            <span className="symbol-kind">{symbol.kind}</span>
            <span className="symbol-path">{symbol.file}</span>
          </button>
        ))}
        {!analysis && (
          <div className="empty-state">Load an analysis to browse symbols.</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
