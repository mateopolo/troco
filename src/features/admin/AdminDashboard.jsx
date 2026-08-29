import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, Users, FileText, MessageSquare, Globe, Search,
  Trash2, Edit3, CheckCircle, AlertTriangle, X, Lock, Unlock,
  Coins, Sparkles, Check, RefreshCw, Zap, ShieldAlert,
  ArrowRight, ShieldCheck, UserX, UserCheck, Flame, Plus,
  Sliders, Eye, Key, Save, Clock
} from 'lucide-react';
import {
  collection, doc, onSnapshot, updateDoc, deleteDoc,
  setDoc, serverTimestamp, query, orderBy, limit, addDoc, getDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAllGlobalContent, DEFAULT_GLOBAL_CONTENT } from './useGlobalContent';

export default function AdminDashboard({
  isOpen = true,
  onClose,
  currentUser = null,
  darkMode = false,
  onInspectUser = null,
}) {
  // Navigation entre les 5 onglets : utilisateurs, annonces, communauté, économie & litiges, cms
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'listings' | 'community' | 'economy' | 'cms'

  // Vérification de sécurité / Code PIN d'urgence
  const isDirectAdmin = Boolean(
    currentUser?.isAdmin === true ||
    currentUser?.role === 'admin' ||
    currentUser?.email === 'mateopolo91@gmail.com'
  );
  const [isUnlocked, setIsUnlocked] = useState(isDirectAdmin);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // États des données temps réel
  const [usersList, setUsersList] = useState([]);
  const [listingsList, setListingsList] = useState([]);
  const [communityMessages, setCommunityMessages] = useState([]);
  const [transactionsList, setTransactionsList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Hook CMS Textes Globaux
  const { items: globalContent, saveContent: saveGlobalContent } = useAllGlobalContent();

  // Filtres et Recherches
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'active' | 'banned' | 'admin' | 'verified'

  const [listingSearch, setListingSearch] = useState('');
  const [listingCategoryFilter, setListingCategoryFilter] = useState('all');

  const [communitySearch, setCommunitySearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('all'); // 'all' | 'urgent' | 'admin_edited'

  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'disputed' | 'deal' | 'admin_adjustment' | 'refunded'

  // Modales d'action
  const [editingUser, setEditingUser] = useState(null); // Utilisateur complet à éditer
  const [editingListing, setEditingListing] = useState(null); // Document annonce à éditer
  const [editingCommunityMsg, setEditingCommunityMsg] = useState(null); // Message communauté à éditer
  const [balanceModalUser, setBalanceModalUser] = useState(null); // Utilisateur pour ajustement de solde
  const [deltaTokens, setDeltaTokens] = useState('');
  const [deltaEuros, setDeltaEuros] = useState('');
  const [cmsEditKey, setCmsEditKey] = useState(null);
  const [cmsEditValue, setCmsEditValue] = useState('');
  const [newCmsKey, setNewCmsKey] = useState('');
  const [newCmsVal, setNewCmsVal] = useState('');
  const [isAddingNewCms, setIsAddingNewCms] = useState(false);

  // Toast notifications en direct
  const [toastMsg, setToastMsg] = useState('');
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  }, []);

  // Déverrouillage par PIN
  const handleUnlockWithPin = (e) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === '2609' || isDirectAdmin) {
      setIsUnlocked(true);
      setPinError('');
      showToast('⚡ Mode Fondateur Omnipotent activé');
    } else {
      setPinError('Code PIN incorrect ou autorisations insuffisantes.');
    }
  };

  // 1. LISTENER TEMPS RÉEL : UTILISATEURS
  useEffect(() => {
    if (!db || !isUnlocked) return;

    let unsubscribe = () => {};
    try {
      const usersColl = collection(db, 'users');
      unsubscribe = onSnapshot(
        usersColl,
        (snapshot) => {
          const list = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              uid: docSnap.id,
              ...data,
            });
          });
          setUsersList(list);
          setIsLoadingUsers(false);
        },
        (err) => {
          console.warn('[AdminDashboard] Erreur écoute users:', err);
          setIsLoadingUsers(false);
        }
      );
    } catch (e) {
      console.warn('[AdminDashboard] Exception users:', e);
      setIsLoadingUsers(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isUnlocked]);

  // 2. LISTENER TEMPS RÉEL : ANNONCES
  useEffect(() => {
    if (!db || !isUnlocked) return;

    let unsubscribe = () => {};
    try {
      const listingsColl = collection(db, 'listings');
      unsubscribe = onSnapshot(
        listingsColl,
        (snapshot) => {
          const list = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              ...data,
            });
          });
          setListingsList(list);
          setIsLoadingListings(false);
        },
        (err) => {
          console.warn('[AdminDashboard] Erreur écoute listings:', err);
          setIsLoadingListings(false);
        }
      );
    } catch (e) {
      console.warn('[AdminDashboard] Exception listings:', e);
      setIsLoadingListings(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isUnlocked]);

  // 3. LISTENER TEMPS RÉEL : FLUX COMMUNAUTÉ (global_chat)
  useEffect(() => {
    if (!db || !isUnlocked) return;

    let unsubscribe = () => {};

    const handleSnapshot = (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
        });
      });
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt || a.timestamp || 0));
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt || b.timestamp || 0));
        return tB - tA;
      });
      setCommunityMessages(list);
      setIsLoadingCommunity(false);
    };

    try {
      const q = query(
        collection(db, 'global_chat'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      unsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (err) => {
          console.warn('[AdminDashboard] Erreur écoute global_chat avec orderBy, fallback sans orderBy:', err);
          try {
            const fallbackQ = query(collection(db, 'global_chat'), limit(100));
            unsubscribe = onSnapshot(fallbackQ, handleSnapshot, () => setIsLoadingCommunity(false));
          } catch (_) {
            setIsLoadingCommunity(false);
          }
        }
      );
    } catch (e) {
      console.warn('[AdminDashboard] Exception global_chat:', e);
      setIsLoadingCommunity(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isUnlocked]);

  // 4. LISTENER TEMPS RÉEL : TRANSACTIONS & ÉCONOMIE (transactions)
  useEffect(() => {
    if (!db || !isUnlocked) return;

    let unsubscribe = () => {};

    const handleSnapshot = (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
        });
      });
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt || a.timestamp || 0));
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt || b.timestamp || 0));
        return tB - tA;
      });
      setTransactionsList(list);
      setIsLoadingTransactions(false);
    };

    try {
      const q = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      unsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (err) => {
          console.warn('[AdminDashboard] Erreur écoute transactions avec orderBy, fallback sans orderBy:', err);
          try {
            const fallbackQ = query(collection(db, 'transactions'), limit(100));
            unsubscribe = onSnapshot(fallbackQ, handleSnapshot, () => setIsLoadingTransactions(false));
          } catch (_) {
            setIsLoadingTransactions(false);
          }
        }
      );
    } catch (e) {
      console.warn('[AdminDashboard] Exception transactions:', e);
      setIsLoadingTransactions(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isUnlocked]);

  // ================= ACTIONS UTILISATEURS =================
  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editingUser.name || '',
        username: editingUser.username || '',
        email: editingUser.email || '',
        bio: editingUser.bio || '',
        location: editingUser.location || '',
        trocoTokens: Number(editingUser.trocoTokens) || 0,
        euroBalance: Number(editingUser.euroBalance) || 0,
        isAdmin: Boolean(editingUser.isAdmin),
        isBanned: Boolean(editingUser.isBanned),
        kycVerified: Boolean(editingUser.kycVerified),
        verified: Boolean(editingUser.kycVerified),
        role: editingUser.isAdmin ? 'admin' : 'user',
        updatedAt: serverTimestamp(),
      });
      showToast(`Profil de ${editingUser.name} mis à jour en direct !`);
      setEditingUser(null);
    } catch (err) {
      alert("Erreur mise à jour utilisateur : " + err.message);
    }
  };

  const handleToggleBanUser = async (user) => {
    const newBannedState = !user.isBanned;
    const confirmText = newBannedState
      ? `🚨 Confirmer le BANNISSEMENT immédiat de ${user.name || user.email} ? L'utilisateur sera déconnecté et exclu sur le champ.`
      : `Réactiver le compte de ${user.name || user.email} ?`;

    if (!window.confirm(confirmText)) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isBanned: newBannedState,
        bannedAt: newBannedState ? serverTimestamp() : null,
        bannedBy: currentUser?.email || 'admin',
        updatedAt: serverTimestamp(),
      });

      showToast(newBannedState ? `⛔ Compte de ${user.name || 'utilisateur'} banni en direct !` : `✅ Compte de ${user.name || 'utilisateur'} réactivé.`);
    } catch (err) {
      console.error('[Admin] Erreur ban user:', err);
      alert("Erreur lors de la mise à jour de l'utilisateur : " + err.message);
    }
  };

  const handleToggleAdminStatus = async (user) => {
    const newAdminState = !user.isAdmin;
    if (!window.confirm(`Passer ${user.name} en ${newAdminState ? 'ADMINISTRATEUR OMNIPOTENT' : 'UTILISATEUR STANDARD'} ?`)) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isAdmin: newAdminState,
        role: newAdminState ? 'admin' : 'user',
        updatedAt: serverTimestamp(),
      });
      showToast(`Privilèges de ${user.name} mis à jour.`);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleToggleKycStatus = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        kycVerified: !user.kycVerified,
        verified: !user.kycVerified,
        updatedAt: serverTimestamp(),
      });
      showToast(`Statut vérifié de ${user.name} basculé.`);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleSaveBalanceAdjustment = async () => {
    if (!balanceModalUser) return;
    const addTok = parseInt(deltaTokens, 10) || 0;
    const addEur = parseFloat(deltaEuros) || 0;

    const curTok = Number(balanceModalUser.trocoTokens) || 0;
    const curEur = Number(balanceModalUser.euroBalance) || 0;

    const finalTok = Math.max(0, curTok + addTok);
    const finalEur = Math.max(0, curEur + addEur);

    try {
      const userRef = doc(db, 'users', balanceModalUser.id);
      await updateDoc(userRef, {
        trocoTokens: finalTok,
        euroBalance: finalEur,
        updatedAt: serverTimestamp(),
      });

      // Enregistrer une transaction administrative d'audit
      await addDoc(collection(db, 'transactions'), {
        type: 'admin_adjustment',
        userId: balanceModalUser.id,
        userName: balanceModalUser.name || 'Membre',
        deltaTokens: addTok,
        deltaEuros: addEur,
        newTokens: finalTok,
        newEuros: finalEur,
        adminEmail: currentUser?.email || 'admin',
        createdAt: serverTimestamp(),
      });

      showToast(`Solde de ${balanceModalUser.name} ajusté (${addTok >= 0 ? '+' : ''}${addTok}🪙, ${addEur >= 0 ? '+' : ''}${addEur}€)`);
      setBalanceModalUser(null);
      setDeltaTokens('');
      setDeltaEuros('');
    } catch (err) {
      alert("Erreur lors de l'ajustement : " + err.message);
    }
  };

  const handleDeleteUserAccount = async (user) => {
    if (!window.confirm(`⚠️ SUPPRESSION DÉFINITIVE DU COMPTE ${user.name} (${user.id}) ? Cette action est irréversible.`)) return;

    try {
      await deleteDoc(doc(db, 'users', String(user.id)));
      showToast(`Compte de ${user.name} supprimé définitivement.`);
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  // ================= ACTIONS ÉCONOMIE & LITIGES =================
  const handleResolveDispute = async (tx) => {
    if (!window.confirm(`⚖️ Valider et clôturer le litige pour la transaction #${String(tx.id).slice(0, 6)} ?`)) return;
    try {
      await updateDoc(doc(db, 'transactions', String(tx.id)), {
        status: 'resolved',
        isDisputed: false,
        resolvedAt: serverTimestamp(),
        resolvedBy: currentUser?.email || 'admin',
      });
      showToast(`Litige sur #${String(tx.id).slice(0, 6)} résolu.`);
    } catch (err) {
      alert('Erreur résolution litige : ' + err.message);
    }
  };

  const handleRefundTransaction = async (tx) => {
    if (!window.confirm(`↩️ Rembourser la transaction #${String(tx.id).slice(0, 6)} (${tx.deltaTokens || tx.tokens || 0}🪙, ${tx.deltaEuros || tx.euros || 0}€) ?`)) return;
    try {
      const payerUid = tx.userId || tx.payerUid;
      if (payerUid) {
        const userRef = doc(db, 'users', payerUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const refundTok = Number(tx.deltaTokens || tx.tokens || 0);
          const refundEur = Number(tx.deltaEuros || tx.euros || 0);
          await updateDoc(userRef, {
            trocoTokens: (uData.trocoTokens || 0) + Math.abs(refundTok),
            euroBalance: (uData.euroBalance || 0) + Math.abs(refundEur),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await updateDoc(doc(db, 'transactions', String(tx.id)), {
        status: 'refunded',
        isDisputed: false,
        refundedAt: serverTimestamp(),
        refundedBy: currentUser?.email || 'admin',
      });
      showToast(`Transaction #${String(tx.id).slice(0, 6)} remboursée avec succès !`);
    } catch (err) {
      alert('Erreur remboursement : ' + err.message);
    }
  };

  const handleDeleteTransaction = async (tx) => {
    if (!window.confirm(`🗑️ Supprimer définitivement la transaction #${String(tx.id).slice(0, 6)} de Firestore ?`)) return;
    try {
      await deleteDoc(doc(db, 'transactions', String(tx.id)));
      showToast(`Transaction #${String(tx.id).slice(0, 6)} supprimée.`);
    } catch (err) {
      alert('Erreur suppression transaction : ' + err.message);
    }
  };

  // ================= ACTIONS ANNONCES =================
  const handleDeleteListing = async (listing) => {
    if (!window.confirm(`🗑️ Supprimer immédiatement l'annonce "${listing.title}" ?`)) return;

    try {
      await deleteDoc(doc(db, 'listings', String(listing.id)));

      // Journalisation d'audit silencieuse
      await addDoc(collection(db, 'admin_audit_logs'), {
        action: 'delete_listing',
        targetListingId: listing.id,
        listingTitle: listing.title || '',
        authorName: listing.author || '',
        adminEmail: currentUser?.email || 'admin',
        createdAt: serverTimestamp(),
      });

      showToast(`Annonce "${listing.title}" détruite en direct.`);
    } catch (err) {
      alert('Erreur suppression annonce : ' + err.message);
    }
  };

  const handleSaveListingEdit = async () => {
    if (!editingListing) return;
    try {
      const listingRef = doc(db, 'listings', String(editingListing.id));
      await updateDoc(listingRef, {
        title: editingListing.title,
        description: editingListing.description,
        compensation: editingListing.compensation || '',
        category: editingListing.category || 'Autre',
        location: editingListing.location || '',
        updatedAt: serverTimestamp(),
        editedByAdmin: true,
      });

      showToast(`Annonce "${editingListing.title}" mise à jour en direct !`);
      setEditingListing(null);
    } catch (err) {
      alert('Erreur modification annonce : ' + err.message);
    }
  };

  // ================= ACTIONS COMMUNAUTÉ =================
  const handleDeleteCommunityMessage = async (msgId) => {
    if (!window.confirm('Supprimer ce message du flux communauté en direct ?')) return;

    try {
      await deleteDoc(doc(db, 'global_chat', msgId));
      showToast('Message communauté supprimé en temps réel.');
    } catch (err) {
      alert('Erreur suppression message : ' + err.message);
    }
  };

  const handleSaveCommunityMessageEdit = async () => {
    if (!editingCommunityMsg) return;
    try {
      const msgRef = doc(db, 'global_chat', editingCommunityMsg.id);
      await updateDoc(msgRef, {
        text: editingCommunityMsg.text,
        isEditedByAdmin: true,
        editedAt: serverTimestamp(),
      });
      showToast('Message communauté modifié en direct !');
      setEditingCommunityMsg(null);
    } catch (err) {
      alert('Erreur modification message : ' + err.message);
    }
  };

  const handleQuickBanMessageAuthor = async (msg) => {
    const authorName = msg.author || 'Auteur';
    const authorUid = msg.authorUid || msg.userId;

    if (!window.confirm(`Bannir directement l'auteur "${authorName}" de ce message ?`)) return;

    try {
      if (authorUid) {
        await updateDoc(doc(db, 'users', authorUid), {
          isBanned: true,
          bannedAt: serverTimestamp(),
          bannedReason: `Message communauté abusif: "${msg.text?.slice(0, 50)}..."`,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Recherche dans users par nom
        const target = usersList.find(u => u.name === msg.author || u.username === msg.authorUsername);
        if (target) {
          await updateDoc(doc(db, 'users', target.id), {
            isBanned: true,
            bannedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      // Supprime également le message
      await deleteDoc(doc(db, 'global_chat', msg.id));
      showToast(`Auteur "${authorName}" banni et message supprimé.`);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  // ================= ACTIONS TEXTES GLOBAUX (CMS) =================
  const handleSaveCmsItem = async (key, val) => {
    try {
      await saveGlobalContent(key, val);
      showToast(`Texte global '${key}' mis à jour et diffusé en direct !`);
      setCmsEditKey(null);
    } catch (err) {
      alert('Erreur sauvegarde CMS : ' + err.message);
    }
  };

  const handleCreateNewCmsKey = async (e) => {
    e.preventDefault();
    if (!newCmsKey.trim()) return;
    const sanitizedKey = newCmsKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    try {
      await saveGlobalContent(sanitizedKey, newCmsVal.trim());
      showToast(`Nouvelle clé CMS '${sanitizedKey}' créée avec succès !`);
      setNewCmsKey('');
      setNewCmsVal('');
      setIsAddingNewCms(false);
    } catch (err) {
      alert('Erreur création clé CMS : ' + err.message);
    }
  };

  // ================= STATS ET COMPTEURS GLOBAUX =================
  const stats = useMemo(() => {
    const totalUsers = usersList.length;
    const bannedUsers = usersList.filter(u => u.isBanned).length;
    const verifiedUsers = usersList.filter(u => u.kycVerified || u.verified).length;
    const adminUsers = usersList.filter(u => u.isAdmin).length;
    const totalListings = listingsList.length;
    const totalMessages = communityMessages.length;
    const totalTransactions = transactionsList.length;
    const disputedTransactions = transactionsList.filter(t => t.isDisputed || t.status === 'disputed' || t.status === 'litige').length;
    const totalTokensInEconomy = usersList.reduce((acc, u) => acc + (Number(u.trocoTokens) || 0), 0);
    const totalEurosInEconomy = usersList.reduce((acc, u) => acc + (Number(u.euroBalance) || 0), 0);

    return {
      totalUsers,
      bannedUsers,
      verifiedUsers,
      adminUsers,
      totalListings,
      totalMessages,
      totalTransactions,
      disputedTransactions,
      totalTokensInEconomy,
      totalEurosInEconomy,
    };
  }, [usersList, listingsList, communityMessages, transactionsList]);

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = userSearch.toLowerCase();
      const matchSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (userFilter === 'banned') return !!u.isBanned;
      if (userFilter === 'active') return !u.isBanned;
      if (userFilter === 'admin') return !!u.isAdmin;
      if (userFilter === 'verified') return !!(u.kycVerified || u.verified);

      return true;
    });
  }, [usersList, userSearch, userFilter]);

  // Filtrage des annonces
  const filteredListings = useMemo(() => {
    return listingsList.filter((l) => {
      const q = listingSearch.toLowerCase();
      const matchSearch =
        !q ||
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.author && l.author.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (listingCategoryFilter !== 'all' && l.category !== listingCategoryFilter) return false;

      return true;
    });
  }, [listingsList, listingSearch, listingCategoryFilter]);

  // Filtrage de la communauté
  const filteredCommunity = useMemo(() => {
    return communityMessages.filter((m) => {
      const q = communitySearch.toLowerCase();
      const matchSearch =
        !q ||
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.author && m.author.toLowerCase().includes(q)) ||
        (m.authorUsername && m.authorUsername.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (communityFilter === 'urgent') return !!m.isUrgent;
      if (communityFilter === 'admin_edited') return !!m.isEditedByAdmin;

      return true;
    });
  }, [communityMessages, communitySearch, communityFilter]);

  // Filtrage des transactions & litiges
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((tx) => {
      const q = (txSearch || '').toLowerCase();
      const matchSearch =
        !q ||
        (tx.id && String(tx.id).toLowerCase().includes(q)) ||
        (tx.userName && tx.userName.toLowerCase().includes(q)) ||
        (tx.userId && String(tx.userId).toLowerCase().includes(q)) ||
        (tx.partnerName && tx.partnerName.toLowerCase().includes(q)) ||
        (tx.type && tx.type.toLowerCase().includes(q)) ||
        (tx.label && tx.label.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (txFilter === 'disputed') return Boolean(tx.isDisputed || tx.status === 'disputed' || tx.status === 'litige');
      if (txFilter === 'deal') return tx.type === 'deal' || tx.mode === 'deal';
      if (txFilter === 'admin_adjustment') return tx.type === 'admin_adjustment';
      if (txFilter === 'refunded') return tx.status === 'refunded';

      return true;
    });
  }, [transactionsList, txSearch, txFilter]);

  if (!isOpen) return null;

  // ================= VUE 0 : ÉCRAN DE VERROUILLAGE SÉCURITÉ ADMIN =================
  if (!isUnlocked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: darkMode ? '#0C0A09' : '#181411',
          color: '#FAF7F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            backgroundColor: darkMode ? 'rgba(26,22,19,0.92)' : 'rgba(38,32,28,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239,68,68,0.15)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
            }}
          >
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '900', color: '#FFF' }}>
            Accès Réservé — Troco God Mode
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#A8998C', lineHeight: 1.5 }}>
            Cette console accorde les pleins pouvoirs en direct sur l'infrastructure Firestore. Entrez le code d'accès administrateur pour continuer.
          </p>

          <form onSubmit={handleUnlockWithPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                maxLength="6"
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  border: pinError ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)',
                  color: '#FFF',
                  fontSize: '18px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  outline: 'none',
                }}
              />
            </div>

            {pinError && (
              <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '700' }}>
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="premium-button"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                fontSize: '14px',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(198,125,91,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Key size={18} /> Déverrouiller le Panel
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A8998C',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                Retour à l'application
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ================= VUE PRINCIPALE : TABLEAU DE BORD GOD MODE =================
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: darkMode ? '#0F0D0B' : '#F7F4EF',
        color: darkMode ? '#FAF7F2' : '#2D241E',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* 1. HEADER DU GOD MODE */}
      <header
        style={{
          padding: '14px 24px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          backgroundColor: darkMode ? 'rgba(21,18,15,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #C67D5B 0%, #EF4444 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(198,125,91,0.4)',
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', letterSpacing: '-0.02em' }}>
                Troco God Mode
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFF' }} />
                FIRESTORE LIVE (0ms)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: darkMode ? '#A8998C' : '#7A6B60' }}>
              Modération omnipotente, surveillance économique, gestion des litiges et CMS.
            </p>
          </div>
        </div>

        {/* STATS RAPIDES & BOUTON FERMER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '16px',
              fontSize: '12px',
              fontWeight: '700',
              padding: '6px 14px',
              borderRadius: '12px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            }}
            className="admin-header-stats"
          >
            <span>👥 {stats.totalUsers} inscrits</span>
            <span style={{ color: '#EF4444' }}>⛔ {stats.bannedUsers} bannis</span>
            <span>📢 {stats.totalListings} annonces</span>
            <span>🪙 {stats.totalTokensInEconomy} jetons</span>
            {stats.disputedTransactions > 0 && <span style={{ color: '#EF4444' }}>⚠️ {stats.disputedTransactions} litiges</span>}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fermer le panel admin"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* TOAST ALERTE FLOTTANTE */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000000,
            backgroundColor: '#10B981',
            color: '#FFF',
            padding: '12px 20px',
            borderRadius: '16px',
            fontWeight: '800',
            fontSize: '13px',
            boxShadow: '0 12px 30px rgba(16,185,129,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle size={18} />
          {toastMsg}
        </div>
      )}

      {/* 2. NAVIGATION PAR ONGLETS (5 ONGLETS GOD MODE) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          backgroundColor: darkMode ? '#14110E' : '#FFFFFF',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {[
          { id: 'users', label: 'Utilisateurs', icon: Users, count: stats.totalUsers, badge: stats.bannedUsers ? `${stats.bannedUsers} bannis` : null },
          { id: 'listings', label: 'Annonces', icon: FileText, count: stats.totalListings },
          { id: 'community', label: 'Communauté & Live', icon: MessageSquare, count: stats.totalMessages },
          { id: 'economy', label: 'Économie & Litiges', icon: Coins, count: stats.totalTransactions, badge: stats.disputedTransactions ? `${stats.disputedTransactions} litige${stats.disputedTransactions > 1 ? 's' : ''}` : null },
          { id: 'cms', label: 'Textes Globaux (CMS)', icon: Globe, count: Object.keys(globalContent).length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="premium-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: isActive
                  ? 'var(--accent-primary, #C67D5B)'
                  : darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                color: isActive ? '#FFFFFF' : 'inherit',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span
                style={{
                  fontSize: '10.5px',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              >
                {tab.count}
              </span>
              {tab.badge && (
                <span style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '999px', backgroundColor: '#EF4444', color: '#FFF' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. CORPS DE LA VUE ACTIVE */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* ================= ONGLET 1 : UTILISATEURS ================= */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Barre de filtre et recherche */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                padding: '14px 18px',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, username, email ou UID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    fontSize: '13.5px',
                    fontWeight: '600',
                  }}
                />
              </div>

              {/* Filtres rapides */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'active', label: 'Actifs' },
                  { id: 'banned', label: '⛔ Bannis' },
                  { id: 'verified', label: '✓ Vérifiés' },
                  { id: 'admin', label: '🛡️ Admins' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setUserFilter(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: userFilter === f.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      backgroundColor: userFilter === f.id ? 'rgba(198,125,91,0.15)' : darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      color: userFilter === f.id ? 'var(--accent-primary)' : 'inherit',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tableau des utilisateurs */}
            <div
              style={{
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)', backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Utilisateur</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Email / Contact</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Soldes</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Statut</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800', textAlign: 'right' }}>Actions God Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Chargement en temps réel des utilisateurs...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Aucun utilisateur ne correspond à ce filtre.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
                            backgroundColor: user.isBanned ? 'rgba(239,68,68,0.06)' : 'transparent',
                          }}
                        >
                          {/* Utilisateur info */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                                alt=""
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {user.name || 'Sans nom'}
                                  {user.isAdmin && <span style={{ fontSize: '10px', backgroundColor: '#F59E0B', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>ADMIN</span>}
                                  {(user.kycVerified || user.verified) && <ShieldCheck size={14} color="#10B981" />}
                                  {user.isBanned && <span style={{ fontSize: '10px', backgroundColor: '#EF4444', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>BANNI</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {user.username || '@membre'} • UID: {user.id?.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email & Contact */}
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            <div>{user.email || 'Pas d\'email'}</div>
                            <div style={{ fontSize: '11px' }}>{user.location || 'France'}</div>
                          </td>

                          {/* Soldes */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '800', color: '#F59E0B' }}>
                              🪙 {Number(user.trocoTokens) || 0} Jetons
                            </div>
                            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                              € {(Number(user.euroBalance) || 0).toFixed(2)}
                            </div>
                          </td>

                          {/* Statut */}
                          <td style={{ padding: '14px 18px' }}>
                            {user.isBanned ? (
                              <span style={{ color: '#EF4444', fontWeight: '800', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <UserX size={14} /> Banni du service
                              </span>
                            ) : (
                              <span style={{ color: '#10B981', fontWeight: '800', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <UserCheck size={14} /> Actif
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {/* Bouton Bannir / Débannir */}
                              <button
                                type="button"
                                onClick={() => handleToggleBanUser(user)}
                                className="premium-button"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: user.isBanned ? '#10B981' : '#EF4444',
                                  color: '#FFF',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title={user.isBanned ? 'Débannir' : 'Bannir'}
                              >
                                {user.isBanned ? <UserCheck size={13} /> : <UserX size={13} />}
                                {user.isBanned ? 'Débannir' : 'Bannir'}
                              </button>

                              {/* Bouton Éditer Profil Utilisateur */}
                              <button
                                type="button"
                                onClick={() => setEditingUser({ ...user })}
                                className="premium-button"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                                  backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  color: 'inherit',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Éditer le profil utilisateur"
                              >
                                <Edit3 size={13} /> Éditer
                              </button>

                              {/* Bouton Ajuster Solde */}
                              <button
                                type="button"
                                onClick={() => {
                                  setBalanceModalUser(user);
                                  setDeltaTokens('');
                                  setDeltaEuros('');
                                }}
                                className="premium-button"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                                  backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  color: 'inherit',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                                title="Ajuster solde jetons/euros"
                              >
                                🪙 Solde
                              </button>

                              {/* Toggle Admin */}
                              <button
                                type="button"
                                onClick={() => handleToggleAdminStatus(user)}
                                className="premium-button"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(245,158,11,0.3)',
                                  backgroundColor: user.isAdmin ? 'rgba(245,158,11,0.2)' : 'transparent',
                                  color: '#F59E0B',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                }}
                                title={user.isAdmin ? 'Retirer Admin' : 'Donner Admin'}
                              >
                                🛡️
                              </button>

                              {/* Toggle KYC */}
                              <button
                                type="button"
                                onClick={() => handleToggleKycStatus(user)}
                                className="premium-button"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  backgroundColor: (user.kycVerified || user.verified) ? 'rgba(16,185,129,0.2)' : 'transparent',
                                  color: '#10B981',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                }}
                                title="Vérifier KYC"
                              >
                                ✓
                              </button>

                              {/* Supprimer définitivement */}
                              <button
                                type="button"
                                onClick={() => handleDeleteUserAccount(user)}
                                className="premium-button"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: 'rgba(239,68,68,0.15)',
                                  color: '#EF4444',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                                title="Supprimer le compte Firestore"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= ONGLET 2 : ANNONCES ================= */}
        {activeTab === 'listings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Filtres et recherche annonces */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                padding: '14px 18px',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, auteur ou mots-clés..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    fontSize: '13.5px',
                    fontWeight: '600',
                  }}
                />
              </div>

              <select
                value={listingCategoryFilter}
                onChange={(e) => setListingCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                  backgroundColor: darkMode ? '#26201C' : '#FAF8F5',
                  color: 'inherit',
                  fontSize: '12.5px',
                  fontWeight: '700',
                }}
              >
                <option value="all">Toutes les catégories</option>
                <option value="Bricolage">Bricolage</option>
                <option value="Informatique">Informatique</option>
                <option value="Jardinage">Jardinage</option>
                <option value="Cours & Coaching">Cours & Coaching</option>
                <option value="Musique">Musique</option>
                <option value="Outillage">Outillage</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* Grille des annonces */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {isLoadingListings ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Chargement en direct des annonces...
                </div>
              ) : filteredListings.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Aucune annonce trouvée.
                </div>
              ) : (
                filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    style={{
                      backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                      borderRadius: '18px',
                      border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', backgroundColor: 'rgba(198,125,91,0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                        {listing.category || 'Troc'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {listing.location || 'Local'}
                      </span>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', lineHeight: 1.3 }}>
                        {listing.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {listing.description}
                      </p>
                    </div>

                    <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#F59E0B' }}>
                      ⇄ Contrepartie : {listing.compensation || 'Troc équivalent'}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', borderTop: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Par <strong>{listing.author || 'Inconnu'}</strong></span>
                      <span>ID: {String(listing.id).slice(0, 6)}</span>
                    </div>

                    {/* Actions sur l'annonce */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => setEditingListing({ ...listing })}
                        className="premium-button"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: 'inherit',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Edit3 size={14} /> Éditer
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteListing(listing)}
                        className="premium-button"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          color: '#EF4444',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= ONGLET 3 : COMMUNAUTÉ & FLUX LIVE ================= */}
        {activeTab === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Barre de filtrage communauté */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                padding: '14px 18px',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Rechercher dans les messages du chat mondial..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    fontSize: '13.5px',
                    fontWeight: '600',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'all', label: 'Tous les flux' },
                  { id: 'urgent', label: '⚡ Urgents' },
                  { id: 'admin_edited', label: '✏️ Modifiés' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCommunityFilter(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: communityFilter === f.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      backgroundColor: communityFilter === f.id ? 'rgba(198,125,91,0.15)' : darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      color: communityFilter === f.id ? 'var(--accent-primary)' : 'inherit',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste en temps réel des messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isLoadingCommunity ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Connexion au flux en direct global_chat...
                </div>
              ) : filteredCommunity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Aucun message trouvé dans le flux mondial.
                </div>
              ) : (
                filteredCommunity.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                      borderRadius: '16px',
                      border: msg.isUrgent ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '14px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                      <img
                        src={msg.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '800', fontSize: '13.5px' }}>{msg.author || 'Membre'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{msg.authorUsername || '@membre'}</span>
                          {msg.isUrgent && (
                            <span style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#EF4444', color: '#FFF', padding: '1px 6px', borderRadius: '4px' }}>
                              ⚡ URGENT
                            </span>
                          )}
                          {msg.isEditedByAdmin && (
                            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#3B82F6', color: '#FFF', padding: '1px 6px', borderRadius: '4px' }}>
                              MODIFIÉ PAR ADMIN
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.45, color: 'inherit' }}>
                          {msg.text}
                        </p>
                      </div>
                    </div>

                    {/* Actions de modération rapide */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setEditingCommunityMsg({ ...msg })}
                        className="premium-button"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: 'inherit',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Edit3 size={13} /> Éditer
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickBanMessageAuthor(msg)}
                        className="premium-button"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          color: '#EF4444',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Bannir l'auteur"
                      >
                        <UserX size={13} /> Bannir Auteur
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCommunityMessage(msg.id)}
                        className="premium-button"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          color: '#EF4444',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                        title="Supprimer le message"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= ONGLET 4 : ÉCONOMIE & LITIGES ================= */}
        {activeTab === 'economy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Cards Économie */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Carte 1 : Jetons en circulation */}
              <div
                style={{
                  backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                  padding: '18px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Coins size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    Jetons en Circulation
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#F59E0B' }}>
                    🪙 {stats.totalTokensInEconomy}
                  </div>
                </div>
              </div>

              {/* Carte 2 : Euros en comptes */}
              <div
                style={{
                  backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                  padding: '18px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    Solde Euros Cumulé
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>
                    € {stats.totalEurosInEconomy.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Carte 3 : Volume transactions */}
              <div
                style={{
                  backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                  padding: '18px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    Transactions Enregistrées
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900' }}>
                    {stats.totalTransactions}
                  </div>
                </div>
              </div>

              {/* Carte 4 : Litiges actifs */}
              <div
                style={{
                  backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                  padding: '18px',
                  borderRadius: '16px',
                  border: stats.disputedTransactions > 0 ? '1px solid #EF4444' : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: stats.disputedTransactions > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    Litiges en Attente
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: stats.disputedTransactions > 0 ? '#EF4444' : 'inherit' }}>
                    ⚖️ {stats.disputedTransactions}
                  </div>
                </div>
              </div>
            </div>

            {/* Barre de recherche et filtres transactions */}
            <div
              style={{
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                padding: '16px',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="text"
                  placeholder="Rechercher par ID, utilisateur, type..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: 'Toutes les transactions' },
                  { id: 'disputed', label: `⚖️ Litiges (${stats.disputedTransactions})` },
                  { id: 'deal', label: '🤝 Deals' },
                  { id: 'admin_adjustment', label: '🪙 Ajustements Admin' },
                  { id: 'refunded', label: '↩️ Remboursées' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTxFilter(f.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: txFilter === f.id ? 'none' : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                      backgroundColor: txFilter === f.id ? (f.id === 'disputed' ? '#EF4444' : 'var(--accent-primary, #C67D5B)') : (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      color: txFilter === f.id ? '#FFF' : 'inherit',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tableau des transactions */}
            <div
              style={{
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)', backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Date & ID</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Type / Libellé</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Utilisateur / Initiateur</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Montant</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800' }}>Statut</th>
                      <th style={{ padding: '14px 18px', fontWeight: '800', textAlign: 'right' }}>Actions God Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingTransactions ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Chargement des transactions en direct...
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Aucune transaction trouvée.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isDisputed = Boolean(tx.isDisputed || tx.status === 'disputed' || tx.status === 'litige');
                        const isRefunded = tx.status === 'refunded';
                        const dateStr = (() => {
                          if (tx.createdAt?.toDate) return tx.createdAt.toDate().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          if (tx.timestamp?.toDate) return tx.timestamp.toDate().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          if (typeof tx.createdAt === 'string') return new Date(tx.createdAt).toLocaleDateString('fr-FR');
                          return 'Récent';
                        })();

                        return (
                          <tr
                            key={tx.id}
                            style={{
                              borderBottom: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
                              backgroundColor: isDisputed ? 'rgba(239,68,68,0.08)' : (isRefunded ? 'rgba(107,114,128,0.05)' : 'transparent'),
                            }}
                          >
                            {/* Date & ID */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: '700', fontSize: '12px' }}>{dateStr}</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                #{String(tx.id).slice(0, 10)}
                              </div>
                            </td>

                            {/* Type & Libellé */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{tx.label || tx.title || tx.type || 'Transaction'}</span>
                                {isDisputed && (
                                  <span style={{ fontSize: '10px', backgroundColor: '#EF4444', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
                                    LITIGE
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Type : <code>{tx.type || 'standard'}</code>
                              </div>
                            </td>

                            {/* Utilisateur */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: '700' }}>{tx.userName || tx.userId || 'Utilisateur'}</div>
                              {tx.partnerName && (
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  → {tx.partnerName}
                                </div>
                              )}
                            </td>

                            {/* Montant */}
                            <td style={{ padding: '14px 18px' }}>
                              {(tx.deltaTokens !== undefined || tx.tokens !== undefined) && (
                                <div style={{ fontWeight: '800', color: '#F59E0B' }}>
                                  🪙 {tx.deltaTokens || tx.tokens || 0} Jetons
                                </div>
                              )}
                              {(tx.deltaEuros !== undefined || tx.euros !== undefined || tx.amount !== undefined) && (
                                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                                  € {Number(tx.deltaEuros || tx.euros || tx.amount || 0).toFixed(2)}
                                </div>
                              )}
                            </td>

                            {/* Statut */}
                            <td style={{ padding: '14px 18px' }}>
                              {isDisputed ? (
                                <span style={{ color: '#EF4444', fontWeight: '800', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertTriangle size={13} /> En Litige
                                </span>
                              ) : isRefunded ? (
                                <span style={{ color: '#9CA3AF', fontWeight: '700', fontSize: '11.5px' }}>
                                  ↩️ Remboursée
                                </span>
                              ) : (
                                <span style={{ color: '#10B981', fontWeight: '800', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={13} /> Validée
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {isDisputed && (
                                  <button
                                    type="button"
                                    onClick={() => handleResolveDispute(tx)}
                                    className="premium-button"
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      backgroundColor: '#10B981',
                                      color: '#FFF',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                    }}
                                    title="Clôturer le litige et valider la transaction"
                                  >
                                    ⚖️ Résoudre
                                  </button>
                                )}

                                {!isRefunded && (
                                  <button
                                    type="button"
                                    onClick={() => handleRefundTransaction(tx)}
                                    className="premium-button"
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                                      backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                      color: 'inherit',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                    }}
                                    title="Rembourser la transaction à l'utilisateur"
                                  >
                                    ↩️ Rembourser
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(tx)}
                                  className="premium-button"
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'rgba(239,68,68,0.15)',
                                    color: '#EF4444',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                  title="Supprimer la transaction de Firestore"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= ONGLET 5 : TEXTES GLOBAUX (CMS) ================= */}
        {activeTab === 'cms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                padding: '20px',
                borderRadius: '18px',
                border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '900' }}>
                  CMS & Dictionnaire Dynamique (Collection: <code style={{ color: 'var(--accent-primary)' }}>global_content</code>)
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Modifiez n'importe quel texte clé du site en direct. La mise à jour est immédiatement répercutée sur tous les utilisateurs connectés grâce au hook <code>useGlobalContent()</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingNewCms(!isAddingNewCms)}
                className="premium-button"
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, #A8644A 100%)',
                  color: '#FFF',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={16} /> Ajouter une clé globale
              </button>
            </div>

            {/* Formulaire ajout de nouvelle clé */}
            {isAddingNewCms && (
              <form
                onSubmit={handleCreateNewCmsKey}
                style={{
                  backgroundColor: darkMode ? '#221D18' : '#FAF8F5',
                  padding: '20px',
                  borderRadius: '18px',
                  border: '1px solid var(--accent-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>Créer une nouvelle clé de texte globale</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Nom de la clé (ex: promo_banner_text)"
                    value={newCmsKey}
                    onChange={(e) => setNewCmsKey(e.target.value)}
                    required
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: darkMode ? '#14110E' : '#FFFFFF',
                      color: 'inherit',
                      fontSize: '13px',
                      fontWeight: '700',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Valeur du texte affiché..."
                    value={newCmsVal}
                    onChange={(e) => setNewCmsVal(e.target.value)}
                    required
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: darkMode ? '#14110E' : '#FFFFFF',
                      color: 'inherit',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCms(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'none',
                      color: 'inherit',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="premium-button"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10B981',
                      color: '#FFF',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    Enregistrer la clé
                  </button>
                </div>
              </form>
            )}

            {/* Liste des entrées de textes globaux */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(globalContent).map(([key, val]) => {
                const isEditing = cmsEditKey === key;
                return (
                  <div
                    key={key}
                    style={{
                      backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                      borderRadius: '18px',
                      border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '13px', fontWeight: '900', color: 'var(--accent-primary)', backgroundColor: 'rgba(198,125,91,0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                          useGlobalContent('{key}')
                        </code>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          ID Document Firestore: <strong>{key}</strong>
                        </span>
                      </div>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setCmsEditKey(key);
                            setCmsEditValue(val);
                          }}
                          className="premium-button"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            color: 'inherit',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit3 size={13} /> Modifier
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                          rows="4"
                          value={cmsEditValue}
                          onChange={(e) => setCmsEditValue(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '2px solid var(--accent-primary)',
                            backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                            color: 'inherit',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setCmsEditKey(null)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'none',
                              color: 'inherit',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCmsItem(key, cmsEditValue)}
                            className="premium-button"
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#10B981',
                              color: '#FFF',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Save size={14} /> Sauvegarder & Diffuser en direct
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '13.5px',
                          lineHeight: 1.5,
                          padding: '12px 14px',
                          borderRadius: '10px',
                          backgroundColor: darkMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)',
                          border: '1px solid var(--border-color)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {val || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Valeur vide</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALE ÉDITION ANNONCE ================= */}
      {editingListing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000001,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setEditingListing(null)}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              color: 'inherit',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>
                ✏️ Éditer l'annonce en direct
              </h3>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800' }}>Titre de l'annonce</label>
              <input
                type="text"
                value={editingListing.title || ''}
                onChange={(e) => setEditingListing({ ...editingListing, title: e.target.value })}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                  color: 'inherit',
                  fontSize: '13.5px',
                  fontWeight: '700',
                }}
              />

              <label style={{ fontSize: '12px', fontWeight: '800' }}>Description détaillée</label>
              <textarea
                rows="4"
                value={editingListing.description || ''}
                onChange={(e) => setEditingListing({ ...editingListing, description: e.target.value })}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                  color: 'inherit',
                  fontSize: '13px',
                  lineHeight: 1.4,
                }}
              />

              <label style={{ fontSize: '12px', fontWeight: '800' }}>Contrepartie / Modalités de troc</label>
              <input
                type="text"
                value={editingListing.compensation || ''}
                onChange={(e) => setEditingListing({ ...editingListing, compensation: e.target.value })}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                  color: 'inherit',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'inherit',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveListingEdit}
                className="premium-button"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                Enregistrer & Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALE ÉDITION MESSAGE COMMUNAUTÉ ================= */}
      {editingCommunityMsg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000001,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setEditingCommunityMsg(null)}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              color: 'inherit',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900' }}>
                ✏️ Modérer le message de {editingCommunityMsg.author}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCommunityMsg(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              rows="4"
              value={editingCommunityMsg.text || ''}
              onChange={(e) => setEditingCommunityMsg({ ...editingCommunityMsg, text: e.target.value })}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                color: 'inherit',
                fontSize: '13.5px',
                lineHeight: 1.45,
              }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditingCommunityMsg(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'inherit',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveCommunityMessageEdit}
                className="premium-button"
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                Enregistrer la modification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALE AJUSTEMENT DE SOLDE ================= */}
      {balanceModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000001,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setBalanceModalUser(null)}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              color: 'inherit',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>
                🪙 Ajuster le solde de {balanceModalUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Solde actuel : <strong>{balanceModalUser.trocoTokens || 0} Jetons</strong> • <strong>{(balanceModalUser.euroBalance || 0).toFixed(2)} €</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Variation Jetons Troco (+ / -)
                </label>
                <input
                  type="number"
                  placeholder="ex: +15 ou -5"
                  value={deltaTokens}
                  onChange={(e) => setDeltaTokens(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '14px',
                    fontWeight: '800',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Variation Solde Euros (+ / - €)
                </label>
                <input
                  type="number"
                  step="0.50"
                  placeholder="ex: +20.00 ou -10.00"
                  value={deltaEuros}
                  onChange={(e) => setDeltaEuros(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '14px',
                    fontWeight: '800',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'inherit',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveBalanceAdjustment}
                className="premium-button"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFF',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                Appliquer la variation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALE ÉDITION UTILISATEUR ================= */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000001,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setEditingUser(null)}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              color: 'inherit',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>
                ✏️ Éditer le profil de {editingUser.name || 'l\'utilisateur'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Nom complet
                </label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Identifiant (@username)
                </label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Localisation / Ville
                </label>
                <input
                  type="text"
                  value={editingUser.location || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                  Bio & Description
                </label>
                <textarea
                  rows="3"
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                    color: 'inherit',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                    🪙 Solde Jetons Troco
                  </label>
                  <input
                    type="number"
                    value={editingUser.trocoTokens ?? 0}
                    onChange={(e) => setEditingUser({ ...editingUser, trocoTokens: Number(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                      color: 'inherit',
                      fontSize: '13.5px',
                      fontWeight: '800',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                    💶 Solde Euros (€)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingUser.euroBalance ?? 0}
                    onChange={(e) => setEditingUser({ ...editingUser, euroBalance: Number(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                      color: 'inherit',
                      fontSize: '13.5px',
                      fontWeight: '800',
                    }}
                  />
                </div>
              </div>

              {/* Toggles Statuts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser.isAdmin)}
                    onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#F59E0B' }}
                  />
                  <span>🛡️ Droits Administrateur Troco</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser.kycVerified || editingUser.verified)}
                    onChange={(e) => setEditingUser({ ...editingUser, kycVerified: e.target.checked, verified: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                  />
                  <span>✅ Compte Certifié / KYC Vérifié</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#EF4444' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser.isBanned)}
                    onChange={(e) => setEditingUser({ ...editingUser, isBanned: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#EF4444' }}
                  />
                  <span>⛔ Compte Banni du service</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'inherit',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveUserEdit}
                className="premium-button"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFF',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Save size={16} /> Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
