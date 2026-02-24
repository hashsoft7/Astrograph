import { useAnalysisStore, GraphViewMode, LayoutType } from "../state/store";

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
}

const GraphControls = ({
  onZoomIn,
  onZoomOut,
  onFit,
  onCenter,
  onExportPNG,
  onExportSVG,
  onExportJSON,
}: GraphControlsProps) => {
  const graphViewMode = useAnalysisStore((state) => state.graphViewMode);
  const setGraphViewMode = useAnalysisStore((state) => state.setGraphViewMode);
  const layoutType = useAnalysisStore((state) => state.layoutType);
  const setLayoutType = useAnalysisStore((state) => state.setLayoutType);
  const showEntrypointsOnly = useAnalysisStore(
    (state) => state.showEntrypointsOnly
  );
  const setShowEntrypointsOnly = useAnalysisStore(
    (state) => state.setShowEntrypointsOnly
  );
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);

  const viewModes: { value: GraphViewMode; label: string }[] = [
    { value: "all", label: "All Symbols" },
    { value: "entrypoints", label: "Entrypoints Only" },
    { value: "symbol-centric", label: "Symbol Centric" },
  ];

  const layouts: { value: LayoutType; label: string }[] = [
    { value: "cose", label: "Force-directed" },
    { value: "breadthfirst", label: "Hierarchical" },
    { value: "circle", label: "Circle" },
    { value: "grid", label: "Grid" },
    { value: "concentric", label: "Concentric" },
  ];

  return (
    <div className="graph-controls">
      <div className="graph-controls-row">
        <div className="control-group">
          <button
            className="control-btn"
            onClick={onZoomIn}
            title="Zoom In (Ctrl++)"
          >
            +
          </button>
          <button
            className="control-btn"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl+-)"
          >
            −
          </button>
          <button
            className="control-btn"
            onClick={onFit}
            title="Fit to View (Ctrl+0)"
          >
            ⊡
          </button>
          <button
            className="control-btn"
            onClick={onCenter}
            title="Center Selected"
          >
            ◎
          </button>
        </div>

        <div className="control-group">
          <button
            className="control-btn"
            onClick={onExportPNG}
            title="Export as PNG"
          >
            PNG
          </button>
          <button
            className="control-btn"
            onClick={onExportSVG}
            title="Export as SVG"
          >
            SVG
          </button>
          <button
            className="control-btn"
            onClick={onExportJSON}
            title="Export as JSON"
          >
            JSON
          </button>
        </div>

        <div className="control-group">
          <label className="control-label">View:</label>
          <select
            className="control-select"
            value={graphViewMode}
            onChange={(e) =>
              setGraphViewMode(e.target.value as GraphViewMode)
            }
          >
            {viewModes.map((mode) => (
              <option
                key={mode.value}
                value={mode.value}
                disabled={
                  mode.value === "symbol-centric" && !selectedSymbolId
                }
              >
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Layout:</label>
          <select
            className="control-select"
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value as LayoutType)}
          >
            {layouts.map((layout) => (
              <option key={layout.value} value={layout.value}>
                {layout.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label className="control-checkbox">
            <input
              type="checkbox"
              checked={showEntrypointsOnly}
              onChange={(e) => setShowEntrypointsOnly(e.target.checked)}
            />
            <span>Entrypoints only</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default GraphControls;
