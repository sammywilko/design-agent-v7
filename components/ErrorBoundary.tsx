import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center h-full min-h-[300px] bg-zinc-950/50 rounded-xl border border-red-500/20 p-8">
          <div className="max-w-lg w-full text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            {/* Error Title */}
            <h3 className="text-lg font-bold text-white mb-2">
              {componentName ? `${componentName} Error` : 'Something went wrong'}
            </h3>

            {/* Error Message */}
            <p className="text-sm text-zinc-400 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleCopyError}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Error
              </button>
            </div>

            {/* Error Details Toggle */}
            <button
              onClick={this.toggleDetails}
              className="flex items-center gap-1 mx-auto text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <Bug className="w-3 h-3" />
              {showDetails ? 'Hide' : 'Show'} technical details
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Technical Details */}
            {showDetails && (
              <div className="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-left overflow-auto max-h-48">
                <p className="text-xs text-zinc-500 mb-2 font-mono">
                  <span className="text-red-400">Error:</span> {error?.message}
                </p>
                {error?.stack && (
                  <pre className="text-xs text-zinc-600 font-mono whitespace-pre-wrap break-words">
                    {error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
                {errorInfo?.componentStack && (
                  <div className="mt-2 pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1 font-mono">Component Stack:</p>
                    <pre className="text-xs text-zinc-600 font-mono whitespace-pre-wrap break-words">
                      {errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            <p className="mt-4 text-xs text-zinc-600">
              If this keeps happening, try refreshing the page or contact support.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
