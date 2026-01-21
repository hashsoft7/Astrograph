import { create } from "zustand";
import { AnalysisResult, Bookmark } from "../types";

const BOOKMARKS_KEY = "astrograph.bookmarks";
const BOOKMARKS_VERSION = 1 as const;

type BookmarkMap = Record<string, Bookmark>;

interface BookmarkStorage {
  version: number;
  projects: Record<string, BookmarkMap>;
}

const EMPTY_BOOKMARKS: BookmarkMap = {};

const createEmptyStorage = (): BookmarkStorage => ({
  version: BOOKMARKS_VERSION,
  projects: {},
});

const loadStorage = (): BookmarkStorage => {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) {
      return createEmptyStorage();
    }

    const parsed = JSON.parse(raw) as unknown;

    // New structured format
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      "projects" in parsed
    ) {
      const storage = parsed as BookmarkStorage;
      if (typeof storage.version === "number" && storage.projects) {
        return storage;
      }
    }

    // Legacy flat format: { [symbolId]: Bookmark }
    if (parsed && typeof parsed === "object" && !("version" in parsed)) {
      const legacy = parsed as BookmarkMap;
      return {
        version: BOOKMARKS_VERSION,
        projects: {
          // Temporary bucket that will be migrated to a concrete root
          __legacy__: legacy,
        },
      };
    }

    return createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
};

const saveStorage = (storage: BookmarkStorage) => {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(storage));
};

const loadBookmarksForRoot = (root: string): BookmarkMap => {
  if (!root) {
    return EMPTY_BOOKMARKS;
  }

  const storage = loadStorage();

  if (storage.projects[root]) {
    return storage.projects[root];
  }

  // Migrate any legacy flat bookmarks into the first concrete root we see.
  if (storage.projects.__legacy__) {
    const legacy = storage.projects.__legacy__;
    delete storage.projects.__legacy__;
    storage.projects[root] = legacy;
    saveStorage(storage);
    return legacy;
  }

  return EMPTY_BOOKMARKS;
};

const saveBookmarksForRoot = (root: string, bookmarks: BookmarkMap) => {
  if (!root) {
    return;
  }

  const storage = loadStorage();

  if (!storage.projects) {
    storage.projects = {};
  }

  if (Object.keys(bookmarks).length === 0) {
    if (storage.projects[root]) {
      delete storage.projects[root];
    }
  } else {
    storage.projects[root] = bookmarks;
  }

  saveStorage(storage);
};

const removeOrphanedBookmarksForAnalysis = (
  root: string,
  bookmarks: BookmarkMap,
  analysis: AnalysisResult,
): BookmarkMap => {
  const validIds = new Set(analysis.symbols.map((symbol) => symbol.id));
  const cleanedEntries = Object.entries(bookmarks).filter(([id]) =>
    validIds.has(id),
  );

  // Nothing to clean up, keep original object to avoid unnecessary writes.
  if (cleanedEntries.length === Object.keys(bookmarks).length) {
    return bookmarks;
  }

  const cleaned: BookmarkMap = Object.fromEntries(cleanedEntries);
  saveBookmarksForRoot(root, cleaned);
  return cleaned;
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
  bookmarks: EMPTY_BOOKMARKS,
  graphViewMode: "all",
  layoutType: "cose",
  showEntrypointsOnly: false,
  highlightedPath: [],
  loadAnalysis: (data) => {
    const rawBookmarks = loadBookmarksForRoot(data.root);
    const projectBookmarks = removeOrphanedBookmarksForAnalysis(
      data.root,
      rawBookmarks,
      data,
    );

    return set({
      analysis: data,
      selectedSymbolId: null,
      selectedFile: null,
      highlightedPath: [],
      bookmarks: projectBookmarks,
    });
  },
  selectSymbol: (id) => set({ selectedSymbolId: id }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  setSearch: (value) => set({ search: value }),
  toggleBookmark: (id) => {
    const { analysis, bookmarks } = get();
    if (!analysis) {
      return;
    }

    const updated: BookmarkMap = { ...bookmarks };
    if (updated[id]) {
      delete updated[id];
    } else {
      updated[id] = { id };
    }

    saveBookmarksForRoot(analysis.root, updated);
    set({ bookmarks: updated });
  },
  setBookmarkLabel: (id, label) => {
    const { analysis, bookmarks } = get();
    if (!analysis) {
      return;
    }

    const updated: BookmarkMap = { ...bookmarks };
    if (!updated[id]) {
      updated[id] = { id, label };
    } else {
      updated[id] = { ...updated[id], label };
    }

    saveBookmarksForRoot(analysis.root, updated);
    set({ bookmarks: updated });
  },
  setGraphViewMode: (mode) => set({ graphViewMode: mode }),
  setLayoutType: (layout) => set({ layoutType: layout }),
  setShowEntrypointsOnly: (value) => set({ showEntrypointsOnly: value }),
  setHighlightedPath: (path) => set({ highlightedPath: path }),
}));
