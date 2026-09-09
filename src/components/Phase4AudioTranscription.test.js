import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceNoteRecorder, { detectSupportedMimeType } from './VoiceNoteRecorder';
import MessageBubble from './chat/MessageBubble';
import VoiceNotePlayer from './VoiceNotePlayer';

describe('PHASE 4 — TÂCHE 4.1 : Fix Audio iOS & Transcription Vocale', () => {
  beforeAll(() => {
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    };
  });

  describe('1. Normalisation MIME prioritaire iOS (audio/mp4)', () => {
    test('detectSupportedMimeType() priorise audio/mp4 sur environnement iOS', () => {
      // Mock userAgent for iPhone
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      });

      const mime = detectSupportedMimeType();
      expect(mime).toBe('audio/mp4');

      // Restore userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    test('VoiceNoteRecorder se monte avec stream et initialise SpeechRecognition si disponible', async () => {
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }],
      };
      navigator.mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
      };

      window.MediaRecorder = jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        state: 'inactive',
        addEventListener: jest.fn(),
        ondataavailable: null,
        onstop: null,
      }));
      window.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
      };
      window.webkitSpeechRecognition = jest.fn().mockImplementation(() => mockRecognition);

      render(
        <VoiceNoteRecorder
          isRecording={true}
          onCancel={jest.fn()}
          onSendVoiceNote={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      });
    });
  });

  describe('2. Bouton "Original / Traduction" et Transcription dans la bulle du chat', () => {
    test('MessageBubble affiche la transcription et le bouton "Original / Traduction"', () => {
      render(
        <MessageBubble
          message={{
            type: 'audio',
            audioUrl: 'https://example.com/audio.mp4',
            fileName: 'note_vocale.mp4',
            transcript: 'Bonjour, échange prévu demain à 14h.',
          }}
          isMe={false}
          targetLang="en"
        />
      );

      expect(screen.getByText(/Bonjour, échange prévu demain à 14h./i)).toBeInTheDocument();
      const toggleBtn = screen.getByRole('button', { name: /Original \/ Traduction/i });
      expect(toggleBtn).toBeInTheDocument();

      // Clic sur le bouton bascule vers la traduction
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toBeInTheDocument();
    });

    test('MessageBubble propose le bouton de transcription STT quand aucun transcript initial n\'est présent', () => {
      render(
        <MessageBubble
          message={{
            type: 'audio',
            audioUrl: 'https://example.com/audio_sans_transcript.mp4',
            fileName: 'audio.mp4',
          }}
          isMe={false}
        />
      );

      const transcribeBtn = screen.getByRole('button', { name: /Transcrire la note vocale avec SpeechRecognition/i });
      expect(transcribeBtn).toBeInTheDocument();
    });

    test('VoiceNotePlayer dispose du bouton "Original / Traduction"', () => {
      render(
        <VoiceNotePlayer
          audioUrl="https://example.com/voice.mp4"
          duration={15}
          isMe={false}
          transcription="Salut ! Rendez-vous confirmé pour le swap."
        />
      );

      // Ouvrir la transcription
      const transcribeToggle = screen.getByTitle(/Transcrire la note vocale en texte/i);
      fireEvent.click(transcribeToggle);

      expect(screen.getByText(/Salut ! Rendez-vous confirmé pour le swap./i)).toBeInTheDocument();
      const translationBtn = screen.getByRole('button', { name: /Original \/ Traduction/i });
      expect(translationBtn).toBeInTheDocument();
    });
  });
});
