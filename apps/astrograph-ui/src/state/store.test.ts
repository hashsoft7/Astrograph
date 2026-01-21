import { beforeEach, describe, expect, it } from "vitest";
import { useAnalysisStore } from "./store";
import type { AnalysisResult } from "../types";

const sampleAnalysis: AnalysisResult = {
  schema_version: "0.1.0",
  root: "/tmp/sample",
  generated_at: "2026-01-28T00:00:00Z",
  stats: {
    file_count: 1,
    symbol_count: 1,
    call_count: 0,
    entrypoint_count: 1,
    reused_cache_files: 0,
    reanalyzed_files: 1,
  },
  files: [
    {
      path: "main.ts",
      language: "typescript",
      hash: "abc123",
      byte_size: 10,
    },
  ],
  symbols: [
    {
      id: "sym_main",
      name: "main",
      kind: "function",
      file: "main.ts",
      span: {
        start_line: 1,
        start_col: 1,
        end_line: 2,
        end_col: 2,
      },
      fq_name: "main::main",
      container: null,
      is_exported: true,
      is_entrypoint: true,
    },
  ],
  calls: [],
  entrypoints: ["sym_main"],
};

const resetStore = () => {
  useAnalysisStore.setState({
    analysis: null,
    selectedSymbolId: null,
    selectedFile: null,
    search: "",
    bookmarks: {},
    graphViewMode: "all",
    layoutType: "cose",
    showEntrypointsOnly: false,
    highlightedPath: [],
  });
};

beforeEach(() => {
  localStorage.clear();
  resetStore();
});

describe("analysis store", () => {
  it("loads analysis, resets selections, and loads project-scoped bookmarks", () => {
    // Pre-populate storage for a different project and for the sample root.
    localStorage.setItem(
      "astrograph.bookmarks",
      JSON.stringify({
        version: 1,
        projects: {
          "/tmp/other": {
            sym_other: { id: "sym_other" },
          },
          [sampleAnalysis.root]: {
            sym_main: { id: "sym_main" },
          },
        },
      })
    );

    useAnalysisStore.setState({
      selectedSymbolId: "sym_old",
      selectedFile: "old.ts",
      highlightedPath: ["sym_old"],
    });

    useAnalysisStore.getState().loadAnalysis(sampleAnalysis);
    const state = useAnalysisStore.getState();

    expect(state.analysis).toBe(sampleAnalysis);
    expect(state.selectedSymbolId).toBeNull();
    expect(state.selectedFile).toBeNull();
    expect(state.highlightedPath).toEqual([]);
    expect(state.bookmarks).toEqual({
      sym_main: { id: "sym_main" },
    });
  });

  it("toggles bookmarks and persists them only for the current project root", () => {
    useAnalysisStore.getState().loadAnalysis(sampleAnalysis);
    const { toggleBookmark } = useAnalysisStore.getState();

    toggleBookmark("sym_main");
    expect(useAnalysisStore.getState().bookmarks.sym_main).toEqual({
      id: "sym_main",
    });

    const saved = JSON.parse(
      localStorage.getItem("astrograph.bookmarks") ?? "{}"
    ) as {
      version: number;
      projects: Record<string, Record<string, { id: string }>>;
    };

    expect(saved.projects[sampleAnalysis.root].sym_main).toEqual({
      id: "sym_main",
    });

    toggleBookmark("sym_main");
    expect(useAnalysisStore.getState().bookmarks).toEqual({});
    expect(saved.projects[sampleAnalysis.root]).toBeDefined();
  });

  it("updates bookmark labels for the current project", () => {
    useAnalysisStore.getState().loadAnalysis(sampleAnalysis);
    useAnalysisStore.getState().setBookmarkLabel("sym_main", "hot");
    expect(useAnalysisStore.getState().bookmarks.sym_main).toEqual({
      id: "sym_main",
      label: "hot",
    });
  });

  it("cleans up orphaned bookmarks for the current project on load", () => {
    localStorage.setItem(
      "astrograph.bookmarks",
      JSON.stringify({
        version: 1,
        projects: {
          [sampleAnalysis.root]: {
            sym_main: { id: "sym_main" },
            sym_orphan: { id: "sym_orphan" },
          },
        },
      }),
    );

    useAnalysisStore.getState().loadAnalysis(sampleAnalysis);

    const state = useAnalysisStore.getState();

    expect(state.bookmarks).toEqual({
      sym_main: { id: "sym_main" },
    });

    const saved = JSON.parse(
      localStorage.getItem("astrograph.bookmarks") ?? "{}",
    ) as {
      version: number;
      projects: Record<string, Record<string, { id: string }>>;
    };

    expect(saved.projects[sampleAnalysis.root]).toEqual({
      sym_main: { id: "sym_main" },
    });
  });

  it("migrates from flat legacy bookmark format into a project-scoped structure", () => {
    localStorage.setItem(
      "astrograph.bookmarks",
      JSON.stringify({
        sym_main: { id: "sym_main" },
      })
    );

    useAnalysisStore.getState().loadAnalysis(sampleAnalysis);

    const saved = JSON.parse(
      localStorage.getItem("astrograph.bookmarks") ?? "{}"
    ) as {
      version: number;
      projects: Record<string, Record<string, { id: string }>>;
    };

    expect(saved.version).toBe(1);
    expect(saved.projects[sampleAnalysis.root].sym_main).toEqual({
      id: "sym_main",
    });
    expect(
      ".__legacy__" in saved.projects ? saved.projects.__legacy__ : undefined
    ).toBeUndefined();
  });
});
