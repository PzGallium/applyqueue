import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-zinc-100">
          <h1 className="text-lg font-semibold">加载出错</h1>
          <pre className="max-w-xl overflow-auto rounded bg-zinc-800 p-4 text-sm text-red-400">
            {this.state.err.message}
          </pre>
          <button
            className="rounded bg-cyan-600 px-4 py-2 text-sm hover:bg-cyan-500"
            onClick={() => window.location.reload()}
          >
            刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
