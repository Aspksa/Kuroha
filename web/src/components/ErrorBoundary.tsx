import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

type State = { error?: Error };

export default class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Kuroha UI error", error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="fatal-state">
          <span className="eyebrow">KUROHA / UI FAILURE</span>
          <h1>Interface recovery</h1>
          <p>{this.state.error.message}</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload Kuroha
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
