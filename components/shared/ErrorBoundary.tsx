"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree.
 * Displays a fallback UI instead of crashing the whole app.
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-lg text-center">
            {/* Error Icon */}
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-red-50 rounded-full">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-black uppercase text-[#06054e] mb-3">
              Something Went Wrong
            </h1>

            {/* Error Description */}
            <p className="text-slate-600 mb-6">
              We apologize for the inconvenience. An unexpected error has
              occurred.
            </p>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl text-left">
                <p className="text-xs font-black uppercase text-slate-400 mb-2">
                  Error Details:
                </p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#06054e] text-white rounded-full font-black uppercase text-sm hover:bg-[#06054e]/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-white text-[#06054e] border-2 border-[#06054e] rounded-full font-black uppercase text-sm hover:bg-slate-50 transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Support Link */}
            <p className="text-xs text-slate-500 mt-6">
              If this problem persists, please{" "}
              <a
                href="/contact"
                className="text-[#06054e] font-bold hover:underline"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Lightweight error fallback for smaller sections
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 text-center">
      <div className="mb-4 flex justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <p className="text-sm font-bold text-slate-600 mb-3">
        Failed to load content
      </p>
      {reset && (
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#06054e] text-white rounded-full text-xs font-black uppercase hover:bg-[#06054e]/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
