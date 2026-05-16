import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full border-4 border-black bg-white p-8 shadow-[8px_8px_0_0_#000] space-y-6">
            <div className="flex items-center gap-4 text-primary">
              <AlertCircle className="w-12 h-12" />
              <h1 className="text-3xl font-heading uppercase tracking-tight">System Crash</h1>
            </div>
            
            <div className="space-y-4">
              <p className="text-lg font-medium leading-tight">
                Something went wrong. The Neobrutalist engine hit a snag.
              </p>
              
              {this.state.error && (
                <div className="bg-primary/10 border-2 border-black p-3 font-mono text-xs overflow-auto max-h-32">
                  {import.meta.env.PROD
                    ? "Please reload or return home. If the problem persists, try again later."
                    : this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-primary-foreground border-4 border-black py-3 font-heading uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0_0_#000] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </button>
              
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full bg-white text-black border-4 border-black py-3 font-heading uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0_0_#000] transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
