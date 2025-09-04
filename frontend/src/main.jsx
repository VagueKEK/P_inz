import React from 'react';
import { createRoot } from 'react-dom/client'; // <— TO BYŁO BRAK
import App from './App.jsx';
import './index.css';
import ErrorBoundary from './ErrorBoundary.jsx';

const el = document.getElementById('root');
if (!el) {
  throw new Error('Brakuje <div id="root"></div> w index.html');
}

createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

createRoot(el).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);