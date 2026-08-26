import React from 'react';
import CallOverlay from '../../components/CallOverlay';
import SectoralErrorBoundary from '../../components/SectoralErrorBoundary';

export function CallFeature({
  callState,
  isCallPip,
  setIsCallPip,
  pipPosition,
  setPipPosition,
  handlePipPointerDown,
  handlePipPointerMove,
  handlePipPointerUp,
  handlePipPointerCancel,
  handlePipContentClick,
  selectedChat,
  callDuration,
  formatCallTimer,
  remoteStream,
  localStream,
  facingMode,
  attachRemoteStream,
  attachLocalStream,
  hasMultipleCameras,
  switchCamera,
  toggleMic,
  endCall,
  currentLang,
}) {
  return (
    <SectoralErrorBoundary moduleName="Module d'Appel WebRTC HD">
      <CallOverlay
        callState={callState}
        isCallPip={isCallPip}
        setIsCallPip={setIsCallPip}
        pipPosition={pipPosition}
        setPipPosition={setPipPosition}
        handlePipPointerDown={handlePipPointerDown}
        handlePipPointerMove={handlePipPointerMove}
        handlePipPointerUp={handlePipPointerUp}
        handlePipPointerCancel={handlePipPointerCancel}
        handlePipContentClick={handlePipContentClick}
        selectedChat={selectedChat}
        callDuration={callDuration}
        formatCallTimer={formatCallTimer}
        remoteStream={remoteStream}
        localStream={localStream}
        facingMode={facingMode}
        attachRemoteStream={attachRemoteStream}
        attachLocalStream={attachLocalStream}
        hasMultipleCameras={hasMultipleCameras}
        switchCamera={switchCamera}
        toggleMic={toggleMic}
        endCall={endCall}
        currentLang={currentLang}
      />
    </SectoralErrorBoundary>
  );
}

export default CallFeature;
