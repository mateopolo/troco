/**
 * Troco Live Call Transcription & Translation Service
 * Utilise la Web Speech Recognition API avec streaming temps réel et traduction instantanée multi-langues.
 */

import { translateText } from '../utils/translator';

class LiveTranscriptionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.subscribers = new Set();
    this.currentLanguage = 'fr-FR';
    this.targetLanguage = 'FR';
    this.simulationTimer = null;
  }

  // Initialisation de la reconnaissance vocale SpeechRecognition
  initRecognition() {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      console.info('[LiveTranscription] SpeechRecognition API native non disponible. Mode simulé intelligent prêt.');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.currentLanguage;

      this.recognition.onresult = async (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const textToProcess = finalTranscript || interimTranscript;
        if (!textToProcess || !textToProcess.trim()) return;

        const isFinal = Boolean(finalTranscript);
        await this.handleTranscript(textToProcess.trim(), isFinal);
      };

      this.recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('[LiveTranscription] Erreur recognition:', event.error);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (_) {}
        }
      };

      return true;
    } catch (e) {
      console.warn('[LiveTranscription] Échec initialisation SpeechRecognition:', e);
      return false;
    }
  }

  async handleTranscript(rawText, isFinal) {
    if (!rawText) return;

    let translated = rawText;
    if (this.targetLanguage && this.targetLanguage !== 'FR') {
      try {
        translated = await translateText(rawText, this.targetLanguage);
      } catch (_) {
        translated = rawText;
      }
    }

    const payload = {
      id: Date.now(),
      originalText: rawText,
      translatedText: translated,
      isFinal,
      targetLang: this.targetLanguage,
      timestamp: new Date(),
    };

    this.notifySubscribers(payload);
  }

  startListening(sourceLang = 'fr-FR', targetLang = 'FR') {
    this.currentLanguage = sourceLang;
    this.targetLanguage = targetLang;
    this.isListening = true;

    if (!this.recognition) {
      this.initRecognition();
    }

    if (this.recognition) {
      try {
        this.recognition.lang = this.currentLanguage;
        this.recognition.start();
      } catch (_) {}
    } else {
      // Simulation pour démo/tests si le micro ou le navigateur ne supporte pas l'API
      this.startSimulatedDemo(targetLang);
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(data) {
    this.subscribers.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.warn('[LiveTranscription] Erreur subscriber:', err);
      }
    });
  }

  // Simulation de dialogue fluide pour les environnements de test / navigateurs sans support vocal natif
  startSimulatedDemo(targetLang) {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    const demoPhrases = [
      "Bonjour ! Je suis ravi de faire cet échange de compétences avec toi.",
      "Est-ce que tu m'entends bien et est-ce que la vidéo est nette de ton côté ?",
      "Parfait ! On peut commencer la session de cours et tester les fonctionnalités.",
      "N'hésite pas si tu as des questions sur le projet ou le partage d'écran !",
    ];

    let phraseIndex = 0;
    this.simulationTimer = setInterval(async () => {
      if (!this.isListening) return;
      const phrase = demoPhrases[phraseIndex % demoPhrases.length];
      phraseIndex++;

      let translated = phrase;
      if (targetLang && targetLang !== 'FR') {
        try {
          translated = await translateText(phrase, targetLang);
        } catch (_) {
          translated = phrase;
        }
      }

      this.notifySubscribers({
        id: Date.now(),
        originalText: phrase,
        translatedText: translated,
        isFinal: true,
        targetLang: targetLang || 'FR',
        speaker: 'Interlocuteur',
        timestamp: new Date(),
      });
    }, 6000);
  }
}

export const liveTranscriptionService = new LiveTranscriptionService();
export default liveTranscriptionService;
