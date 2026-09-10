/**
 * fullRegressionScan.js — TROCO Diagnostic Complet des Régressions
 * Exécutable depuis la console DevTools (F12) sur mobile & desktop.
 */
export async function fullDiagnostic() {
  const report = {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    isMobile: typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent),
    results: {},
  };

  console.group('🔍 TROCO — DIAGNOSTIC COMPLET DES RÉGRESSIONS');

  // 1. LISTENERS FIRESTORE ACTIFS
  console.group('1️⃣ LISTENERS FIRESTORE');
  try {
    const listeners = window.__firestoreListeners || [];
    console.log('Listeners trackés :', listeners.length);
    if (listeners.length > 0) {
      console.table(listeners.map(l => ({
        path: l.path,
        type: l.type,
        timestamp: new Date(l.ts).toLocaleTimeString(),
      })));
      const paths = listeners.map(l => l.path);
      const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
      if (dupes.length > 0) {
        console.warn('⚠️ DOUBLONS DÉTECTÉS :', [...new Set(dupes)]);
        report.results.duplicateListeners = [...new Set(dupes)];
      }
    } else {
      console.info('ℹ️ Aucun listener tracké via window.__firestoreListeners');
    }
  } catch (e) {
    console.error('Erreur scan listeners :', e);
  }
  console.groupEnd();

  // 2. ÉTAT DU CHAT
  console.group('2️⃣ ÉTAT DU CHAT');
  try {
    const chatKeys = Object.keys(localStorage).filter(k => k.includes('chat') || k.includes('troco_chat'));
    console.log('Clés localStorage chat :', chatKeys);

    const threadsRaw = localStorage.getItem('troco_chat_threads');
    if (threadsRaw) {
      const threads = JSON.parse(threadsRaw);
      Object.entries(threads).forEach(([chatId, msgs]) => {
        console.log(`Chat ${chatId} : ${msgs.length} messages`);
        const ids = msgs.map(m => m.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (dupes.length > 0) {
          console.warn(`  ⚠️ ${dupes.length} message(s) dupliqué(s)`);
          report.results.duplicateMessages = report.results.duplicateMessages || {};
          report.results.duplicateMessages[chatId] = dupes;
        }
      });
    }
  } catch (e) {
    console.error('Erreur scan chat :', e);
  }
  console.groupEnd();

  // 3. ÉTAT WEBRTC
  console.group('3️⃣ ÉTAT WEBRTC');
  try {
    if (window.__rtcConnections) {
      console.log('RTCPeerConnections trackées :', window.__rtcConnections.length);
      report.results.rtcConnections = window.__rtcConnections.map(pc => ({
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
      }));
    } else {
      console.info('ℹ️ Aucune RTCPeerConnection active trackée sur window');
    }

    if (navigator.permissions) {
      try {
        const micPerm = await navigator.permissions.query({ name: 'microphone' });
        const camPerm = await navigator.permissions.query({ name: 'camera' });
        console.log('Permissions :', { mic: micPerm.state, cam: camPerm.state });
        report.results.permissions = { microphone: micPerm.state, camera: camPerm.state };
      } catch (_) {}
    }

    const notifKeys = Object.keys(localStorage).filter(k => k.includes('notif') || k.includes('call'));
    console.log('Clés notifications :', notifKeys);
  } catch (e) {
    console.error('Erreur scan WebRTC :', e);
  }
  console.groupEnd();

  // 4. APP CHECK STATE
  console.group('4️⃣ APP CHECK');
  try {
    if (window.__appCheckState) {
      console.log('App Check state :', window.__appCheckState);
      report.results.appCheck = window.__appCheckState;
    } else {
      console.info('ℹ️ App Check initialisé (mode standard sans debug hook)');
    }
  } catch (e) {
    console.error('Erreur scan App Check :', e);
  }
  console.groupEnd();

  // 5. STACKING CONTEXTS & MODALES
  console.group('5️⃣ STACKING CONTEXTS & MODALES');
  try {
    const all = [...document.querySelectorAll('*')];
    const highZ = all
      .map(el => ({ el, z: parseInt(window.getComputedStyle(el).zIndex, 10) || 0, pos: window.getComputedStyle(el).position }))
      .filter(x => x.z > 100 || x.pos === 'fixed')
      .sort((a, b) => b.z - a.z)
      .slice(0, 10);
    console.table(highZ.map(x => ({
      tag: x.el.tagName,
      id: x.el.id,
      className: (x.el.className?.toString() || '').slice(0, 40),
      zIndex: x.z,
      position: x.pos,
    })));
  } catch (e) {
    console.error('Erreur scan stacking :', e);
  }
  console.groupEnd();

  console.groupEnd();

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      console.log('✅ Rapport copié dans le presse-papiers');
    }
  } catch (_) {}

  return report;
}

if (typeof window !== 'undefined') {
  window.fullDiagnostic = fullDiagnostic;
}
