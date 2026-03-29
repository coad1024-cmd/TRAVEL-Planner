'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-8 text-center flex flex-col items-center gap-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              There was an error rendering this part of your trip. Don't worry, your other details are safe.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
