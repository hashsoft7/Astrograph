import { create } from "zustand";
import { AnalysisResult, Bookmark } from "../types";

const BOOKMARKS_KEY = "astrograph.bookmarks";

const loadBookmarks = (): Record<string, Bookmark> => {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<string, Bookmark>;
  } catch {
    return {};
  }
};

const saveBookmarks = (bookmarks: Record<string, Bookmark>) => {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
};

export type GraphViewMode = "all" | "entrypoints" | "symbol-centric";
export type LayoutType = "cose" | "breadthfirst" | "circle" | "grid" | "concentric";

interface AnalysisState {
  analysis: AnalysisResult | null;
  selectedSymbolId: string | null;
  selectedFile: string | null;
  search: string;
  bookmarks: Record<string, Bookmark>;
  graphViewMode: GraphViewMode;
  layoutType: LayoutType;
  showEntrypointsOnly: boolean;
  highlightedPath: string[];
  loadAnalysis: (data: AnalysisResult) => void;
  selectSymbol: (id: string | null) => void;
  setSelectedFile: (path: string | null) => void;
  setSearch: (value: string) => void;
  toggleBookmark: (id: string) => void;
  setBookmarkLabel: (id: string, label: string) => void;
  setGraphViewMode: (mode: GraphViewMode) => void;
  setLayoutType: (layout: LayoutType) => void;
  setShowEntrypointsOnly: (value: boolean) => void;
  setHighlightedPath: (path: string[]) => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analysis: null,
  selectedSymbolId: null,
  selectedFile: null,
  search: "",
  bookmarks: loadBookmarks(),
  graphViewMode: "all",
  layoutType: "cose",
  showEntrypointsOnly: false,
  highlightedPath: [],
  loadAnalysis: (data) =>
    set({
      analysis: data,
      selectedSymbolId: null,
      selectedFile: null,
      highlightedPath: [],
    }),
  selectSymbol: (id) => set({ selectedSymbolId: id }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  setSearch: (value) => set({ search: value }),
  toggleBookmark: (id) => {
    const bookmarks = { ...get().bookmarks };
    if (bookmarks[id]) {
      delete bookmarks[id];
    } else {
      bookmarks[id] = { id };
    }
    saveBookmarks(bookmarks);
    set({ bookmarks });
  },
  setBookmarkLabel: (id, label) => {
    const bookmarks = { ...get().bookmarks };
    if (!bookmarks[id]) {
      bookmarks[id] = { id, label };
    } else {
      bookmarks[id] = { ...bookmarks[id], label };
    }
    saveBookmarks(bookmarks);
    set({ bookmarks });
  },
  setGraphViewMode: (mode) => set({ graphViewMode: mode }),
  setLayoutType: (layout) => set({ layoutType: layout }),
  setShowEntrypointsOnly: (value) => set({ showEntrypointsOnly: value }),
  setHighlightedPath: (path) => set({ highlightedPath: path }),
}));
