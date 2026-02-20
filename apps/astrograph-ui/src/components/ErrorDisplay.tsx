interface ErrorDisplayProps {
  title: string;
  message: string;
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ErrorDisplay = ({
  title,
  message,
  details,
  actionLabel,
  onAction,
}: ErrorDisplayProps) => (
  <div className="error-boundary" role="alert">
    <h2 className="error-boundary-title">{title}</h2>
    <p className="error-boundary-message">{message}</p>
    {details && (
      <details className="error-boundary-details">
        <summary>Error details</summary>
        <pre className="error-boundary-stack">{details}</pre>
      </details>
    )}
    {actionLabel && onAction && (
      <button
        type="button"
        className="error-boundary-reload"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
