import { useEffect, useMemo, useRef } from "react";
import cytoscape from "cytoscape";
import { useAnalysisStore } from "../state/store";
import { Symbol } from "../types";

const GraphView = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const analysis = useAnalysisStore((state) => state.analysis);
  const selectedSymbolId = useAnalysisStore((state) => state.selectedSymbolId);
  const search = useAnalysisStore((state) => state.search);
  const bookmarks = useAnalysisStore((state) => state.bookmarks);
  const selectSymbol = useAnalysisStore((state) => state.selectSymbol);

  const elements = useMemo(() => {
    if (!analysis) {
      return [];
    }
    const searchTerm = search.trim().toLowerCase();
    const nodes = analysis.symbols.map((symbol: Symbol) => {
      const classes = [];
      if (symbol.is_entrypoint) {
        classes.push("entrypoint");
      }
      if (bookmarks[symbol.id]) {
        classes.push("bookmarked");
      }
      if (selectedSymbolId === symbol.id) {
        classes.push("selected");
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
        },
        classes: classes.join(" "),
      };
    });
    const edges = analysis.calls
      .filter((call) => call.callee_id)
      .map((call) => ({
        data: {
          id: call.id,
          source: call.caller_id,
          target: call.callee_id!,
          label: call.callee_name,
        },
      }));
    return [...nodes, ...edges];
  }, [analysis, bookmarks, search, selectedSymbolId]);

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
      layout: { name: "cose", animate: false, padding: 30 },
      style: [
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
          },
        },
        {
          selector: "node.bookmarked",
          style: {
            "border-width": 2,
            "border-color": "#22c55e",
          },
        },
        {
          selector: "node.selected",
          style: {
            "background-color": "#ef4444",
          },
        },
        {
          selector: "node.search-match",
          style: {
            "border-width": 2,
            "border-color": "#38bdf8",
          },
        },
      ],
    });

    cy.on("tap", "node", (event) => {
      selectSymbol(event.target.id());
    });

    return () => {
      cy.destroy();
    };
  }, [analysis, elements, selectSymbol]);

  if (!analysis) {
    return <div className="graph-placeholder">Load analysis to see the graph.</div>;
  }

  return <div className="graph-canvas" ref={containerRef} />;
};

export default GraphView;
