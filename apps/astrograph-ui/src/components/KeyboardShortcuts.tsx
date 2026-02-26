import { useEffect, useRef } from "react";

const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const mod = isMac ? "⌘" : "Ctrl";

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: `${mod} + ?`, description: "Show this keyboard shortcuts help" },
  { keys: `${mod} + O`, description: "Open analysis file" },
  { keys: `${mod} + F`, description: "Focus search" },
  { keys: `${mod} + G`, description: "Focus graph (clear selection)" },
  { keys: "Escape", description: "Clear selection" },
  { keys: `${mod} + 1`, description: "Switch to Symbols tab" },
  { keys: `${mod} + 2`, description: "Switch to Files tab" },
  { keys: `${mod} + 3`, description: "Switch to Entrypoints tab" },
  { keys: `${mod} + L`, description: "Cycle layout type" },
  { keys: `${mod} + E`, description: "Toggle entrypoints filter" },
  { keys: `${mod} + B`, description: "Toggle bookmark for selected symbol" },
  { keys: "↑ / ↓", description: "Navigate symbol list (when in sidebar)" },
  { keys: "Enter", description: "Select symbol (when in symbol list)" },
  { keys: `${mod} + + / − / 0`, description: "Zoom in / out / fit (when graph focused)" },
];

type KeyboardShortcutsProps = { onClose: () => void };

const KeyboardShortcuts = ({ onClose }: KeyboardShortcutsProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="shortcuts-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="shortcuts-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button
            type="button"
            className="shortcuts-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <ul className="shortcuts-list">
          {SHORTCUTS.map(({ keys, description }) => (
            <li key={keys} className="shortcuts-row">
              <kbd className="shortcuts-keys">{keys}</kbd>
              <span className="shortcuts-desc">{description}</span>
            </li>
          ))}
        </ul>
        <div className="shortcuts-footer">
          <button type="button" className="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
