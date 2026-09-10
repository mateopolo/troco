/**
 * audioService.js
 * Moteur de Sound Design & Micro-Audio UI à 0ms de latence basé sur l'API Web Audio
 * 
 * - Synthèse sonore temps réel sans dépendance externe ni fichier réseau
 * - Profils sonores Apple-grade : Pop, Swoosh, Success-Chime
 * - Contrôle de volume maître (par défaut 20% / 0.20)
 * - Gestion automatique de la politique d'autoplay navigateur (resume on user gesture)
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.20; // 20% par défaut pour un feedback discret
    this.isEnabled = true;

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
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
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
      // Descente de fréquence rapide type bulle / pop
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('[AudioService] Pop playback error:', e);
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
      // Montée puis descente douce
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.14);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('[AudioService] Swoosh playback error:', e);
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
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('[AudioService] Success chime playback error:', e);
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
}

export const audioService = new AudioService();
export const playPop = () => audioService.playPop();
export const playSwoosh = () => audioService.playSwoosh();
export const playSuccessChime = () => audioService.playSuccessChime();
export const startRingtone = () => audioService.startRingtone();
export const stopRingtone = () => audioService.stopRingtone();

export default audioService;
