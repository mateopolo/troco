// src/utils/diagnostics/webrtcScanner.js
// ═══════════════════════════════════════════════════════════════════
// TROCO — WEBRTC DIAGNOSTIC SCANNER
// Scans active RTCPeerConnections, media devices, permissions, and signaling state.
// ═══════════════════════════════════════════════════════════════════

export async function scanWebRTC() {
  const result = {
    timestamp: new Date().toISOString(),
    mediaSupport: {
      hasRTCPeerConnection: typeof window.RTCPeerConnection !== 'undefined',
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    },
    permissions: {},
    audioDevices: [],
    videoDevices: [],
    activeConnections: [],
    signalingTraces: [],
    errors: [],
  };

  try {
    // 1. Check Permissions
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const mic = await navigator.permissions.query({ name: 'microphone' });
        result.permissions.microphone = mic.state;
      } catch (e) {
        result.permissions.microphone = 'unsupported';
      }

      try {
        const cam = await navigator.permissions.query({ name: 'camera' });
        result.permissions.camera = cam.state;
      } catch (e) {
        result.permissions.camera = 'unsupported';
      }
    }

    // 2. Enumerate Devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        result.audioDevices = devices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({ label: d.label ? '[REDACTED_LABEL]' : 'Default Mic', deviceId: d.deviceId ? 'present' : 'none' }));
        result.videoDevices = devices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({ label: d.label ? '[REDACTED_LABEL]' : 'Default Cam', deviceId: d.deviceId ? 'present' : 'none' }));
      } catch (e) {
        result.errors.push(`Device enumeration error: ${e.message}`);
      }
    }

    // 3. Inspect Tracked PeerConnections
    if (Array.isArray(window.__rtcConnections)) {
      result.activeConnections = window.__rtcConnections.map((pc, idx) => ({
        index: idx,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
        localTracks: pc.getLocalStreams ? pc.getLocalStreams().flatMap(s => s.getTracks().map(t => t.kind)) : [],
        remoteTracks: pc.getRemoteStreams ? pc.getRemoteStreams().flatMap(s => s.getTracks().map(t => t.kind)) : [],
      }));
    }

    // 4. Retrieve WebRTC event traces
    if (Array.isArray(window.__webrtcTrace)) {
      result.signalingTraces = window.__webrtcTrace.slice(-25);
    }

    // 5. Check localStorage for calls & notifications
    const callKeys = Object.keys(localStorage).filter(k => k.includes('call') || k.includes('troco_call'));
    result.callStorageKeys = callKeys;

  } catch (err) {
    result.errors.push(err.message);
  }

  console.group('📞 WEBRTC SCANNER RESULT');
  console.log(result);
  console.groupEnd();

  return result;
}

if (typeof window !== 'undefined') {
  window.scanWebRTC = scanWebRTC;
}
