export interface AnalysisProgress {
  phase: string;
  currentFile: string;
  processed: number;
  total: number;
}

interface ProgressBarProps {
  progress: AnalysisProgress | null;
}

const ProgressBar = ({ progress }: ProgressBarProps) => {
  if (!progress) {
    return (
      <div className="progress-banner">
        <div className="progress-bar-indeterminate" />
        <span className="progress-message">Analyzing project…</span>
      </div>
    );
  }

  const { phase, currentFile, processed, total } = progress;
  const percent =
    total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const phaseLabel = phase === "collecting" ? "Scanning files" : "Analyzing";
  const countLabel =
    total > 0 ? `${processed} of ${total} files` : `${processed} files found`;

  return (
    <div className="progress-banner">
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${phaseLabel}: ${countLabel}`}
        />
      </div>
      <div className="progress-details">
        <span className="progress-message">
          {phaseLabel}… {countLabel}
        </span>
        {currentFile && (
          <span className="progress-current-file" title={currentFile}>
            {currentFile}
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
