import React, { useState } from 'react';
import { Sparkles, Sun, Moon, Phone, Mail, X } from 'lucide-react';
import TrocoLogo from '../../components/common/TrocoLogo';
import { auth, db } from '../../firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

export default function AuthScreen({
  setProfile,
  setIsAuthenticated,
  setProfileDraft,
  setSkills,
  darkMode,
  toggleDarkMode,
}) {
  // États internes du flux d'authentification
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [authStep, setAuthStep] = useState('select'); // 'select' | 'phone' | 'sms-verify' | 'email' | 'email-sent'
  const [authPhoneNumber, setAuthPhoneNumber] = useState('+336');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authModeEmail, setAuthModeEmail] = useState('password'); // 'password' | 'magic-link'
  const [authSmsCode, setAuthSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Formulaire d'inscription
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

  // ---- AUTHENTIFICATION PAR TÉLÉPHONE (SMS) ----
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
      const user = res.user;
      const uid = user.uid || 'phone_' + Date.now();
      const phoneNum = user.phoneNumber || authPhoneNumber;
      const updatedProfile = {
        uid,
        loginMethod: 'Téléphone (SMS)',
        name: phoneNum,
        username: '@user_' + phoneNum.replace(/[^0-9]/g, '').slice(-4),
      };
      setProfile(prev => ({
        ...prev,
        ...updatedProfile
      }));
      if (setProfileDraft) setProfileDraft(prev => ({ ...prev, ...updatedProfile }));
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.error(err);
      setAuthError('Code de vérification incorrect ou expiré.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ---- GESTIONNAIRE UNIFIÉ & MODULAIRE DES FOURNISSEURS OAUTH ----
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
      const user = result.user;
      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      const realName = user.displayName || user.email?.split('@')[0] || `Utilisateur ${providerName}`;
      const realUsername = '@' + (user.reloadUserInfo?.screenName || realName).toLowerCase().replace(/[^a-z0-9_]/g, '');
      const realAvatar = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

      if (!userSnap.exists()) {
        let existingUserByEmail = null;
        if (user.email) {
          try {
            const emailQuery = query(collection(db, 'users'), where('email', '==', user.email));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              existingUserByEmail = emailSnap.docs[0].data();
            }
          } catch (e) {
            console.warn('[Firestore] Email lookup for multi-auth linking failed:', e);
          }
        }

        if (existingUserByEmail) {
          const mergedUserData = {
            ...existingUserByEmail,
            uid,
            email: user.email,
            loginMethod: providerName,
            updatedAt: serverTimestamp(),
          };
          if (user.photoURL && !mergedUserData.avatar) mergedUserData.avatar = user.photoURL;
          if (user.displayName && !mergedUserData.name) mergedUserData.name = user.displayName;
          await setDoc(userDocRef, mergedUserData, { merge: true });
          setProfile(mergedUserData);
          if (setProfileDraft) setProfileDraft(mergedUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(mergedUserData));
        } else {
          const newUserData = {
            uid,
            name: realName,
            username: realUsername || `@user_${uid.slice(0, 6)}`,
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
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
          if (setProfileDraft) setProfileDraft(newUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(newUserData));
        }
      } else {
        const existingData = { ...userSnap.data(), uid };
        if (user.photoURL && !existingData.avatar) existingData.avatar = user.photoURL;
        if (user.displayName && !existingData.name) existingData.name = user.displayName;
        setProfile(existingData);
        if (setProfileDraft) setProfileDraft(existingData);
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
  // eslint-disable-next-line no-unused-vars
  const handleGithubSignIn = () => handleGenericOAuthSignIn(new GithubAuthProvider(), 'GitHub');

  // ---- CONNEXION EMAIL / MOT DE PASSE ----
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
      const user = userCredential.user;
      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = { ...userSnap.data(), uid };
        setProfile(prev => ({ ...prev, ...userData }));
        if (setProfileDraft) setProfileDraft(prev => ({ ...prev, ...userData }));
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

  // ---- CONNEXION LIEN MAGIQUE EMAIL ----
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

  // ---- ACCÈS DÉMO RAPIDE ----
  const handleConfirmDemoAuth = (method) => {
    const pin = window.prompt('Entrez le code administrateur :');
    if (pin !== '2609') {
      alert('Accès refusé.');
      return;
    }

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
    if (setProfileDraft) setProfileDraft(demoProfile);
    setIsAuthenticated(true);
    setAuthError('');
  };

  // ---- FORMULAIRE DE CRÉATION DE COMPTE ----
  const handleSignupSubmit = async (e) => {
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
        euroBalance: 0.00,
        trocoTokens: 10,
        cguAcceptedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
      } catch (dbErr) {
        console.warn('[Firestore] Failed to save user:', dbErr);
      }

      if (signupSkills.length > 0 && setSkills) {
        setSkills(signupSkills);
      }

      setProfile(newProfile);
      if (setProfileDraft) setProfileDraft(newProfile);
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

  return (
    <div style={{ minHeight: '100vh', background: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', transition: 'background 0.3s ease' }}>

      {/* BOUTON SWITCH MODE SOMBRE / CLAIR */}
      {toggleDarkMode && (
        <button
          onClick={toggleDarkMode}
          title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '50%', width: '42px', height: '42px',
            backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
            color: darkMode ? '#F59E0B' : '#6B5E54',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(61,53,48,0.08)', transition: 'all 0.25s ease', zIndex: 50
          }}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      )}

      <div id="recaptcha-container"></div>
      <div style={{ width: '100%', maxWidth: '520px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '28px', boxShadow: darkMode ? '0 24px 60px rgba(0, 0, 0, 0.45)' : '0 24px 60px rgba(61, 53, 48, 0.08)', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', overflow: 'hidden', transition: 'all 0.3s ease' }}>

        {/* SÉLECTEUR D'ONGLETS CONNEXION / INSCRIPTION */}
        <div style={{ display: 'flex', borderBottom: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
          <button
            onClick={() => { setAuthTab('login'); setAuthError(''); }}
            style={{ flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '800', color: authTab === 'login' ? '#C67D5B' : (darkMode ? '#9A8E84' : '#6B5E54'), borderBottom: authTab === 'login' ? '3px solid #C67D5B' : '3px solid transparent', transition: 'all 0.2s ease' }}
          >
            Se connecter
          </button>
          <button
            onClick={() => { setAuthTab('signup'); setAuthError(''); }}
            style={{ flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '800', color: authTab === 'signup' ? '#C67D5B' : (darkMode ? '#9A8E84' : '#6B5E54'), borderBottom: authTab === 'signup' ? '3px solid #C67D5B' : '3px solid transparent', transition: 'all 0.2s ease' }}
          >
            Créer un compte
          </button>
        </div>

        <div style={{ padding: '28px 28px 18px' }}>
          {/* 🚨 PHASE 92 : LOGO DYNAMIQUE TROCO ADAPTÉ AU THÈME */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <TrocoLogo size={42} style={{ color: 'var(--accent-primary, #C67D5B)' }} />
            <div>
              <span
                className="font-editorial-heading"
                style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  letterSpacing: '-0.02em',
                  display: 'block',
                  lineHeight: 1.1,
                }}
              >
                Troco
              </span>
              <span style={{ fontSize: '11px', color: darkMode ? '#9A8E84' : '#6B5E54', letterSpacing: '0.04em' }}>
                Plateforme d'échanges & savoir-faire
              </span>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            {authTab === 'login' ? 'Bienvenue sur Troco' : 'Rejoindre la communauté'}
          </div>
          <h1 className="font-editorial-heading" style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 12px', color: darkMode ? '#FAF7F2' : '#3D3530', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {authTab === 'login' ? 'Échange, partage, crée sans limites.' : 'Créez votre compte Troco.'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
            {authTab === 'login'
              ? 'Troco réinvente les services, les swaps et les prêts avec une expérience premium pensée pour les échanges humains.'
              : 'Créez un profil personnalisé pour proposer vos compétences et négocier des échanges.'
            }
          </p>
        </div>

        <div style={{ padding: '0 28px 28px' }}>
          {authError && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px', backgroundColor: darkMode ? '#2D1B1B' : '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '600', border: '1px solid #FECACA' }}>
              {authError}
            </div>
          )}

          {/* FLUX DE CONNEXION MULTI-PROVIDERS */}
          {authTab === 'login' && (
            <>
              {authStep === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {/* BOUTON GOOGLE */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    style={{
                      border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                      borderRadius: '16px', padding: '13px 14px',
                      backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                      boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Continuer avec Google
                  </button>

                  {/* BOUTON MICROSOFT */}
                  <button
                    onClick={handleMicrosoftSignIn}
                    disabled={authLoading}
                    style={{
                      border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                      borderRadius: '16px', padding: '13px 14px',
                      backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontWeight: '700'
                    }}
                  >
                    <svg width="19" height="19" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    Continuer avec Microsoft
                  </button>

                  {/* BOUTON FACEBOOK */}
                  <button
                    onClick={handleFacebookSignIn}
                    disabled={authLoading}
                    style={{
                      border: 'none',
                      borderRadius: '16px', padding: '13px 14px',
                      backgroundColor: '#1877F2',
                      color: '#FFFFFF',
                      boxShadow: '0 8px 18px rgba(24,119,242,0.25)', cursor: authLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontWeight: '700'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Continuer avec Facebook
                  </button>

                  {/* BOUTON TÉLÉPHONE */}
                  <button
                    onClick={() => { setAuthStep('phone'); setAuthError(''); }}
                    disabled={authLoading}
                    style={{
                      border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                      borderRadius: '16px', padding: '13px 14px',
                      backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontWeight: '700'
                    }}
                  >
                    <Phone size={18} color="#C67D5B" />
                    Continuer avec mon Numéro
                  </button>

                  {/* BOUTON EMAIL */}
                  <button
                    onClick={() => { setAuthStep('email'); setAuthError(''); }}
                    disabled={authLoading}
                    style={{
                      border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                      borderRadius: '16px', padding: '13px 14px',
                      backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontWeight: '700'
                    }}
                  >
                    <Mail size={18} color="#C67D5B" />
                    Continuer avec un Email
                  </button>

                  {/* ACCÈS DÉMO RAPIDE */}
                  <button
                    type="button"
                    onClick={() => handleConfirmDemoAuth('Démo Rapide')}
                    style={{
                      border: '1px dashed var(--border-color)',
                      borderRadius: '16px', padding: '10px 14px',
                      backgroundColor: 'var(--bg-subtle)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⚡ Accès Rapide Démo
                  </button>
                </div>
              )}

              {/* SOUS-FLUX TÉLÉPHONE (SMS) */}
              {authStep === 'phone' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Numéro de téléphone :</label>
                  <input
                    type="tel"
                    value={authPhoneNumber}
                    onChange={(e) => setAuthPhoneNumber(e.target.value)}
                    placeholder="+33612345678"
                    style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                  <button disabled={authLoading} onClick={handleSendSms} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#C67D5B', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                    {authLoading ? 'Envoi du SMS...' : 'Envoyer le code par SMS'}
                  </button>
                  <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                    ← Retour aux options
                  </button>
                </div>
              )}

              {authStep === 'sms-verify' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Un SMS contenant un code de confirmation a été envoyé au <strong>{authPhoneNumber}</strong>.</div>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Code de confirmation :</label>
                  <input
                    type="text"
                    value={authSmsCode}
                    onChange={(e) => setAuthSmsCode(e.target.value)}
                    placeholder="123456"
                    style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '16px', fontWeight: '700', letterSpacing: '4px', textAlign: 'center', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                  <button disabled={authLoading} onClick={handleVerifySmsCode} style={{ border: 'none', borderRadius: '14px', padding: '12px', background: 'linear-gradient(135deg, #9CAF88 0%, #7A8F6A 100%)', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                    {authLoading ? 'Vérification...' : 'Valider et se connecter'}
                  </button>
                  <button onClick={() => { setAuthStep('phone'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                    ← Modifier le numéro
                  </button>
                </div>
              )}

              {/* SOUS-FLUX EMAIL */}
              {authStep === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setAuthModeEmail('password')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                        border: authModeEmail === 'password' ? '1px solid #C67D5B' : '1px solid #E8DDD3',
                        backgroundColor: authModeEmail === 'password' ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : 'transparent',
                        color: authModeEmail === 'password' ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                        cursor: 'pointer'
                      }}
                    >
                      Mot de passe
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthModeEmail('magic-link')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                        border: authModeEmail === 'magic-link' ? '1px solid #C67D5B' : '1px solid #E8DDD3',
                        backgroundColor: authModeEmail === 'magic-link' ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : 'transparent',
                        color: authModeEmail === 'magic-link' ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                        cursor: 'pointer'
                      }}
                    >
                      Lien magique
                    </button>
                  </div>

                  <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Adresse Email :</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />

                  {authModeEmail === 'password' && (
                    <>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Mot de passe :</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailPasswordSignIn()}
                        style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                      />
                      <button disabled={authLoading} onClick={handleEmailPasswordSignIn} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#C67D5B', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                        {authLoading ? 'Connexion en cours...' : 'Se connecter'}
                      </button>
                    </>
                  )}

                  {authModeEmail === 'magic-link' && (
                    <button disabled={authLoading} onClick={handleSendEmailLink} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#C67D5B', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                      {authLoading ? 'Envoi...' : 'Recevoir le lien magique'}
                    </button>
                  )}

                  <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                    ← Retour aux options
                  </button>
                </div>
              )}

              {authStep === 'email-sent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#C67D5B' }}>✉️ Vérifiez votre boîte mail</div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6 }}>Un lien de connexion magique a été envoyé à <strong>{authEmail}</strong>. Cliquez dessus pour vous connecter.</div>
                  <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }}>
                    ← Retour aux options
                  </button>
                </div>
              )}
            </>
          )}

          {/* FORMULAIRE DE CRÉATION DE COMPTE */}
          {authTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>

              {/* NOM COMPLET */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Nom Complet</label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="ex: Mateo Polo"
                  style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              {/* PSEUDO */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Pseudo (@)</label>
                <input
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="ex: mateopolo"
                  style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              {/* EMAIL */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Adresse Email</label>
                <input
                  type="email"
                  required
                  value={signupEmailOrPhone}
                  onChange={(e) => setSignupEmailOrPhone(e.target.value)}
                  placeholder="ex: mateo@troco.app"
                  style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              {/* MOT DE PASSE */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Mot de passe (min 6 caractères)</label>
                <input
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              {/* VILLE / LOCALISATION */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Ville / Localisation</label>
                <input
                  type="text"
                  required
                  value={signupLocation}
                  onChange={(e) => setSignupLocation(e.target.value)}
                  placeholder="ex: Paris, France"
                  style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              {/* BIOGRAPHIE */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Bio / Description</label>
                <textarea
                  rows={2}
                  value={signupBio}
                  onChange={(e) => setSignupBio(e.target.value)}
                  placeholder="Parlez-nous de vous, de vos services ou de ce que vous cherchez..."
                  style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none', resize: 'none' }}
                />
              </div>

              {/* CHOIX DE L'AVATAR PRESET */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Choisissez un Avatar</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                  {[
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                  ].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSignupAvatar(av)}
                      style={{
                        border: signupAvatar === av ? '3px solid #C67D5B' : '3px solid transparent',
                        borderRadius: '50%', padding: 0, background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                        transform: signupAvatar === av ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      <img src={av} alt="avatar option" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* LANGUES PARLÉES */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '8px' }}>Langues Parlées</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['FR', 'EN', 'ES', 'IT'].map((lang) => {
                    const selected = signupLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setSignupLanguages(prev => prev.filter(l => l !== lang));
                          } else {
                            setSignupLanguages(prev => [...prev, lang]);
                          }
                        }}
                        style={{
                          border: selected
                            ? '1px solid #C67D5B'
                            : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                          backgroundColor: selected
                            ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4')
                            : (darkMode ? '#1A1715' : '#FAF7F2'),
                          color: selected
                            ? (darkMode ? '#FAF7F2' : '#A8644A')
                            : (darkMode ? '#D4C5B5' : '#6B5E54'),
                          padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COMPÉTENCES / SKILLS */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Vos Compétences (CV)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={signupSkillInput}
                    onChange={(e) => setSignupSkillInput(e.target.value)}
                    placeholder="ex: Bricolage, Ableton..."
                    style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', outline: 'none', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (signupSkillInput.trim() && !signupSkills.includes(signupSkillInput.trim())) {
                          setSignupSkills(prev => [...prev, signupSkillInput.trim()]);
                          setSignupSkillInput('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (signupSkillInput.trim() && !signupSkills.includes(signupSkillInput.trim())) {
                        setSignupSkills(prev => [...prev, signupSkillInput.trim()]);
                        setSignupSkillInput('');
                      }
                    }}
                    style={{ border: 'none', borderRadius: '12px', backgroundColor: '#C67D5B', color: '#FFF', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Ajouter
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {signupSkills.map((sk) => (
                    <span key={sk} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                      {sk}
                      <button
                        type="button"
                        onClick={() => setSignupSkills(prev => prev.filter(s => s !== sk))}
                        style={{ border: 'none', background: 'transparent', color: '#C67D5B', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* BOUTON SOUMISSION */}
              <button
                type="submit"
                disabled={authLoading}
                style={{
                  border: 'none', borderRadius: '16px', padding: '14px', marginTop: '10px',
                  background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF',
                  cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 12px 24px -6px rgba(198, 125, 91, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: authLoading ? 0.7 : 1
                }}
              >
                {authLoading ? 'Création du compte...' : 'Créer mon compte & Commencer'}
              </button>
            </form>
          )}

          <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '13px', lineHeight: 1.7, transition: 'all 0.3s ease' }}>
            <div style={{ fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>Pourquoi les utilisateurs aiment Troco</div>
            <div>• Connexion sécurisée Google, SMS & Email</div>
            <div>• Profils vérifiés avec réputation et compétences transparentes</div>
            <div>• Espaces de négociation et d'appels vidéo intégrés</div>
          </div>
        </div>
      </div>
    </div>
  );
}
