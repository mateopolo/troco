import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);
