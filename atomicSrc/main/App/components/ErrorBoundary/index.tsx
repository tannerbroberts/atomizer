import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    console.log('Error boundary caught error:', error);
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    console.log('Error boundary activated!');
    this.setState({
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <h1 className="error-boundary-title">
              Application Error
            </h1>

            <div className="error-boundary-details">
              <strong>Error:</strong><br />
              {this.state.error?.message || 'Unknown error occurred'}
            </div>

            {this.state.error?.stack && (
              <div className="error-boundary-details">
                <strong>Stack Trace:</strong>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '8px' }}>
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            {this.state.errorInfo?.componentStack && (
              <div className="error-boundary-details">
                <strong>Component Stack:</strong>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '8px' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <p className="error-boundary-message">
              The application has encountered an error and cannot continue.
              Please refresh the page to restart the application.
            </p>

            <button
              onClick={() => globalThis.location.reload()}
              className="error-boundary-button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
