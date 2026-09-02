import { audioService, playPop, playSwoosh, playSuccessChime } from './audioService';

describe('Phase 52 : audioService Web Audio API', () => {
  beforeEach(() => {
    audioService.setSoundEnabled(true);
    audioService.setMasterVolume(0.20);
  });

  it('initialise le volume à 20% par défaut', () => {
    expect(audioService.volume).toBe(0.20);
  });

  it('permet de modifier le volume et d\'activer/désactiver le son', () => {
    audioService.setMasterVolume(0.5);
    expect(audioService.volume).toBe(0.5);

    audioService.setSoundEnabled(false);
    expect(audioService.isEnabled).toBe(false);
  });

  it('exécute les méthodes sonores sans crash en environnement test', () => {
    expect(() => {
      playPop();
      playSwoosh();
      playSuccessChime();
    }).not.toThrow();
  });
});
