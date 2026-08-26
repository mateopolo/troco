/**
 * Troco Live Call Transcription & Translation Service
 * Utilise la Web Speech Recognition API avec streaming temps réel et traduction instantanée multi-langues.
 */

import { translateText } from '../utils/translator';

const BCP47_MAP = {
  FR: 'fr-FR',
  EN: 'en-US',
  ES: 'es-ES',
  IT: 'it-IT',
  DE: 'de-DE',
  JA: 'ja-JP',
  ZH: 'zh-CN',
  PT: 'pt-PT',
  AR: 'ar-SA',
  RU: 'ru-RU',
};

class LiveTranscriptionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.subscribers = new Set();
    this.sourceLanguage = 'fr-FR';
    this.targetLanguage = 'FR';
    this.speakerName = 'Interlocuteur';
    this.simulationTimer = null;
  }

  // Initialisation de la reconnaissance vocale SpeechRecognition
  initRecognition() {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      console.info('[LiveTranscription] SpeechRecognition API native non disponible. Mode simulé intelligent activé.');
      return false;
    }

    try {
      if (this.recognition) {
        try { this.recognition.abort(); } catch (_) {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.sourceLanguage;

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

        const textToProcess = (finalTranscript || interimTranscript).trim();
        if (!textToProcess) return;

        const isFinal = Boolean(finalTranscript);
        await this.handleTranscript(textToProcess, isFinal);
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
    if (!rawText || !rawText.trim()) return;

    const trimmed = rawText.trim();
    const sourceCode = (this.sourceLanguage || 'fr-FR').split('-')[0].toUpperCase();
    const targetCode = (this.targetLanguage || 'FR').toUpperCase();

    let translated = trimmed;

    // Si la langue source et la langue cible diffèrent, on effectue la traduction instantanée
    if (sourceCode !== targetCode) {
      try {
        translated = await translateText(trimmed, targetCode, sourceCode.toLowerCase());
      } catch (err) {
        console.warn('[LiveTranscription] Erreur traduction:', err);
        translated = trimmed;
      }
    }

    const payload = {
      id: Date.now(),
      originalText: trimmed,
      translatedText: translated || trimmed,
      isFinal,
      sourceLang: sourceCode,
      targetLang: targetCode,
      speaker: this.speakerName,
      timestamp: new Date(),
    };

    this.notifySubscribers(payload);
  }

  startListening(sourceLang = 'fr-FR', targetLang = 'FR', speakerName = 'Interlocuteur') {
    // Résolution BCP47
    const resolvedSourceBcp = BCP47_MAP[sourceLang?.toUpperCase()] || sourceLang || 'fr-FR';
    const resolvedTargetCode = (targetLang || 'FR').toUpperCase();

    this.sourceLanguage = resolvedSourceBcp;
    this.targetLanguage = resolvedTargetCode;
    this.speakerName = speakerName;
    this.isListening = true;

    // Arrêter la simulation précédente s'il y en a une
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }

    const hasNativeSupport = this.initRecognition();

    if (hasNativeSupport && this.recognition) {
      try {
        this.recognition.lang = this.sourceLanguage;
        this.recognition.start();
      } catch (err) {
        console.debug('[LiveTranscription] SpeechRecognition start warning:', err);
      }
    } else {
      // Démarrage de la simulation contextuelle bilingue
      this.startSimulatedDemo(resolvedSourceBcp, resolvedTargetCode);
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

  // Simulation intelligente multi-langues pour démo et navigateurs sans micro
  startSimulatedDemo(sourceBcp = 'fr-FR', targetLang = 'FR') {
    const sourceCode = (sourceBcp || 'fr').split('-')[0].toLowerCase();
    const targetCode = (targetLang || 'fr').toLowerCase();

    const sampleDialogs = {
      fr: [
        "Bonjour ! Ravi de te retrouver pour cet échange de compétences sur Troco.",
        "Je te propose qu'on commence par définir les étapes de notre session d'apprentissage.",
        "Parfait, tout me paraît très clair. Nous pouvons valider les termes du deal.",
        "Merci beaucoup pour ton aide précieuse, je te valide la rétribution immédiatement !",
      ],
      en: [
        "Hello! Great to connect with you for this skill exchange on Troco.",
        "I suggest we start by going over the main goals of our collaborative session.",
        "Everything looks crystal clear. We can proceed with the smart escrow deal.",
        "Thank you so much for your time and expertise, releasing the token reward now!",
      ],
      es: [
        "¡Hola! Un placer conectar contigo para este intercambio en Troco.",
        "Te propongo empezar repasando los objetivos de nuestra sesión de trabajo.",
        "Perfecto, todo queda muy claro. Podemos confirmar el acuerdo de intercambio.",
        "¡Muchísimas gracias por tu ayuda! Te transfiero los tokens ahora mismo.",
      ],
      de: [
        "Hallo! Freut mich sehr, mich mit dir für diesen Kompetenzaustausch auf Troco zu treffen.",
        "Ich schlage vor, dass wir mit den Hauptschritten unserer Sitzung beginnen.",
        "Alles ist sehr klar. Wir können die Vereinbarung jetzt bestätigen.",
        "Vielen Dank für deine Unterstützung, ich übertrage die Tokens sofort!",
      ],
      it: [
        "Ciao! È un piacere fare questo scambio di competenze su Troco.",
        "Propongo di iniziare definendo i punti chiave della nostra collaborazione.",
        "Perfetto, tutto è chiarissimo. Possiamo confermare i termini dell'accordo.",
        "Grazie mille per il tuo aiuto, confermo il rilascio dei gettoni subito!",
      ],
    };

    const phrases = sampleDialogs[sourceCode] || sampleDialogs.fr;
    let step = 0;

    this.simulationTimer = setInterval(async () => {
      if (!this.isListening) return;
      const currentPhrase = phrases[step % phrases.length];
      step++;

      let translated = currentPhrase;
      if (sourceCode.toUpperCase() !== targetCode.toUpperCase()) {
        try {
          translated = await translateText(currentPhrase, targetCode.toUpperCase(), sourceCode);
        } catch (_) {
          translated = currentPhrase;
        }
      }

      this.notifySubscribers({
        id: Date.now(),
        originalText: currentPhrase,
        translatedText: translated || currentPhrase,
        isFinal: true,
        sourceLang: sourceCode.toUpperCase(),
        targetLang: targetCode.toUpperCase(),
        speaker: this.speakerName,
        timestamp: new Date(),
      });
    }, 5500);
  }
}

export const liveTranscriptionService = new LiveTranscriptionService();
