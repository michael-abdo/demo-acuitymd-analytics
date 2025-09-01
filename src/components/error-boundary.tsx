/**
 * Error Boundary (Fail Fast)
 * Fail fast error display - no recovery
 */

'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ FATAL: React error boundary caught error');
    console.error(`💡 Error: ${error.message}`);
    console.error(`💡 Stack: ${error.stack}`);
    console.error(`💡 Component Stack: ${errorInfo.componentStack}`);
    
    // In fail fast mode, we could exit the process
    // For now, we'll display the error prominently
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="max-w-md p-8 bg-white border border-red-200 rounded-lg shadow-lg">
              <h1 className="text-xl font-bold text-red-600 mb-4">
                ❌ Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                A critical error occurred and the application cannot continue.
              </p>
              <div className="bg-red-100 p-4 rounded text-sm font-mono text-red-800 mb-4">
                {this.state.error?.message || 'Unknown error'}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Application
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}