import { liveTranscriptionService } from './liveTranscriptionService';

describe('LiveTranscriptionService Privacy & Mute Enforcers', () => {
  let mockRecognitionInstance;

  beforeEach(() => {
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      lang: 'fr-FR',
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    };

    function MockSpeechRecognition() {
      return mockRecognitionInstance;
    }

    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    liveTranscriptionService.stopListening();
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    jest.clearAllMocks();
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

    mockRecognitionInstance.start.mockClear();

    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }

    expect(mockRecognitionInstance.start).not.toHaveBeenCalled();
  });

  test('3. onresult event discards any audio transcript when isMuted is true', async () => {
    const subscriber = jest.fn();
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

    expect(subscriber).not.toHaveBeenCalled();
  });

  test('4. Calling setMuted(false) resumes recognition.start() if listening was active', () => {
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
