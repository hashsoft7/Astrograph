import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAnalysisStore } from "../state/store";
import { Symbol } from "../types";

// Check if Tauri is available (same method as App.tsx)
const isTauri = Boolean(import.meta.env.TAURI_PLATFORM);

// Lazy load SourcePreview only when Tauri is available
const SourcePreview = isTauri
  ? lazy(() => import("./SourcePreview"))
  : null;

const BookmarksPanel = () => {
  const analysis = useAnalysisStore((state) => state.analysis);
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);
  const bookmarks = useAnalysisStore((state) => state.bookmarks);
  const toggleBookmark = useAnalysisStore((state) => state.toggleBookmark);
  const setBookmarkLabel = useAnalysisStore((state) => state.setBookmarkLabel);
  const selectSymbol = useAnalysisStore((state) => state.selectSymbol);
  const setGraphViewMode = useAnalysisStore((state) => state.setGraphViewMode);

  const selectedSymbol = useMemo(() => {
    if (!analysis || !selectedSymbolId) {
      return null;
    }
    return (
      analysis.symbols.find((symbol) => symbol.id === selectedSymbolId) ?? null
    );
  }, [analysis, selectedSymbolId]);

  // Get callers and callees of selected symbol
  const { callers, callees } = useMemo(() => {
    if (!analysis || !selectedSymbolId) {
      return { callers: [], callees: [] };
    }

    const symbolMap = new Map<string, Symbol>();
    analysis.symbols.forEach((s) => symbolMap.set(s.id, s));

    const callerIds = new Set<string>();
    const calleeIds = new Set<string>();

    analysis.calls.forEach((call) => {
      if (call.callee_id === selectedSymbolId) {
        callerIds.add(call.caller_id);
      }
      if (call.caller_id === selectedSymbolId && call.callee_id) {
        calleeIds.add(call.callee_id);
      }
    });

    return {
      callers: Array.from(callerIds)
        .map((id) => symbolMap.get(id))
        .filter((s): s is Symbol => !!s),
      callees: Array.from(calleeIds)
        .map((id) => symbolMap.get(id))
        .filter((s): s is Symbol => !!s),
    };
  }, [analysis, selectedSymbolId]);

  const [labelDraft, setLabelDraft] = useState("");

  useEffect(() => {
    setLabelDraft("");
  }, [selectedSymbolId]);

  // Create bookmark entries with symbol information
  const bookmarkEntries = useMemo(() => {
    if (!analysis) {
      return Object.values(bookmarks)
        .map((b) => ({ ...b, symbol: null as Symbol | null }))
        .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
    }

    const symbolMap = new Map<string, Symbol>();
    analysis.symbols.forEach((s) => symbolMap.set(s.id, s));

    return Object.values(bookmarks)
      .map((b) => ({
        ...b,
        symbol: symbolMap.get(b.id) ?? null,
      }))
      // Hide orphaned bookmarks (those with no corresponding symbol in the
      // current analysis) so they don't clutter the UI.
      .filter((entry) => entry.symbol !== null)
      .sort((a, b) => {
        const nameA = a.label || a.symbol?.name || a.id;
        const nameB = b.label || b.symbol?.name || b.id;
        return nameA.localeCompare(nameB);
      });
  }, [analysis, bookmarks]);

  const isBookmarked = selectedSymbolId
    ? Boolean(bookmarks[selectedSymbolId])
    : false;

  return (
    <div className="panel bookmarks-panel">
      <h3>Selection</h3>
      {selectedSymbol ? (
        <div className="selection-details">
          <div className="selection-title">{selectedSymbol.name}</div>
          <div className="selection-fq">{selectedSymbol.fq_name}</div>
          <div className="selection-meta">
            <span className="meta-badge">{selectedSymbol.kind}</span>
            {selectedSymbol.is_entrypoint && (
              <span className="meta-badge entrypoint">entrypoint</span>
            )}
            {selectedSymbol.is_exported && (
              <span className="meta-badge exported">exported</span>
            )}
          </div>
          <div className="selection-location">
            <span>{selectedSymbol.file}</span>
            <span>
              Line {selectedSymbol.span.start_line}:
              {selectedSymbol.span.start_col}
            </span>
          </div>

          <div className="selection-actions">
            <button
              className="button"
              onClick={() => toggleBookmark(selectedSymbol.id)}
            >
              {isBookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                selectSymbol(selectedSymbol.id);
                setGraphViewMode("symbol-centric");
              }}
            >
              Focus in graph
            </button>
          </div>

          {isBookmarked && (
            <div className="label-editor">
              <input
                className="input"
                placeholder="Add label (e.g., hot path, needs refactor)"
                value={labelDraft}
                onChange={(event) => setLabelDraft(event.target.value)}
              />
              <button
                className="button secondary"
                onClick={() => {
                  setBookmarkLabel(selectedSymbol.id, labelDraft.trim());
                  setLabelDraft("");
                }}
              >
                Save label
              </button>
            </div>
          )}

          {/* Callers section */}
          {callers.length > 0 && (
            <div className="related-symbols">
              <h4>Called by ({callers.length})</h4>
              <div className="related-list">
                {callers.slice(0, 10).map((caller) => (
                  <button
                    key={caller.id}
                    className="related-item"
                    onClick={() => selectSymbol(caller.id)}
                  >
                    <span className="related-name">{caller.name}</span>
                    <span className="related-file">{caller.file}</span>
                  </button>
                ))}
                {callers.length > 10 && (
                  <span className="more-items">
                    +{callers.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Callees section */}
          {callees.length > 0 && (
            <div className="related-symbols">
              <h4>Calls ({callees.length})</h4>
              <div className="related-list">
                {callees.slice(0, 10).map((callee) => (
                  <button
                    key={callee.id}
                    className="related-item"
                    onClick={() => selectSymbol(callee.id)}
                  >
                    <span className="related-name">{callee.name}</span>
                    <span className="related-file">{callee.file}</span>
                  </button>
                ))}
                {callees.length > 10 && (
                  <span className="more-items">
                    +{callees.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Source Preview */}
          {SourcePreview && selectedSymbol && (
            <Suspense fallback={null}>
              <SourcePreview
                symbol={selectedSymbol}
                rootPath={analysis?.root ?? null}
              />
            </Suspense>
          )}
        </div>
      ) : (
        <div className="empty-state">Select a symbol to inspect details.</div>
      )}

      <h3>Bookmarks</h3>
      <div className="bookmark-list">
        {bookmarkEntries.length === 0 && (
          <div className="empty-state">No bookmarks yet.</div>
        )}
        {bookmarkEntries.map((entry) => {
          const displayName =
            entry.label || entry.symbol?.name || entry.id.slice(0, 8);
          const isSelected = entry.id === selectedSymbolId;
          return (
            <button
              key={entry.id}
              className={`bookmark-row ${isSelected ? "selected" : ""}`}
              onClick={() => selectSymbol(entry.id)}
            >
              <div className="bookmark-info">
                <span className="bookmark-name">{displayName}</span>
                {entry.symbol && (
                  <span className="bookmark-kind">{entry.symbol.kind}</span>
                )}
              </div>
              {entry.label && entry.symbol && (
                <span className="bookmark-symbol-name">
                  {entry.symbol.name}
                </span>
              )}
              <button
                className="bookmark-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(entry.id);
                }}
                title="Remove bookmark"
              >
                ×
              </button>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookmarksPanel;
