import {
  HAPTIC_PATTERNS,
  isHapticSupported,
  triggerHaptic,
  hapticLight,
  hapticSuccess,
  hapticError,
} from './haptics';

describe('Phase 46 : Utilitaire Haptique & Vibration API', () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    // Restaurer window.navigator après chaque test
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  describe('Définition des Patterns de Vibration', () => {
    it('définit le pattern "light" à 15ms', () => {
      expect(HAPTIC_PATTERNS.light).toBe(15);
    });

    it('définit le pattern "success" à [20, 50, 20]', () => {
      expect(HAPTIC_PATTERNS.success).toEqual([20, 50, 20]);
    });

    it('définit le pattern "error" à [50, 50, 50]', () => {
      expect(HAPTIC_PATTERNS.error).toEqual([50, 50, 50]);
    });
  });

  describe('Support de l\'API Haptique (isHapticSupported)', () => {
    it('retourne true lorsque navigator.vibrate est une fonction', () => {
      const mockVibrate = jest.fn();
      Object.defineProperty(window, 'navigator', {
        value: { ...originalNavigator, vibrate: mockVibrate },
        writable: true,
        configurable: true,
      });

      expect(isHapticSupported()).toBe(true);
    });

    it('retourne false lorsque navigator.vibrate n\'existe pas', () => {
      Object.defineProperty(window, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isHapticSupported()).toBe(false);
    });
  });

  describe('Déclenchement Sécurisé des Vibrations (triggerHaptic & raccourcis)', () => {
    it('exécute navigator.vibrate avec le pattern "light" (15ms)', () => {
      const mockVibrate = jest.fn().mockReturnValue(true);
      Object.defineProperty(window, 'navigator', {
        value: { ...originalNavigator, vibrate: mockVibrate },
        writable: true,
        configurable: true,
      });

      const result = hapticLight();
      expect(mockVibrate).toHaveBeenCalledWith(15);
      expect(result).toBe(true);
    });

    it('exécute navigator.vibrate avec le pattern "success" ([20, 50, 20])', () => {
      const mockVibrate = jest.fn().mockReturnValue(true);
      Object.defineProperty(window, 'navigator', {
        value: { ...originalNavigator, vibrate: mockVibrate },
        writable: true,
        configurable: true,
      });

      const result = hapticSuccess();
      expect(mockVibrate).toHaveBeenCalledWith([20, 50, 20]);
      expect(result).toBe(true);
    });

    it('exécute navigator.vibrate avec le pattern "error" ([50, 50, 50])', () => {
      const mockVibrate = jest.fn().mockReturnValue(true);
      Object.defineProperty(window, 'navigator', {
        value: { ...originalNavigator, vibrate: mockVibrate },
        writable: true,
        configurable: true,
      });

      const result = hapticError();
      expect(mockVibrate).toHaveBeenCalledWith([50, 50, 50]);
      expect(result).toBe(true);
    });

    it('supporte les patterns numériques directs', () => {
      const mockVibrate = jest.fn().mockReturnValue(true);
      Object.defineProperty(window, 'navigator', {
        value: { ...originalNavigator, vibrate: mockVibrate },
        writable: true,
        configurable: true,
      });

      triggerHaptic([30, 20, 30]);
      expect(mockVibrate).toHaveBeenCalledWith([30, 20, 30]);
    });

    it('gère silencieusement l\'absence de support sans lever d\'erreur', () => {
      Object.defineProperty(window, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(() => {
        const res = triggerHaptic('success');
        expect(res).toBe(false);
      }).not.toThrow();
    });

    it('intercepte silencieusement les exceptions levées par navigator.vibrate', () => {
      const mockVibrate = jest.fn().mockImplementation(() => {
        throw new Error('NotAllowedError');
      });
      Object.defineProperty(window, 'navigator', {
        value: { ...originalNavigator, vibrate: mockVibrate },
        writable: true,
        configurable: true,
      });

      expect(() => {
        const res = triggerHaptic('light');
        expect(res).toBe(false);
      }).not.toThrow();
    });
  });
});
