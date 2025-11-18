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

interface AnalysisState {
  analysis: AnalysisResult | null;
  selectedSymbolId: string | null;
  search: string;
  bookmarks: Record<string, Bookmark>;
  loadAnalysis: (data: AnalysisResult) => void;
  selectSymbol: (id: string | null) => void;
  setSearch: (value: string) => void;
  toggleBookmark: (id: string) => void;
  setBookmarkLabel: (id: string, label: string) => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analysis: null,
  selectedSymbolId: null,
  search: "",
  bookmarks: loadBookmarks(),
  loadAnalysis: (data) =>
    set({
      analysis: data,
      selectedSymbolId: null,
    }),
  selectSymbol: (id) => set({ selectedSymbolId: id }),
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
}));
