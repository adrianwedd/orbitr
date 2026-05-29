'use client';

import React from 'react';

interface ErrorBoundaryProps {
  /** Human-readable name of the wrapped region, shown in the fallback. */
  name: string;
  /** Optional custom fallback renderer; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors in a subtree so one broken region (e.g. the
 * sequencer canvas or the sample library) doesn't blank the whole app. Shows a
 * recoverable fallback with a "Try again" button that resets the boundary.
 *
 * Note: React error boundaries do NOT catch errors in event handlers, async
 * code, or the server — those paths surface through the store's error state
 * instead. This guards the render tree.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surface to the console for debugging; a real telemetry sink could hook here.
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }
      return (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-950/30 p-6 text-center text-sm text-red-200"
        >
          <p className="font-medium text-red-100">{this.props.name} hit an error.</p>
          <p className="mt-1 text-red-300/80">{error.message || 'Something went wrong.'}</p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 rounded-md bg-red-500/20 px-4 py-2 font-medium text-red-100 transition-colors hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
