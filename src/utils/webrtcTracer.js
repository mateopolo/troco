// src/utils/webrtcTracer.js
// ═══════════════════════════════════════════════════════════════════
// TROCO — WEBRTC STRUCTURED EVENT TRACER
// Traces and records WebRTC signaling lifecycle events for debugging & Sentry breadcrumbs.
// ═══════════════════════════════════════════════════════════════════

export function traceWebRTCEvent(event, data = {}) {
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);
  const entry = {
    ts: new Date().toISOString(),
    event,
    platform: isMobile ? 'mobile' : 'desktop',
    ...data,
  };

  // 1. Console log in development mode
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.log(`[WebRTC-Trace] [${entry.platform}] ${event}`, data);
  }

  // 2. Sentry breadcrumb integration if available
  if (typeof window !== 'undefined' && window.Sentry?.addBreadcrumb) {
    window.Sentry.addBreadcrumb({
      category: 'webrtc',
      message: event,
      data,
      level: 'info',
    });
  }

  // 3. Ring buffer on window for diagnostic access
  if (typeof window !== 'undefined') {
    window.__webrtcTrace = window.__webrtcTrace || [];
    window.__webrtcTrace.push(entry);
    if (window.__webrtcTrace.length > 100) {
      window.__webrtcTrace.shift();
    }
  }

  return entry;
}

export function getWebRTCTraceLog() {
  if (typeof window === 'undefined') return [];
  return window.__webrtcTrace || [];
}
