import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Fuchibol render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-[#0a1128] px-4 text-center text-white">
          <p className="text-lg font-semibold text-red-400">Error al cargar Fuchibol</p>
          <p className="max-w-md text-sm text-white/60">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[#0066ff] px-5 py-2 text-sm font-semibold"
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
