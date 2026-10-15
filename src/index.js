import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ConfirmProvider } from './hooks/useConfirm';
import { ErrorBoundary } from './ErrorBoundary';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { logWebVitalMetric } from './utils/performanceProfiler';
import { initSentry } from './utils/sentry';
import logger from './utils/logger';

// Guard global pour filtrer les erreurs résiduelles attendues (émulateurs, permission-denied au boot)
if (process.env.NODE_ENV === 'production') {
  const originalError = console.error;
  console.error = (...args) => {
    // Filtre les erreurs Firestore permission-denied attendues
    const msg = args[0]?.toString() || '';
    if (msg.includes('Missing or insufficient permissions')) return;
    originalError(...args);
  };
} else {
  // En environnement dev / test E2E : filtrer également les erreurs de permissions bénignes de l'émulateur
  const originalError = console.error;
  console.error = (...args) => {
    const fullMsg = args.map((a) => (typeof a === 'string' ? a : a?.message || a?.toString?.() || '')).join(' ');
    if (
      fullMsg.includes('Missing or insufficient permissions') ||
      fullMsg.includes('permission-denied') ||
      fullMsg.includes('Property admin is undefined')
    ) {
      return;
    }
    originalError(...args);
  };
}

// P2-OBS-02: Initialisation Sentry AVANT le render React
initSentry();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Enregistrement PWA du Service Worker pour support offline, détection de nouvelle version et installation mobile
serviceWorkerRegistration.register({
  onUpdate: (registration, applyUpdate) => {
    logger.info('[PWA] Nouvelle version détectée après déploiement Vercel.');
  },
});

// Tracking actif des Web Vitals (LCP, FID/INP, CLS, TTFB, FCP)
reportWebVitals(logWebVitalMetric);
