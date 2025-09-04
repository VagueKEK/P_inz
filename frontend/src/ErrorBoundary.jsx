import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}>💥 Coś poszło nie tak: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}
