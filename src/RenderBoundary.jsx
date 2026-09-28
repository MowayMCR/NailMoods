import React from 'react';

export default class RenderBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app recoveryPage" role="alert">
      <h1>Reprenons tranquillement</h1>
      <p>Cet écran n’a pas pu s’afficher. Tes créations enregistrées sont conservées.</p>
      <button className="primaryAction" onClick={() => { window.location.hash='accueil'; this.setState({failed:false}); }}>Revenir à l’accueil</button>
      <button className="quietButton" onClick={() => window.location.reload()}>Réessayer</button>
    </main>;
  }
}
