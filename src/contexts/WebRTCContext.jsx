// src/contexts/WebRTCContext.jsx
import React, { createContext, useContext } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

const WebRTCContext = createContext(null);

export function WebRTCProvider({ children, profileName, profileUid, selectedChat }) {
  const webrtc = useWebRTC({ profileName, profileUid, selectedChat });
  return (
    <WebRTCContext.Provider value={webrtc}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCContext() {
  const ctx = useContext(WebRTCContext);
  if (!ctx) {
    throw new Error('useWebRTCContext must be used within WebRTCProvider');
  }
  return ctx;
}
