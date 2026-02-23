type Theme = "dark" | "light";

type ThemeToggleProps = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

const ThemeToggle = ({ theme, onThemeChange }: ThemeToggleProps) => {
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    onThemeChange(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? (
        <span className="theme-toggle-icon" aria-hidden="true">
          ☀
        </span>
      ) : (
        <span className="theme-toggle-icon" aria-hidden="true">
          ☽
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
export type { Theme };
