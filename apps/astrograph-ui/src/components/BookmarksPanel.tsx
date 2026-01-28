import { useMemo, useState } from "react";
import { useAnalysisStore } from "../state/store";

const BookmarksPanel = () => {
  const analysis = useAnalysisStore((state) => state.analysis);
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);
  const bookmarks = useAnalysisStore((state) => state.bookmarks);
  const toggleBookmark = useAnalysisStore((state) => state.toggleBookmark);
  const setBookmarkLabel = useAnalysisStore((state) => state.setBookmarkLabel);
  const selectSymbol = useAnalysisStore((state) => state.selectSymbol);

  const selectedSymbol = useMemo(() => {
    if (!analysis || !selectedSymbolId) {
      return null;
    }
    return analysis.symbols.find((symbol) => symbol.id === selectedSymbolId) ?? null;
  }, [analysis, selectedSymbolId]);

  const [labelDraft, setLabelDraft] = useState("");

  const bookmarkEntries = Object.values(bookmarks).sort((a, b) =>
    (a.label || a.id).localeCompare(b.label || b.id)
  );

  const isBookmarked = selectedSymbolId ? Boolean(bookmarks[selectedSymbolId]) : false;

  return (
    <div className="panel bookmarks-panel">
      <h3>Selection</h3>
      {selectedSymbol ? (
        <div className="selection-details">
          <div className="selection-title">{selectedSymbol.fq_name}</div>
          <div className="selection-meta">
            <span>{selectedSymbol.kind}</span>
            <span>{selectedSymbol.file}</span>
            <span>
              L{selectedSymbol.span.start_line}:{selectedSymbol.span.start_col}
            </span>
          </div>
          <div className="selection-actions">
            <button
              className="button"
              onClick={() => toggleBookmark(selectedSymbol.id)}
            >
              {isBookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
            {isBookmarked && (
              <div className="label-editor">
                <input
                  className="input"
                  placeholder="Add label"
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
          </div>
        </div>
      ) : (
        <div className="empty-state">Select a symbol to inspect details.</div>
      )}

      <h3>Bookmarks</h3>
      <div className="bookmark-list">
        {bookmarkEntries.length === 0 && (
          <div className="empty-state">No bookmarks yet.</div>
        )}
        {bookmarkEntries.map((bookmark) => {
          const label = bookmark.label || bookmark.id.slice(0, 8);
          return (
            <button
              key={bookmark.id}
              className="bookmark-row"
              onClick={() => selectSymbol(bookmark.id)}
            >
              <span>{label}</span>
              <span className="bookmark-id">{bookmark.id.slice(0, 6)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookmarksPanel;
