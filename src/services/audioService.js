// ---- SYNTHÉTISEURS SONORES WEB AUDIO API (100% EMBARQUÉS - SINGLETON AUDIO CONTEXT) ----
let audioCtxInstance = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtxInstance || audioCtxInstance.state === 'closed') {
    audioCtxInstance = new AudioCtx();
  } else if (audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume();
  }
  return audioCtxInstance;
};

export const playApplePaySound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Double carillon cristallin style Apple Pay / iOS
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, now); // Note C6
    gain1.gain.setValueAtTime(0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2093.00, now + 0.07); // Note C7
    gain2.gain.setValueAtTime(0.55, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Web Audio Context désactivé ou non supporté', e);
  }
};

export const playBetclicBalanceSound = (isIncrease = false) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = isIncrease
      ? [523.25, 659.25, 783.99, 1046.50]
      : [1046.50, 880.00, 698.46, 523.25];

    freqs.forEach((freq, idx) => {
      const startTime = now + (idx * 0.065);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  } catch (e) {
    console.warn('Web Audio Context désactivé ou non supporté', e);
  }
};
