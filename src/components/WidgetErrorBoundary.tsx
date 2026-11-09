
import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryKey: number;
}

/**
 * Prevents one broken widget from crashing the entire dashboard.
 */
export class WidgetErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    retryKey: 0,
  };

  /**
   * Update the boundary state when a child component crashes.
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log the error and notify an optional error handler.
   */
  componentDidCatch(
    error: Error,
    errorInfo: React.ErrorInfo
  ): void {
    console.error('Widget rendering failed:', error, errorInfo);

    try {
      this.props.onError?.(error, errorInfo);
    } catch (callbackError) {
      console.error('Widget error callback failed:', callbackError);
    }
  }

  /**
   * Retry by clearing the error state and remounting the child.
   */
  handleRetry = (): void => {
    this.setState((previousState) => ({
      hasError: false,
      error: null,
      retryKey: previousState.retryKey + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <section
          className="empty-state"
          role="alert"
          aria-live="assertive"
        >
          <strong>
            {this.props.title ?? 'Widget'} unavailable
          </strong>

          <p>
            This panel encountered an error.
            Other dashboard widgets are still running.
          </p>

          <button
            type="button"
            className="tiny-btn"
            onClick={this.handleRetry}
          >
            Try again
          </button>
        </section>
      );
    }

    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
