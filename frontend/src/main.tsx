import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PwaStatus } from './pwa/PwaStatus';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#140407] text-rose-100 flex items-center justify-center p-6">
          <div className="max-w-xl rounded-2xl border border-rose-800 bg-[#1e050d] p-6 space-y-4 shadow-2xl">
            <h1 className="font-serif text-xl text-rose-300 font-bold flex items-center gap-2">
              <span>⚠️</span> Application Notice
            </h1>
            <p className="text-sm text-rose-200">
              An unexpected component issue was caught. The error details are displayed below:
            </p>
            <pre className="rounded-lg bg-[#0e0205] p-3 text-xs text-rose-400 font-mono overflow-x-auto border border-rose-950">
              {this.state.error?.message || 'Unknown error occurred.'}
              {'\n'}
              {this.state.error?.stack || ''}
            </pre>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="rounded-lg border border-rose-700 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950"
              >
                Clear Local Storage & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
    <PwaStatus />
  </RootErrorBoundary>
);
