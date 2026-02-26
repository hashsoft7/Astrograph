import { useEffect } from "react";
import { useAnalysisStore } from "../state/store";
import type { LayoutType, SidebarTab } from "../state/store";

const LAYOUT_ORDER: LayoutType[] = [
  "cose",
  "breadthfirst",
  "circle",
  "grid",
  "concentric",
];

const TAB_BY_NUMBER: Record<number, SidebarTab> = {
  1: "symbols",
  2: "files",
  3: "entrypoints",
};

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if (target.isContentEditable) return true;
  return false;
}

function isModKey(e: KeyboardEvent): boolean {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0
    ? e.metaKey
    : e.ctrlKey;
}

export interface UseKeyboardShortcutsOptions {
  onOpenFile?: () => void;
  onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onOpenFile, onShowShortcuts } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(e.target as EventTarget | null)) {
        return;
      }

      const mod = isModKey(e);

      // Ctrl/Cmd + ? — Show keyboard shortcuts help
      if (mod && e.key === "?") {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // Ctrl/Cmd + O — Open analysis file
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        onOpenFile?.();
        return;
      }

      // Ctrl/Cmd + F — Focus search
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        document.getElementById("search")?.focus();
        return;
      }

      // Ctrl/Cmd + G — Focus graph (clear selection)
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const { selectSymbol, setHighlightedPath } =
          useAnalysisStore.getState();
        selectSymbol(null);
        setHighlightedPath([]);
        document.getElementById("graph-panel")?.focus();
        return;
      }

      // Escape — Clear selection
      if (e.key === "Escape") {
        const { selectSymbol, setHighlightedPath } =
          useAnalysisStore.getState();
        selectSymbol(null);
        setHighlightedPath([]);
        return;
      }

      // Ctrl/Cmd + 1/2/3 — Switch sidebar tab
      if (mod && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const tab = TAB_BY_NUMBER[Number(e.key)];
        if (tab) {
          useAnalysisStore.getState().setActiveSidebarTab(tab);
        }
        return;
      }

      // Ctrl/Cmd + L — Cycle layout
      if (mod && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const { layoutType, setLayoutType } = useAnalysisStore.getState();
        const idx = LAYOUT_ORDER.indexOf(layoutType);
        const next = LAYOUT_ORDER[(idx + 1) % LAYOUT_ORDER.length];
        setLayoutType(next);
        return;
      }

      // Ctrl/Cmd + E — Toggle entrypoints filter
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        const { showEntrypointsOnly, setShowEntrypointsOnly } =
          useAnalysisStore.getState();
        setShowEntrypointsOnly(!showEntrypointsOnly);
        return;
      }

      // Ctrl/Cmd + B — Toggle bookmark for selected symbol
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const { selectedSymbolId, toggleBookmark } =
          useAnalysisStore.getState();
        if (selectedSymbolId) {
          toggleBookmark(selectedSymbolId);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenFile, onShowShortcuts]);
}
