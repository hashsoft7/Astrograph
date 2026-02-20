import React from "react";
import { ErrorDisplay } from "./ErrorDisplay";

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
        <ErrorDisplay
          title="Something went wrong"
          message="An unexpected error occurred. Please try reloading the app."
          details={isDev ? this.state.error.stack ?? undefined : undefined}
          actionLabel="Reload App"
          onAction={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}
