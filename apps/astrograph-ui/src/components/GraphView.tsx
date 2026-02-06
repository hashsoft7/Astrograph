import { useCallback, useEffect, useMemo, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { useAnalysisStore } from "../state/store";
import { Symbol, CallEdge } from "../types";
import GraphControls from "./GraphControls";

const GraphView = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const analysis = useAnalysisStore((state) => state.analysis);
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);
  const selectedFile = useAnalysisStore((state) => state.selectedFile);
  const search = useAnalysisStore((state) => state.search);
  const bookmarks = useAnalysisStore((state) => state.bookmarks);
  const selectSymbol = useAnalysisStore((state) => state.selectSymbol);
  const graphViewMode = useAnalysisStore((state) => state.graphViewMode);
  const layoutType = useAnalysisStore((state) => state.layoutType);
  const showEntrypointsOnly = useAnalysisStore(
    (state) => state.showEntrypointsOnly
  );
  const highlightedPath = useAnalysisStore((state) => state.highlightedPath);
  const setHighlightedPath = useAnalysisStore(
    (state) => state.setHighlightedPath
  );

  // Get symbols to display based on view mode
  const getVisibleSymbols = useCallback(
    (symbols: Symbol[], calls: CallEdge[]): Set<string> => {
      const visible = new Set<string>();

      if (graphViewMode === "entrypoints" || showEntrypointsOnly) {
        // Show only entrypoints and their direct callees
        const entrypoints = symbols.filter((s) => s.is_entrypoint);
        entrypoints.forEach((s) => visible.add(s.id));

        calls.forEach((call) => {
          if (
            call.callee_id &&
            entrypoints.some((e) => e.id === call.caller_id)
          ) {
            visible.add(call.callee_id);
          }
        });
      } else if (graphViewMode === "symbol-centric" && selectedSymbolId) {
        // Show selected symbol and its callers/callees
        visible.add(selectedSymbolId);

        calls.forEach((call) => {
          if (call.caller_id === selectedSymbolId && call.callee_id) {
            visible.add(call.callee_id);
          }
          if (call.callee_id === selectedSymbolId) {
            visible.add(call.caller_id);
          }
        });
      } else {
        // Show all symbols (optionally filtered by file)
        symbols.forEach((s) => {
          if (!selectedFile || s.file === selectedFile) {
            visible.add(s.id);
          }
        });
      }

      return visible;
    },
    [graphViewMode, selectedSymbolId, selectedFile, showEntrypointsOnly]
  );

  const elements = useMemo((): ElementDefinition[] => {
    if (!analysis) {
      return [];
    }

    const searchTerm = search.trim().toLowerCase();
    const visibleSymbols = getVisibleSymbols(analysis.symbols, analysis.calls);
    const highlightedSet = new Set(highlightedPath);

    const nodes: ElementDefinition[] = analysis.symbols
      .filter((symbol) => visibleSymbols.has(symbol.id))
      .map((symbol: Symbol) => {
        const classes: string[] = [];
        if (symbol.is_entrypoint) {
          classes.push("entrypoint");
        }
        if (bookmarks[symbol.id]) {
          classes.push("bookmarked");
        }
        if (selectedSymbolId === symbol.id) {
          classes.push("selected");
        }
        if (highlightedSet.has(symbol.id)) {
          classes.push("highlighted");
        }
        if (
          searchTerm &&
          (symbol.name.toLowerCase().includes(searchTerm) ||
            symbol.fq_name.toLowerCase().includes(searchTerm))
        ) {
          classes.push("search-match");
        }
        return {
          data: {
            id: symbol.id,
            label: symbol.name,
            kind: symbol.kind,
            fq: symbol.fq_name,
            file: symbol.file,
          },
          classes: classes.join(" "),
        };
      });

    const edges: ElementDefinition[] = analysis.calls
      .filter(
        (call) =>
          call.callee_id &&
          visibleSymbols.has(call.caller_id) &&
          visibleSymbols.has(call.callee_id)
      )
      .map((call) => {
        const classes: string[] = [];
        if (
          highlightedSet.has(call.caller_id) &&
          highlightedSet.has(call.callee_id!)
        ) {
          classes.push("highlighted");
        }
        return {
          data: {
            id: call.id,
            source: call.caller_id,
            target: call.callee_id!,
            label: call.callee_name,
          },
          classes: classes.join(" "),
        };
      });

    return [...nodes, ...edges];
  }, [
    analysis,
    bookmarks,
    search,
    selectedSymbolId,
    highlightedPath,
    getVisibleSymbols,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphStyles = useMemo<any[]>(
    () => [
      {
        selector: "node",
        style: {
          "background-color": "#4f46e5",
          label: "data(label)",
          color: "#e2e8f0",
          "font-size": "9px",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 70,
          width: 30,
          height: 30,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.2,
          "curve-style": "bezier",
          "line-color": "#475569",
          "target-arrow-color": "#475569",
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.8,
        },
      },
      {
        selector: "node.entrypoint",
        style: {
          "background-color": "#f59e0b",
          width: 35,
          height: 35,
        },
      },
      {
        selector: "node.bookmarked",
        style: {
          "border-width": 3,
          "border-color": "#22c55e",
        },
      },
      {
        selector: "node.selected",
        style: {
          "background-color": "#ef4444",
          width: 40,
          height: 40,
        },
      },
      {
        selector: "node.highlighted",
        style: {
          "background-color": "#8b5cf6",
          "border-width": 3,
          "border-color": "#c4b5fd",
        },
      },
      {
        selector: "edge.highlighted",
        style: {
          width: 3,
          "line-color": "#8b5cf6",
          "target-arrow-color": "#8b5cf6",
        },
      },
      {
        selector: "node.search-match",
        style: {
          "border-width": 3,
          "border-color": "#38bdf8",
        },
      },
      {
        selector: "node[kind='class'], node[kind='struct']",
        style: {
          shape: "round-rectangle",
        },
      },
      {
        selector: "node[kind='interface'], node[kind='trait']",
        style: {
          shape: "diamond",
        },
      },
      {
        selector: "node[kind='module'], node[kind='namespace']",
        style: {
          shape: "hexagon",
        },
      },
    ],
    []
  );

  // Find call path between two nodes
  const findCallPath = useCallback(
    (fromId: string, toId: string): string[] => {
      if (!analysis) return [];

      const adjacency = new Map<string, string[]>();
      analysis.calls.forEach((call) => {
        if (call.callee_id) {
          const list = adjacency.get(call.caller_id) || [];
          list.push(call.callee_id);
          adjacency.set(call.caller_id, list);
        }
      });

      // BFS to find path
      const queue: string[][] = [[fromId]];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const path = queue.shift()!;
        const current = path[path.length - 1];

        if (current === toId) {
          return path;
        }

        if (visited.has(current)) continue;
        visited.add(current);

        const neighbors = adjacency.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push([...path, neighbor]);
          }
        }
      }

      return [];
    },
    [analysis]
  );

  // Graph control handlers
  const handleZoomIn = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() / 1.2);
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 50);
  }, []);

  const handleCenter = useCallback(() => {
    if (selectedSymbolId && cyRef.current) {
      const node = cyRef.current.$id(selectedSymbolId);
      if (node.length > 0) {
        cyRef.current.center(node);
      }
    }
  }, [selectedSymbolId]);

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    if (!analysis) {
      containerRef.current.innerHTML = "";
      return;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: layoutType,
        animate: false,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
      } as cytoscape.LayoutOptions,
      style: graphStyles,
      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 5,
    });

    cyRef.current = cy;

    // Node tap: select symbol; double-tap on another node finds path
    let lastTapTime = 0;
    let lastTapNode: string | null = null;

    cy.on("tap", "node", (event) => {
      const now = Date.now();
      const nodeId = event.target.id();
      selectSymbol(nodeId);

      if (now - lastTapTime < 300 && lastTapNode && lastTapNode !== nodeId) {
        const path = findCallPath(lastTapNode, nodeId);
        if (path.length > 0) {
          setHighlightedPath(path);
        } else {
          const reversePath = findCallPath(nodeId, lastTapNode);
          setHighlightedPath(reversePath);
        }
      }

      lastTapTime = now;
      lastTapNode = nodeId;
    });

    // Clear highlighted path on background click
    cy.on("tap", (event) => {
      if (event.target === cy) {
        setHighlightedPath([]);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [
    analysis,
    elements,
    graphStyles,
    layoutType,
    selectSymbol,
    findCallPath,
    setHighlightedPath,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          handleFit();
        }
      }

      if (e.key === "Escape") {
        selectSymbol(null);
        setHighlightedPath([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleFit, selectSymbol, setHighlightedPath]);

  if (!analysis) {
    return (
      <div className="graph-placeholder">Load analysis to see the graph.</div>
    );
  }

  return (
    <div className="graph-container">
      <GraphControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        onCenter={handleCenter}
      />
      <div className="graph-canvas" ref={containerRef} />
      {highlightedPath.length > 0 && (
        <div className="path-info">
          Path: {highlightedPath.length} nodes
          <button
            className="clear-path-btn"
            onClick={() => setHighlightedPath([])}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphView;
