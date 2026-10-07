import logger from '../utils/logger';
import { registerAudioContext } from '../utils/audioUnlocker';

/**
 * audioService.js
 * Source Unique de Vérité — Moteur Audio & Sound Design UI (Web Audio API)
 * 
 * - Synthèse sonore temps réel à 0ms de latence, zéro dépendance réseau
 * - Profils sonores complets : Pop, Swoosh, Success-Chime, Sonnerie WebRTC, Apple Pay, Betclic, Fanfare
 * - Contrôle de volume maître (par défaut 20% / 0.20) et état muet persistant (localStorage)
 * - Gestion automatique de la politique d'autoplay navigateur via audioUnlocker
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.20; // 20% par défaut pour un feedback discret
    this.isEnabled = true;
    this.ringtoneInterval = null;

    if (typeof window !== 'undefined') {
      try {
        const savedVolume = localStorage.getItem('troco_sound_volume');
        if (savedVolume !== null) {
          const parsed = parseFloat(savedVolume);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.volume = parsed;
          }
        }
        const savedEnabled = localStorage.getItem('troco_sound_enabled');
        if (savedEnabled !== null) {
          this.isEnabled = savedEnabled === 'true';
        }
      } catch (_) {}
    }
  }

  /**
   * Initialisation fainéante (lazy) du contexte audio pour respecter les règles d'autoplay
   */
  initContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      registerAudioContext(this.ctx);
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Modifie le volume général (0.0 à 1.0)
   * @param {number} vol 
   */
  setMasterVolume(vol) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
    try {
      localStorage.setItem('troco_sound_volume', String(clamped));
    } catch (_) {}
  }

  /**
   * Active ou désactive le feedback sonore
   * @param {boolean} enabled 
   */
  setSoundEnabled(enabled) {
    this.isEnabled = Boolean(enabled);
    try {
      localStorage.setItem('troco_sound_enabled', String(this.isEnabled));
    } catch (_) {}
  }

  /**
   * Son 1 : POP (Envoi de message, like, tap léger)
   * Balayage rapide de fréquence avec enveloppe percussive ultra-courte (45ms)
   */
  playPop() {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      logger.warn('[AudioService] Pop playback error:', e);
    }
  }

  /**
   * Son 2 : SWOOSH (Ouverture de modale, Whiteboard, panel God Mode)
   * Balayage sinusoidal fluide avec enveloppe d'expansion spatiale (130ms)
   */
  playSwoosh() {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.14);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      logger.warn('[AudioService] Swoosh playback error:', e);
    }
  }

  /**
   * Son 3 : SUCCESS-CHIME (Validation d'offre, deal conclu, paiement réussi)
   * Accord cristallin ascendant à 3 harmoniques (C5 -> E5 -> G5)
   */
  playSuccessChime() {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const frequencies = [523.25, 659.25, 783.99]; // Do5, Mi5, Sol5
      const delays = [0, 0.06, 0.12];

      frequencies.forEach((freq, idx) => {
        const startTime = now + delays[idx];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.55, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain || ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      logger.warn('[AudioService] Success chime playback error:', e);
    }
  }

  /**
   * Son 4 : RINGTONE (Sonnerie d'appel téléphonique entrante / sortante)
   * Double tonalité 440Hz + 480Hz avec récurrence toutes les 3.2s et gestion autoplay
   */
  startRingtone() {
    this.stopRingtone();
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const ring = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      try {
        const now = this.ctx.currentTime;
        const playTone = (freq, startOffset, duration) => {
          try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + startOffset);
            gain.gain.setValueAtTime(0.001, now + startOffset);
            gain.gain.linearRampToValueAtTime(0.3, now + startOffset + 0.05);
            gain.gain.setValueAtTime(0.3, now + startOffset + duration - 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);
            osc.start(now + startOffset);
            osc.stop(now + startOffset + duration + 0.05);
          } catch (_) {}
        };

        // Double fréquence téléphonique 440Hz + 480Hz pendant 1.2s
        playTone(440, 0, 1.2);
        playTone(480, 0, 1.2);
      } catch (_) {}
    };

    ring();
    this.ringtoneInterval = setInterval(ring, 3200);
  }

  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  /**
   * Son 5 : Double carillon cristallin style Apple Pay / iOS
   */
  playApplePaySound() {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, now); // C6
      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.masterGain || ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2093.00, now + 0.07); // C7
      gain2.gain.setValueAtTime(0.55, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(this.masterGain || ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.5);
    } catch (e) {
      logger.warn('[AudioService] Apple Pay sound error:', e);
    }
  }

  /**
   * Son 6 : Son d'incrément ou décrément de solde (style Betclic)
   */
  playBetclicBalanceSound(isIncrease = false) {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const freqs = isIncrease
        ? [523.25, 659.25, 783.99, 1046.50]
        : [1046.50, 880.00, 698.46, 523.25];

      freqs.forEach((freq, idx) => {
        const startTime = ctx.currentTime + (idx * 0.065);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain || ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.12);
      });
    } catch (e) {
      logger.warn('[AudioService] Betclic balance sound error:', e);
    }
  }

  /**
   * Son 7 : Fanfare de célébration cadeau de bienvenue
   */
  playWelcomeGiftFanfare() {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const notes = [
        { f: 523.25, t: 0.00, d: 0.15 },  // C5
        { f: 659.25, t: 0.12, d: 0.15 },  // E5
        { f: 783.99, t: 0.24, d: 0.18 },  // G5
        { f: 1046.50, t: 0.38, d: 0.45 }, // C6
        { f: 1318.51, t: 0.55, d: 0.60 }, // E6
      ];

      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
        osc.connect(gain);
        gain.connect(this.masterGain || ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });
    } catch (e) {
      logger.warn('[AudioService] Welcome fanfare error:', e);
    }
  }

  /**
   * Son 8 : Son swoosh aérien discret pour l'envoi de jetons / messages (expéditeur)
   */
  playSwooshSound() {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      logger.warn('[AudioService] Swoosh sound error:', e);
    }
  }

  /**
   * Son 9 : Son de démarrage Splash Screen CRT rétro (accord Do-Mi-Sol + souffle 1-bit)
   * Durée totale : 1.2s. Retourne une Promise résolue après 1.2s.
   * @returns {Promise<void>}
   */
  playSplashSound() {
    return new Promise((resolve) => {
      const fallbackTimer = setTimeout(resolve, 1200);

      if (!this.isEnabled) {
        clearTimeout(fallbackTimer);
        resolve();
        return;
      }

      const ctx = this.initContext();
      if (!ctx) {
        clearTimeout(fallbackTimer);
        resolve();
        return;
      }

      try {
        const now = ctx.currentTime;

        // 1. Souffle blanc CRT rétro (200ms à faible gain 0.03)
        try {
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.2));
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const channelData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            channelData[i] = Math.random() * 2 - 1;
          }
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.03, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          noiseSource.connect(noiseGain);
          noiseGain.connect(this.masterGain || ctx.destination);
          noiseSource.start(now);
          noiseSource.stop(now + 0.2);
        } catch (_) {}

        // 2. Trois oscillateurs sine : 523.25 Hz, 659.25 Hz, 783.99 Hz (Do-Mi-Sol)
        const chord = [
          { freq: 523.25, gain: 0.15, delay: 0.00 },
          { freq: 659.25, gain: 0.12, delay: 0.08 },
          { freq: 783.99, gain: 0.10, delay: 0.16 },
        ];

        chord.forEach(({ freq, gain: initGain, delay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + delay;
          const stopTime = startTime + 0.8;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(initGain, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, stopTime);

          osc.connect(gain);
          gain.connect(this.masterGain || ctx.destination);

          osc.start(startTime);
          osc.stop(stopTime);
        });
      } catch (e) {
        logger.warn('[AudioService] Splash sound error:', e);
      }
    });
  }
}

// Instance singleton principale
export const audioService = new AudioService();

// Exportations individuelles directes
export const playPop = () => audioService.playPop();
export const playSwoosh = () => audioService.playSwoosh();
export const playSuccessChime = () => audioService.playSuccessChime();
export const startRingtone = () => audioService.startRingtone();
export const stopRingtone = () => audioService.stopRingtone();
export const playApplePaySound = () => audioService.playApplePaySound();
export const playBetclicBalanceSound = (isIncrease = false) => audioService.playBetclicBalanceSound(isIncrease);
export const playWelcomeGiftFanfare = () => audioService.playWelcomeGiftFanfare();
export const playSwooshSound = () => audioService.playSwooshSound();
export const playSplashSound = () => audioService.playSplashSound();

export { AudioService };
export default audioService;
