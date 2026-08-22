import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

export const defaultProfile = {
  name: 'Alexandre Martin',
  email: 'alexandre@troco.fr',
  phone: '+33 6 12 34 56 78',
  avatar: '👨‍💼',
  photoUrl: '',
  bio: 'Passionné de bricolage, jardinage et cours de piano. Toujours prêt à donner un coup de main !',
  city: 'Paris (75011)',
  country: 'France',
  skills: ['Bricolage', 'Jardinage', 'Piano', 'Plomberie'],
  trocoTokens: 10,
  euroBalance: 25.00,
  dealsCompleted: 12,
  rating: 4.9,
  isPremium: false,
  cguAccepted: true,
  cguAcceptedAt: new Date().toISOString(),
  kycStatus: 'verified',
  kycDocType: 'id_card',
  kycSubmittedAt: new Date().toISOString(),
  kycVerifiedAt: new Date().toISOString(),
  portfolio: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&auto=format&fit=crop&q=80',
  ],
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_user_profile');
      return saved ? { ...defaultProfile, ...JSON.parse(saved) } : defaultProfile;
    } catch (_) {
      return defaultProfile;
    }
  });

  // Sauvegarde locale persistante du profil
  useEffect(() => {
    try {
      localStorage.setItem('troco_user_profile', JSON.stringify(profile));
    } catch (_) {}
  }, [profile]);

  // Écoute de l'état Firebase Auth et synchronisation Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setProfile(prev => ({
              ...prev,
              uid: user.uid,
              name: data.name || user.displayName || prev.name,
              email: data.email || user.email || prev.email,
              photoUrl: data.photoUrl || user.photoURL || prev.photoUrl,
              trocoTokens: data.trocoTokens !== undefined ? data.trocoTokens : prev.trocoTokens,
              euroBalance: data.euroBalance !== undefined ? data.euroBalance : prev.euroBalance,
              dealsCompleted: data.dealsCompleted !== undefined ? data.dealsCompleted : prev.dealsCompleted,
              kycStatus: data.kycStatus || prev.kycStatus,
              cguAccepted: data.cguAccepted !== undefined ? data.cguAccepted : prev.cguAccepted,
            }));
          } else {
            // Création du profil initial Firestore
            await setDoc(userRef, {
              uid: user.uid,
              name: user.displayName || profile.name,
              email: user.email || profile.email,
              photoUrl: user.photoURL || profile.photoUrl || '',
              trocoTokens: profile.trocoTokens,
              euroBalance: profile.euroBalance,
              dealsCompleted: profile.dealsCompleted,
              kycStatus: profile.kycStatus,
              cguAccepted: profile.cguAccepted,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }

          // Écoute en temps réel des changements de profil utilisateur
          const unsubProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const liveData = docSnap.data();
              setProfile(prev => ({
                ...prev,
                trocoTokens: liveData.trocoTokens !== undefined ? liveData.trocoTokens : prev.trocoTokens,
                euroBalance: liveData.euroBalance !== undefined ? liveData.euroBalance : prev.euroBalance,
                dealsCompleted: liveData.dealsCompleted !== undefined ? liveData.dealsCompleted : prev.dealsCompleted,
                kycStatus: liveData.kycStatus || prev.kycStatus,
                cguAccepted: liveData.cguAccepted !== undefined ? liveData.cguAccepted : prev.cguAccepted,
              }));
            }
          });

          setLoading(false);
          return () => unsubProfile();
        } catch (err) {
          console.warn('[AuthContext] sync error:', err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const signupWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const loginWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  const value = {
    currentUser,
    profile,
    setProfile,
    loading,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context || {};
}
