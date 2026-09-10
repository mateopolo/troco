import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { logWebVitalMetric } from './utils/performanceProfiler';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Enregistrement PWA du Service Worker pour support offline, détection de nouvelle version et installation mobile
serviceWorkerRegistration.register({
  onUpdate: (registration, applyUpdate) => {
    console.info('[PWA] Nouvelle version détectée après déploiement Vercel.');
  },
});

// Tracking actif des Web Vitals (LCP, FID/INP, CLS, TTFB, FCP)
reportWebVitals(logWebVitalMetric);
