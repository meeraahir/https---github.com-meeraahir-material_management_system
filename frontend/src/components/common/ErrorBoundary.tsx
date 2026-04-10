import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "../ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-blue-100 bg-white/95 p-8 text-center shadow-xl shadow-blue-950/10 dark:border-blue-100 dark:bg-white/95">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">
              Something went wrong
            </p>
            <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-slate-950">
              The page hit an unexpected error.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-600">
              Reload the app to recover. Your backend data and API contracts were not changed.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={this.handleReload} type="button">
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
