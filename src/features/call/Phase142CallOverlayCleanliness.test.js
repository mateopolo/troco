import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WebRTCCallOverlay from './WebRTCCallOverlay';
import LiveCallSubtitles from '../../components/LiveCallSubtitles';

jest.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'me' } },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

describe('WP-FIX-05 : Call Screen Cleanliness & Header Refactor', () => {
  beforeEach(() => {
    let modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);
    }
    modalRoot.innerHTML = '';
  });

  test('Renders 1 single top info bar with name, status "En appel", and quick mute button', () => {
    const mockToggleMic = jest.fn();
    const callState = {
      type: 'video',
      active: true,
      ringing: false,
      micOn: true,
      camOn: true,
    };
    const selectedChat = {
      user: 'MATMOT',
      avatar: 'https://example.com/avatar.jpg',
    };

    render(
      <WebRTCCallOverlay
        callState={callState}
        isCallPip={false}
        selectedChat={selectedChat}
        toggleMic={mockToggleMic}
        callDuration={45}
        formatCallTimer={(s) => `00:${s}`}
      />
    );

    // 1. Name "MATMOT" should appear ONLY ONCE on screen (no duplicate in the center)
    const nameMatches = screen.getAllByText('MATMOT');
    expect(nameMatches.length).toBe(1);

    // 2. Status displays "En appel • 00:45"
    expect(screen.getByText(/En appel • 00:45/i)).toBeInTheDocument();

    // 3. Quick mute button in the top bar
    const muteButtons = screen.getAllByTitle(/Couper le micro/i);
    expect(muteButtons.length).toBeGreaterThan(0);
    // Clicking the top quick mute button calls toggleMic
    fireEvent.click(muteButtons[0]);
    expect(mockToggleMic).toHaveBeenCalled();
  });

  test('Center avatar has no white border when no remote stream is received', () => {
    const callState = {
      type: 'video',
      active: true,
      ringing: false,
      micOn: true,
      camOn: false,
    };
    const selectedChat = {
      user: 'MATMOT',
      avatar: 'https://example.com/avatar.jpg',
    };

    render(
      <WebRTCCallOverlay
        callState={callState}
        isCallPip={false}
        selectedChat={selectedChat}
        remoteStream={null}
        localStream={null}
      />
    );

    const modalRoot = document.getElementById('modal-root');
    const centerAvatar = modalRoot.querySelector('img[alt=""]');
    expect(centerAvatar).not.toBeNull();
    // Border should not contain white solid border
    expect(centerAvatar.style.border).not.toContain('solid');
    expect(centerAvatar.style.border).not.toContain('rgba(255,255,255');
    expect(centerAvatar.style.width).toBe('128px');
  });

  test('LiveCallSubtitles container is positioned at bottom: 180px above the control dock', () => {
    const { container } = render(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        isCompact={false}
      />
    );

    const subtitleBox = container.querySelector('[style*="bottom"]');
    expect(subtitleBox).not.toBeNull();
    expect(subtitleBox.style.bottom).toBe('180px');
  });
});
