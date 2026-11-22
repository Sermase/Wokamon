import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/app.css';
import { Capacitor } from '@capacitor/core';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// En la web, un service worker deja abrir la app sin conexión (en la app nativa no hace falta).
if (import.meta.env.PROD && import.meta.env.MODE !== 'demo' && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
