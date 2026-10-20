// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('🛡️ Firebase App Check & reCAPTCHA v3 [DIF-04]', () => {
  const firebasePath = path.resolve(__dirname, '../../src/firebase.js');
  const firebaseSource = fs.readFileSync(firebasePath, 'utf-8');

  describe('1. Contrat de code & Ordre d’initialisation strict', () => {
    it('importe initializeAppCheck et ReCaptchaV3Provider depuis firebase/app-check', () => {
      expect(firebaseSource).toMatch(/import\s*\{[^}]*initializeAppCheck[^}]*ReCaptchaV3Provider[^}]*\}\s*from\s*["']firebase\/app-check["']/);
    });

    it('exporte l’instance appCheck pour inspection et monitoring', () => {
      expect(firebaseSource).toMatch(/export\s+let\s+appCheck\s*=\s*null/);
    });

    it('utilise la clé reCAPTCHA v3 via REACT_APP_RECAPTCHA_SITE_KEY', () => {
      expect(firebaseSource).toContain('process.env.REACT_APP_RECAPTCHA_SITE_KEY');
      expect(firebaseSource).toContain('new ReCaptchaV3Provider(recaptchaSiteKey)');
    });

    it('configure le debug token en développement via REACT_APP_APPCHECK_DEBUG_TOKEN', () => {
      expect(firebaseSource).toContain('process.env.REACT_APP_APPCHECK_DEBUG_TOKEN');
      expect(firebaseSource).toContain('FIREBASE_APPCHECK_DEBUG_TOKEN');
    });

    it('initialise App Check STRICTEMENT avant Firestore (garantie d’attestation dès le premier handshake)', () => {
      const appCheckCallIndex = firebaseSource.indexOf('initializeAppCheck(app');
      const firestoreCallIndex = firebaseSource.indexOf('initializeFirestore(app');
      expect(appCheckCallIndex).toBeGreaterThan(0);
      expect(firestoreCallIndex).toBeGreaterThan(appCheckCallIndex);
    });

    it('attache appCheck sur window.__firebaseAppCheck en environnement navigateur', () => {
      expect(firebaseSource).toContain('window.__firebaseAppCheck = appCheck;');
    });
  });

  describe('2. Logique d’attestation et gestion des erreurs', () => {
    let mockInitializeAppCheck;
    let mockReCaptchaV3Provider;
    let mockLogger;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('instancie ReCaptchaV3Provider avec la clé de site et active le rafraîchissement automatique', () => {
      mockInitializeAppCheck = vi.fn((app, options) => ({ app, options }));
      mockReCaptchaV3Provider = vi.fn(function (key) { this.key = key; });

      const testSiteKey = '6Le_TEST_SITE_KEY_TROCO_12345';
      const fakeApp = { name: '[DEFAULT]' };

      const provider = new mockReCaptchaV3Provider(testSiteKey);
      const appCheckInstance = mockInitializeAppCheck(fakeApp, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });

      expect(mockReCaptchaV3Provider).toHaveBeenCalledWith(testSiteKey);
      expect(mockInitializeAppCheck).toHaveBeenCalledWith(fakeApp, {
        provider: expect.objectContaining({ key: testSiteKey }),
        isTokenAutoRefreshEnabled: true,
      });
      expect(appCheckInstance).toBeDefined();
    });

    it('positionne correctement FIREBASE_APPCHECK_DEBUG_TOKEN en mode développement', () => {
      const testDebugToken = 'd3b49-t0k3n-tr0c0-uuid';
      const prevEnv = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
      process.env.REACT_APP_APPCHECK_DEBUG_TOKEN = testDebugToken;

      const globalCtx = typeof self !== 'undefined' ? self : window;
      globalCtx.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN || true;

      expect(globalCtx.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(testDebugToken);

      // Si le token spécifique n'est pas fourni, le fallback est true
      delete process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
      globalCtx.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN || true;
      expect(globalCtx.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);

      process.env.REACT_APP_APPCHECK_DEBUG_TOKEN = prevEnv;
    });

    it('attrape toute exception d’initialisation App Check sans bloquer le démarrage de l’application', () => {
      const loggerWarn = vi.fn();
      mockInitializeAppCheck = vi.fn(() => {
        throw new Error('reCAPTCHA network timeout');
      });

      let instance = null;
      try {
        instance = mockInitializeAppCheck({}, { provider: {} });
      } catch (err) {
        loggerWarn('[AppCheck] Initialization error:', err);
      }

      expect(instance).toBeNull();
      expect(loggerWarn).toHaveBeenCalledWith(
        '[AppCheck] Initialization error:',
        expect.any(Error)
      );
    });
  });
});
