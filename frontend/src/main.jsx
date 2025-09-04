import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Brakuje <div id="root"></div> w index.html');

// NIE twórz kolejnego roota, jeśli już istnieje (HMR/duplikat importu)
const root = container.__root ?? createRoot(container);
container.__root = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
