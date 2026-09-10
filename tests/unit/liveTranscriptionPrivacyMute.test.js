import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { liveTranscriptionService } from '../../src/services/liveTranscriptionService';

describe('LiveTranscriptionService Privacy & Mute Enforcers', () => {
  let mockRecognitionInstance;

  beforeEach(() => {
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      lang: 'fr-FR',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    };

    function MockSpeechRecognition() {
      return mockRecognitionInstance;
    }

    if (typeof globalThis.window === 'undefined') {
      globalThis.window = globalThis;
    }
    globalThis.window.SpeechRecognition = MockSpeechRecognition;
    globalThis.window.webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    liveTranscriptionService.stopListening();
    if (globalThis.window) {
      delete globalThis.window.SpeechRecognition;
      delete globalThis.window.webkitSpeechRecognition;
    }
    vi.clearAllMocks();
  });

  test('1. Calling setMuted(true) strictly calls recognition.stop() and sets isMuted flag', () => {
    liveTranscriptionService.startListening('fr-FR', 'EN', 'Alice');
    expect(mockRecognitionInstance.start).toHaveBeenCalled();

    liveTranscriptionService.setMuted(true);
    expect(liveTranscriptionService.isMuted).toBe(true);
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
  });

  test('2. onend event does NOT restart recognition when isMuted is true', () => {
    liveTranscriptionService.startListening('fr-FR', 'EN', 'Alice');
    liveTranscriptionService.setMuted(true);

    // Clear start mock calls
    mockRecognitionInstance.start.mockClear();

    // Trigger onend while muted
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }

    // Must NOT restart!
    expect(mockRecognitionInstance.start).not.toHaveBeenCalled();
  });

  test('3. onresult event discards any audio transcript when isMuted is true', async () => {
    const subscriber = vi.fn();
    liveTranscriptionService.subscribe(subscriber);

    liveTranscriptionService.startListening('fr-FR', 'EN', 'Alice');
    liveTranscriptionService.setMuted(true);

    const fakeResultEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'Phrase secrète confidentielle' }],
      ],
    };
    fakeResultEvent.results[0].isFinal = true;

    if (mockRecognitionInstance.onresult) {
      await mockRecognitionInstance.onresult(fakeResultEvent);
    }

    // Subscriber must never be notified when muted
    expect(subscriber).not.toHaveBeenCalled();
  });

  test('4. Calling setMuted(false) resumes recognition if listening was active', () => {
    liveTranscriptionService.startListening('fr-FR', 'EN', 'Alice');
    liveTranscriptionService.setMuted(true);

    mockRecognitionInstance.start.mockClear();

    liveTranscriptionService.setMuted(false);
    expect(liveTranscriptionService.isMuted).toBe(false);
    expect(mockRecognitionInstance.start).toHaveBeenCalled();
  });

  test('5. Calling stopListening() completely halts and resets mute state', () => {
    liveTranscriptionService.startListening('fr-FR', 'EN', 'Alice');
    liveTranscriptionService.setMuted(true);
    expect(liveTranscriptionService.isMuted).toBe(true);

    liveTranscriptionService.stopListening();
    expect(liveTranscriptionService.isListening).toBe(false);
    expect(liveTranscriptionService.isMuted).toBe(false);
  });
});
