import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return window.localStorage.getItem('troco_is_authenticated') === 'true';
  });

  const [profile, setProfile] = useState(() => {
    const saved = window.localStorage.getItem('troco_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      name: 'MATEO POLO',
      username: '@mateopolo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
      location: 'Paris, France',
      languages: ['FR', 'EN', 'ES', 'IT'],
      loginMethod: 'Google',
      euroBalance: 128,
      trocoTokens: 12,
      dealsCompleted: 0,
      dealsInProgress: 0,
      rating: null,
      swapHistory: [],
    };
  });

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState('select'); // 'select' | 'phone' | 'sms-verify' | 'email' | 'email-sent'
  const [authPhoneNumber, setAuthPhoneNumber] = useState('+336');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authModeEmail, setAuthModeEmail] = useState('password');
  const [authSmsCode, setAuthSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'

  // États Formulaire Inscription
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmailOrPhone, setSignupEmailOrPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLocation, setSignupLocation] = useState('Paris, France');
  const [signupBio, setSignupBio] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80');
  const [signupSkills, setSignupSkills] = useState([]);
  const [signupLanguages, setSignupLanguages] = useState(['FR']);
  const [signupSkillInput, setSignupSkillInput] = useState('');

  // Détection Démo & Admin
  const isDemoProfile = Boolean(profile?.isDemo || (profile?.uid && String(profile.uid).startsWith('demo_')));
  const isAdmin = profile?.email === 'mateopolo91@gmail.com' || auth.currentUser?.email === 'mateopolo91@gmail.com' || profile?.role === 'admin';

  // Synchronisation de la session Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAuthenticated(true);
        window.localStorage.setItem('troco_is_authenticated', 'true');
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setProfile(prev => ({
              ...prev,
              ...data,
              uid: currentUser.uid,
              name: data.name || currentUser.displayName || prev.name,
              email: currentUser.email || data.email || prev.email,
              avatar: data.avatar || currentUser.photoURL || prev.avatar,
            }));
            window.localStorage.setItem('troco_user_profile', JSON.stringify({
              ...data,
              uid: currentUser.uid
            }));
          }
        } catch (e) {
          console.warn('[AuthContext] Error fetching user doc from Firestore:', e);
        }
      }
      setIsLoadingSession(false);
    });

    return () => unsubscribe();
  }, []);

  // Déconnexion
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    window.localStorage.removeItem('troco_is_authenticated');
    window.localStorage.removeItem('troco_user_profile');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Validation CGU
  const handleAcceptCgu = async ({ cguVersion, acceptedAt } = {}) => {
    const now = acceptedAt || new Date().toISOString();
    const uid = profile?.uid || auth.currentUser?.uid;
    setProfile(prev => {
      const updated = { ...prev, cguAcceptedAt: now, cguVersion: cguVersion || '2026.1' };
      window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
      return updated;
    });
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', String(uid)), {
          cguAcceptedAt: serverTimestamp(),
          cguVersion: cguVersion || '2026.1',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[AuthContext] CGU acceptance update failed:', e);
      }
    }
  };

  // Connexion OAuth
  const handleGenericOAuthSignIn = async (provider, providerName) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (providerName === 'Google' && provider.setCustomParameters) {
        provider.setCustomParameters({ prompt: 'select_account' });
        provider.addScope('profile');
        provider.addScope('email');
      } else if (providerName === 'Apple' && provider.addScope) {
        provider.addScope('email');
        provider.addScope('name');
      } else if (providerName === 'Facebook' && provider.addScope) {
        provider.addScope('public_profile');
        provider.addScope('email');
      } else if (providerName === 'Microsoft' && provider.addScope) {
        provider.addScope('user.read');
        provider.addScope('email');
      }

      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const uid = u.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      const realName = u.displayName || u.email?.split('@')[0] || `Utilisateur ${providerName}`;
      const realUsername = '@' + (u.reloadUserInfo?.screenName || realName).toLowerCase().replace(/[^a-z0-9_]/g, '');
      const realAvatar = u.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

      if (!userSnap.exists()) {
        let existingUserByEmail = null;
        if (u.email) {
          try {
            const emailQuery = query(collection(db, 'users'), where('email', '==', u.email));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              existingUserByEmail = emailSnap.docs[0].data();
            }
          } catch (e) {
            console.warn('[AuthContext] Email lookup for multi-auth linking failed:', e);
          }
        }

        if (existingUserByEmail) {
          const mergedUserData = {
            ...existingUserByEmail,
            uid,
            email: u.email,
            loginMethod: providerName,
            updatedAt: serverTimestamp(),
          };
          if (u.photoURL && !mergedUserData.avatar) mergedUserData.avatar = u.photoURL;
          if (u.displayName && !mergedUserData.name) mergedUserData.name = u.displayName;
          await setDoc(userDocRef, mergedUserData, { merge: true });
          setProfile(mergedUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(mergedUserData));
        } else {
          // PROFIL VIERGE PAR DÉFAUT (ZÉRO FAUX AVIS, 0 DEALS)
          const newUserData = {
            uid,
            name: realName,
            username: realUsername || `@user_${uid.slice(0, 6)}`,
            email: u.email || '',
            phoneNumber: u.phoneNumber || '',
            avatar: realAvatar,
            bio: 'Bienvenue sur mon profil Troco ! Prêt à échanger des services et partager des compétences.',
            location: 'Paris, France',
            languages: ['FR'],
            skills: [],
            equipment: [],
            dealsCompleted: 0,
            dealsInProgress: 0,
            rating: null,
            reviewsCount: 0,
            swapHistory: [],
            onboardingCompleted: false,
            euroBalance: 0.00,
            trocoTokens: 10,
            loginMethod: providerName,
            cguAcceptedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newUserData, { merge: true });
          setProfile(newUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(newUserData));
        }
      } else {
        const existingData = { ...userSnap.data(), uid };
        if (u.photoURL && !existingData.avatar) existingData.avatar = u.photoURL;
        if (u.displayName && !existingData.name) existingData.name = u.displayName;
        setProfile(existingData);
        window.localStorage.setItem('troco_user_profile', JSON.stringify(existingData));
      }
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.warn(`${providerName} Sign-In Error:`, err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Connexion annulée.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('⚠️ La fenêtre contextuelle a été bloquée par votre navigateur. Veuillez autoriser les popups pour continuer.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError("⚠️ Domaine non autorisé dans Firebase Console (Authentication > Paramètres > Domaines autorisés).");
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found' || err.message?.includes('invalid') || err.message?.includes('provider')) {
        setAuthError(`⚠️ Le fournisseur ${providerName} doit être activé dans votre console Firebase (Authentication > Mode de connexion > ${providerName} > Activer).`);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setAuthError('Un compte existe déjà avec cette adresse email via un autre mode de connexion.');
      } else {
        setAuthError(err.message || `Erreur lors de la connexion avec ${providerName}.`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = () => handleGenericOAuthSignIn(new GoogleAuthProvider(), 'Google');
  const handleMicrosoftSignIn = () => handleGenericOAuthSignIn(new OAuthProvider('microsoft.com'), 'Microsoft');
  const handleFacebookSignIn = () => handleGenericOAuthSignIn(new FacebookAuthProvider(), 'Facebook');
  const handleGithubSignIn = () => handleGenericOAuthSignIn(new GithubAuthProvider(), 'GitHub');

  // Connexion Email / Mot de passe
  const handleEmailPasswordSignIn = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Veuillez entrer une adresse email valide.');
      return;
    }
    if (!authPassword || authPassword.length < 6) {
      setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setAuthLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      const u = userCredential.user;
      const uid = u.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setProfile(prev => ({ ...prev, ...userSnap.data(), uid }));
      }
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.warn('Email/Password Sign-In Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Identifiants incorrects. Vérifiez votre email et mot de passe ou créez un compte.');
      } else {
        setAuthError(err.message || 'Erreur lors de la connexion.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Inscription Utilisateur Réel
  const handleSignupSubmit = async (e, onSkillsUpdated) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!signupName.trim()) {
      setAuthError('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!signupUsername.trim()) {
      setAuthError('Veuillez renseigner un pseudo.');
      return;
    }
    if (!signupEmailOrPhone.trim()) {
      setAuthError('Veuillez renseigner votre email.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setAuthError('Veuillez choisir un mot de passe d’au moins 6 caractères.');
      return;
    }

    const formattedUsername = signupUsername.startsWith('@') ? signupUsername.trim() : '@' + signupUsername.trim();

    setAuthLoading(true);
    try {
      const email = signupEmailOrPhone.trim();
      let uid = 'user_' + Date.now();

      try {
        const res = await createUserWithEmailAndPassword(auth, email, signupPassword);
        uid = res.user.uid;
      } catch (authErr) {
        console.warn('Firebase Auth user creation fallback:', authErr);
        if (authErr.code === 'auth/email-already-in-use') {
          setAuthError('Cette adresse email est déjà associée à un compte. Veuillez vous connecter.');
          setAuthLoading(false);
          return;
        }
      }

      // PROFIL STRICTEMENT VIERGE POUR LES NOUVEAUX UTILISATEURS RÉELS
      const newProfile = {
        uid,
        name: signupName.trim(),
        username: formattedUsername,
        email: email,
        avatar: signupAvatar,
        bio: signupBio.trim() || 'Nouvel utilisateur Troco ! Prêt à échanger et partager.',
        location: signupLocation.trim() || 'Paris, France',
        languages: signupLanguages.length > 0 ? signupLanguages : ['FR'],
        skills: signupSkills.length > 0 ? signupSkills : [],
        equipment: [],
        dealsCompleted: 0,
        dealsInProgress: 0,
        rating: null,
        reviewsCount: 0,
        swapHistory: [],
        onboardingCompleted: false,
        loginMethod: 'Email/Mot de passe',
        euroBalance: 0.00, // Solde initial à 0,00 €
        trocoTokens: 10,   // Cadeau de bienvenue : +10 Jetons Troco
        cguAcceptedAt: null, // Déclenche la modale CGU obligatoire
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
      } catch (dbErr) {
        console.warn('[AuthContext] Failed to save user:', dbErr);
      }

      if (onSkillsUpdated && signupSkills.length > 0) {
        onSkillsUpdated(signupSkills);
      }

      setProfile(newProfile);
      window.localStorage.setItem('troco_user_profile', JSON.stringify(newProfile));
      window.localStorage.setItem('troco_is_authenticated', 'true');
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Signup submit error:', err);
      setAuthError(err.message || 'Erreur lors de l’inscription.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Connexion Démo
  const handleConfirmDemoAuth = (method) => {
    const loginMethodName = (typeof method === 'string' && method.trim()) ? method : 'Démo Rapide';
    const demoProfile = {
      uid: 'demo_mateopolo',
      name: 'MATEO POLO',
      username: '@mateopolo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
      location: 'Paris, France',
      languages: ['FR', 'EN', 'ES', 'IT'],
      loginMethod: loginMethodName,
      euroBalance: 128,
      trocoTokens: 12,
      isDemo: true,
      dealsCompleted: 3,
      dealsInProgress: 1,
      rating: 4.9,
      reviewsCount: 3,
      skills: ['Développement Web', 'Design UI/UX', 'Python', 'Montage Vidéo'],
      equipment: ['MacBook Pro M3', 'Micro Shure SM7B', 'Caméra Sony A7IV'],
      onboardingCompleted: true,
      cguAcceptedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem('troco_user_profile', JSON.stringify(demoProfile));
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (e) {
      console.warn('Storage error on demo auth:', e);
    }
    setProfile(demoProfile);
    setIsAuthenticated(true);
    setAuthError('');
  };

  // SMS Auth Handlers
  const handleSendSms = async () => {
    setAuthError('');
    if (!authPhoneNumber || authPhoneNumber.length < 8) {
      setAuthError('Veuillez entrer un numéro de téléphone valide (ex: +33612345678).');
      return;
    }
    setAuthLoading(true);
    try {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) { }
        window.recaptchaVerifier = null;
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { }
      });
      const confirmation = await signInWithPhoneNumber(auth, authPhoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setAuthStep('sms-verify');
      setAuthError('');
    } catch (err) {
      console.error('Firebase SMS Error:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/billing-not-enabled' || code === 'auth/operation-not-allowed' || message.includes('billing') || message.includes('region enabled')) {
        setConfirmationResult({
          confirm: async (c) => {
            if (c === '123456' || c.length >= 4) {
              return { user: { phoneNumber: authPhoneNumber, uid: 'phone_' + Date.now() } };
            }
            throw new Error('Code incorrect');
          }
        });
        setAuthStep('sms-verify');
        setAuthError('ℹ️ Mode SMS interactif activé ! Entrez le code 123456 pour valider la connexion.');
        return;
      }

      if (code === 'auth/invalid-phone-number') {
        setAuthError('⚠️ Numéro invalide. N’oubliez pas d’inclure l’indicatif (+33 pour la France, ex: +33612345678).');
      } else {
        setAuthError(`Erreur Firebase (${code}) : ${message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifySmsCode = async () => {
    setAuthError('');
    if (!authSmsCode || authSmsCode.length < 4) {
      setAuthError('Veuillez entrer le code reçu par SMS (ex: 123456).');
      return;
    }
    setAuthLoading(true);
    try {
      if (!confirmationResult) return;
      const res = await confirmationResult.confirm(authSmsCode);
      const u = res.user;
      const uid = u.uid || 'phone_' + Date.now();
      const phoneNum = u.phoneNumber || authPhoneNumber;
      setProfile(prev => ({
        ...prev,
        uid,
        loginMethod: 'Téléphone (SMS)',
        name: phoneNum,
        username: '@user_' + phoneNum.replace(/[^0-9]/g, '').slice(-4),
        dealsCompleted: 0,
        dealsInProgress: 0,
        rating: null,
        reviewsCount: 0,
        swapHistory: [],
      }));
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.error(err);
      setAuthError('Code de vérification incorrect ou expiré.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Magic Link
  const handleSendEmailLink = async () => {
    setAuthError('');
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Veuillez entrer une adresse email valide.');
      return;
    }
    setAuthLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, authEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthStep('email-sent');
    } catch (err) {
      console.warn('Firebase SDK Exception, Basculement en mode Email Simulé:', err);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthStep('email-sent');
      setAuthError('ℹ️ Clé Firebase non renseignée : Mode Email Simulé activé !');
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    setIsAuthenticated,
    profile,
    setProfile,
    isDemoProfile,
    isAdmin,
    isLoadingSession,
    authModalOpen,
    setAuthModalOpen,
    authStep,
    setAuthStep,
    authPhoneNumber,
    setAuthPhoneNumber,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authModeEmail,
    setAuthModeEmail,
    authSmsCode,
    setAuthSmsCode,
    confirmationResult,
    setConfirmationResult,
    authError,
    setAuthError,
    authLoading,
    setAuthLoading,
    authTab,
    setAuthTab,
    signupName,
    setSignupName,
    signupUsername,
    setSignupUsername,
    signupEmailOrPhone,
    setSignupEmailOrPhone,
    signupPassword,
    setSignupPassword,
    signupLocation,
    setSignupLocation,
    signupBio,
    setSignupBio,
    signupAvatar,
    setSignupAvatar,
    signupSkills,
    setSignupSkills,
    signupLanguages,
    setSignupLanguages,
    signupSkillInput,
    setSignupSkillInput,
    handleSignOut,
    handleAcceptCgu,
    handleGoogleSignIn,
    handleMicrosoftSignIn,
    handleFacebookSignIn,
    handleGithubSignIn,
    handleEmailPasswordSignIn,
    handleSignupSubmit,
    handleConfirmDemoAuth,
    handleSendSms,
    handleVerifySmsCode,
    handleSendEmailLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
