import logger from './utils/logger';
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithCustomToken as fbSignInWithCustomToken } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBOnQhKTdDRDtvmE4Fxd_KFxi8StFtQKTk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "troco-8a6eb.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "troco-8a6eb",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "troco-8a6eb.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "350561478350",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:350561478350:web:3f133b66b2d2863bfa529f",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-N0XT6XXYSZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');

// Initialisation sécurisée d'App Check (Web: reCAPTCHA v3, Dev: Debug token)
// DOIT impérativement précéder l'initialisation de Firestore pour attester les requêtes dès le premier handshake
export let appCheck = null;
const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY;

if (typeof window !== 'undefined') {
  const isDev = process.env.NODE_ENV !== 'production' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isDev) {
    // eslint-disable-next-line no-restricted-globals
    const globalContext = typeof self !== 'undefined' ? self : window;
    globalContext.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN || true;
  }

  if (recaptchaSiteKey) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      logger.info('[AppCheck] Firebase App Check initialisé avec succès.');
    } catch (err) {
      logger.warn('[AppCheck] Initialization error:', err);
    }
  }
}

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  logger.warn("Firestore persistentLocalCache unavailable, falling back to memory cache:", e);
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  } catch (_) {
    firestoreInstance = initializeFirestore(app, {});
  }
}

export const db = firestoreInstance;

// Connexion automatique aux émulateurs Firebase en local / E2E
const shouldUseEmulators = (
  process.env.REACT_APP_USE_EMULATORS === 'true' ||
  (typeof window !== 'undefined' && (
    window.__USE_FIREBASE_EMULATOR__ === true ||
    window.localStorage?.getItem('troco_use_emulator') === 'true'
  ))
);

if (shouldUseEmulators) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  } catch (_) {
    /* Émulateurs déjà connectés */
  }
}

if (typeof window !== 'undefined') {
  window.__firebaseAuth = auth;
  window.__firebaseDb = db;
  window.__firebaseStorage = storage;
  window.__firebaseFunctions = functions;
  window.__firebaseAppCheck = appCheck;
  window.__firebaseSignInWithCustomToken = (token) => fbSignInWithCustomToken(auth, token);

  // Auto signin si un custom token est stocké dans le localStorage
  const savedCustomToken = window.localStorage?.getItem('troco_custom_token');
  if (savedCustomToken && !auth.currentUser) {
    fbSignInWithCustomToken(auth, savedCustomToken).catch((err) => {
      logger.warn('[E2E Auth] Auto signin with custom token failed:', err);
    });
  }
}


