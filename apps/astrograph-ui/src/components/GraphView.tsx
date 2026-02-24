import { useCallback, useEffect, useMemo, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { useAnalysisStore } from "../state/store";
import { Symbol, CallEdge } from "../types";
import type { Theme } from "./ThemeToggle";
import GraphControls from "./GraphControls";

const GRAPH_COLORS: Record<
  Theme,
  {
    nodeBg: string;
    nodeLabel: string;
    edge: string;
    entrypoint: string;
    bookmarked: string;
    selected: string;
    highlighted: string;
    searchMatch: string;
  }
> = {
  dark: {
    nodeBg: "#4f46e5",
    nodeLabel: "#e2e8f0",
    edge: "#475569",
    entrypoint: "#f59e0b",
    bookmarked: "#22c55e",
    selected: "#ef4444",
    highlighted: "#8b5cf6",
    searchMatch: "#38bdf8",
  },
  light: {
    nodeBg: "#4f46e5",
    nodeLabel: "#1f2937",
    edge: "#6b7280",
    entrypoint: "#d97706",
    bookmarked: "#059669",
    selected: "#dc2626",
    highlighted: "#7c3aed",
    searchMatch: "#0284c7",
  },
};

type GraphViewProps = { theme: Theme };

const GraphView = ({ theme }: GraphViewProps) => {
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

  const colors = GRAPH_COLORS[theme];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphStyles = useMemo<any[]>(
    () => [
      {
        selector: "node",
        style: {
          "background-color": colors.nodeBg,
          label: "data(label)",
          color: colors.nodeLabel,
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
          "line-color": colors.edge,
          "target-arrow-color": colors.edge,
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.8,
        },
      },
      {
        selector: "node.entrypoint",
        style: {
          "background-color": colors.entrypoint,
          width: 35,
          height: 35,
        },
      },
      {
        selector: "node.bookmarked",
        style: {
          "border-width": 3,
          "border-color": colors.bookmarked,
        },
      },
      {
        selector: "node.selected",
        style: {
          "background-color": colors.selected,
          width: 40,
          height: 40,
        },
      },
      {
        selector: "node.highlighted",
        style: {
          "background-color": colors.highlighted,
          "border-width": 3,
          "border-color": colors.highlighted,
        },
      },
      {
        selector: "edge.highlighted",
        style: {
          width: 3,
          "line-color": colors.highlighted,
          "target-arrow-color": colors.highlighted,
        },
      },
      {
        selector: "node.search-match",
        style: {
          "border-width": 3,
          "border-color": colors.searchMatch,
        },
      },
      {
        selector: "node.search-highlight",
        style: {
          "border-width": 4,
          "border-color": colors.searchMatch,
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
    [theme]
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

  const exportBg = theme === "dark" ? "#0f172a" : "#f8fafc";

  const handleExportPNG = useCallback(async () => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const dataUri = (cy as unknown as { png: (opts?: { full?: boolean; bg?: string }) => string }).png({
      full: true,
      bg: exportBg,
    });
    const { downloadExportFile } = await import("../utils/exportGraph");
    await downloadExportFile(
      "graph.png",
      "image/png",
      () => Promise.resolve(dataUri)
    );
  }, [exportBg]);

  const handleExportSVG = useCallback(async () => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const ext = cy.extent();
    const padding = 40;
    const width = ext.w + padding * 2;
    const height = ext.h + padding * 2;
    const px = (x: number) => x - ext.x1 + padding;
    const py = (y: number) => y - ext.y1 + padding;
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="${exportBg}"/>`;
    cy.edges().forEach((e) => {
      const sp = e.source().renderedPosition();
      const tp = e.target().renderedPosition();
      const sx = sp.x + (e.source().width() ?? 0) / 2;
      const sy = sp.y + (e.source().height() ?? 0) / 2;
      const tx = tp.x + (e.target().width() ?? 0) / 2;
      const ty = tp.y + (e.target().height() ?? 0) / 2;
      svg += `\n  <line x1="${px(sx)}" y1="${py(sy)}" x2="${px(tx)}" y2="${py(ty)}" stroke="#475569" stroke-width="1.2" fill="none"/>`;
    });
    cy.nodes().forEach((n) => {
      const pos = n.renderedPosition();
      const w = n.width() ?? 30;
      const h = n.height() ?? 30;
      const x = px(pos.x - w / 2);
      const y = py(pos.y - h / 2);
      const label = String(n.data("label") ?? n.id()).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const isEntry = n.hasClass("entrypoint");
      const fill = isEntry ? "#f59e0b" : "#4f46e5";
      svg += `\n  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}"/>`;
      svg += `\n  <text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#e2e8f0">${label}</text>`;
    });
    svg += "\n</svg>";
    const { downloadExportFile } = await import("../utils/exportGraph");
    await downloadExportFile(
      "graph.svg",
      "image/svg+xml",
      () => Promise.resolve(svg)
    );
  }, [exportBg]);

  const handleExportJSON = useCallback(async () => {
    if (!analysis) return;
    const json = JSON.stringify(analysis, null, 2);
    const { downloadExportFile } = await import("../utils/exportGraph");
    await downloadExportFile(
      "analysis.json",
      "application/json",
      () => Promise.resolve(json)
    );
  }, [analysis]);

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

    // When a symbol is selected (e.g. from search/sidebar), center graph on it and highlight briefly
    if (selectedSymbolId) {
      const node = cy.$id(selectedSymbolId);
      if (node.length > 0) {
        cy.center(node);
        cy.zoom(cy.zoom() * 1.2);
        node.addClass("search-highlight");
        setTimeout(() => {
          node.removeClass("search-highlight");
        }, 2000);
      }
    }

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
    layoutType,
    selectedSymbolId,
    selectSymbol,
    findCallPath,
    setHighlightedPath,
  ]);

  // Apply theme styles when graphStyles change (e.g. theme toggle) without recreating the graph
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.style(graphStyles);
    }
  }, [graphStyles]);

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
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
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
