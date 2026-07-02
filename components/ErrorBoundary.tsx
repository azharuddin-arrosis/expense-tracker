'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleClearAndLogout = () => {
    localStorage.clear();
    window.location.replace('/login');
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh max-w-[480px] mx-auto flex flex-col items-center justify-center px-6 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Terjadi Kesalahan</h2>
          <p className="text-sm text-gray-500 text-center mb-6 max-w-xs">
            Aplikasi mengalami error. Kamu bisa coba reload atau bersihkan data.
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={this.handleReload}
              className="w-full h-8 rounded-xl bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 active:bg-emerald-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>
            <button
              onClick={this.handleClearAndLogout}
              className="w-full h-8 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-xs flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Data & Logout
            </button>
          </div>

          {this.state.error && (
            <details className="mt-6 w-full">
              <summary className="text-xs text-gray-400 cursor-pointer text-center">Detail Error</summary>
              <pre className="mt-2 text-[10px] text-gray-400 bg-gray-50 rounded-xl p-3 overflow-auto max-h-32 leading-relaxed">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
