import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const isDev =
        import.meta.env.DEV ?? process.env.NODE_ENV === "development";

      return (
        <div className="error-boundary" role="alert">
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-message">
            An unexpected error occurred. Please try reloading the app.
          </p>
          {isDev && (
            <details className="error-boundary-details">
              <summary>Error details</summary>
              <pre className="error-boundary-stack">
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            type="button"
            className="error-boundary-reload"
            onClick={this.handleReload}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
