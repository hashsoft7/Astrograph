import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAnalysisStore } from "./state/store";
import type { AnalysisResult } from "./types";

vi.mock("./components/GraphView", () => ({
  default: () => <div data-testid="graph-view" />,
}));
vi.mock("./components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock("./components/BookmarksPanel", () => ({
  default: () => <div data-testid="bookmarks" />,
}));

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

const makeFile = (contents: string) => {
  const file = new File([contents], "analysis.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(contents),
  });
  return file;
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

describe("App", () => {
  it("renders the header", () => {
    render(<App />);
    expect(screen.getByText(/Astrograph/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/load analysis/i)).toBeInTheDocument();
  });

  it("loads analysis file and shows stats", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByLabelText(/load analysis/i);
    const file = makeFile(JSON.stringify(sampleAnalysis));

    await user.upload(input, file);

    expect(await screen.findByText(/1 files/i)).toBeInTheDocument();
    expect(screen.getByText(/1 symbols/i)).toBeInTheDocument();
    expect(screen.getByText(/0 calls/i)).toBeInTheDocument();
  });

  it("shows an error for invalid JSON", async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<App />);

    const input = screen.getByLabelText(/load analysis/i);
    const file = makeFile("{bad-json");

    await user.upload(input, file);

    expect(
      await screen.findByText(/unable to parse analysis json/i)
    ).toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
