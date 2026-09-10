import React from 'react';
import { render } from '@testing-library/react';
import WebRTCCallOverlay from './WebRTCCallOverlay';

describe('WebRTCCallOverlay Foreground & Overlay Tests (Phase 2)', () => {
  beforeEach(() => {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      modalRoot.innerHTML = '';
    }
  });

  test('Renders full-screen call inside Portal when callState.active is true', () => {
    const callState = {
      type: 'video',
      active: true,
      ringing: false,
      micOn: true,
      camOn: true,
    };

    render(
      <WebRTCCallOverlay
        callState={callState}
        isCallPip={false}
        incomingCall={null}
        t={(k) => k}
      />
    );

    const modalRoot = document.getElementById('modal-root');
    expect(modalRoot).not.toBeNull();
    const fullscreenDiv = modalRoot.querySelector('.fixed.inset-0.z-\\[999999\\]');
    expect(fullscreenDiv).not.toBeNull();
    expect(fullscreenDiv.style.zIndex).toBe('999999');
  });

  test('Does NOT render full-screen call when isCallPip is true', () => {
    const callState = {
      type: 'video',
      active: true,
      ringing: false,
      micOn: true,
      camOn: true,
    };

    render(
      <WebRTCCallOverlay
        callState={callState}
        isCallPip={true}
        incomingCall={null}
        t={(k) => k}
      />
    );

    const modalRoot = document.getElementById('modal-root');
    const fullscreenDiv = modalRoot?.querySelector('.fixed.inset-0.z-\\[999999\\]');
    expect(fullscreenDiv).toBeFalsy();
  });
});
