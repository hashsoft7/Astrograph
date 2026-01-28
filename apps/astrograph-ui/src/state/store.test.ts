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
  it("loads analysis and resets selections", () => {
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
  });

  it("toggles bookmarks and persists them", () => {
    const { toggleBookmark } = useAnalysisStore.getState();

    toggleBookmark("sym_main");
    expect(useAnalysisStore.getState().bookmarks.sym_main).toEqual({
      id: "sym_main",
    });

    const saved = JSON.parse(
      localStorage.getItem("astrograph.bookmarks") ?? "{}"
    ) as Record<string, { id: string }>;
    expect(saved.sym_main).toEqual({ id: "sym_main" });

    toggleBookmark("sym_main");
    expect(useAnalysisStore.getState().bookmarks).toEqual({});
  });

  it("updates bookmark labels", () => {
    useAnalysisStore.getState().setBookmarkLabel("sym_main", "hot");
    expect(useAnalysisStore.getState().bookmarks.sym_main).toEqual({
      id: "sym_main",
      label: "hot",
    });
  });
});
