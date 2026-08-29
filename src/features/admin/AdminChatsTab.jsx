import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare, Search, Trash2,
  Coins, Send, RefreshCw
} from 'lucide-react';
import {
  collection, doc, onSnapshot, query, orderBy, limit,
  addDoc, deleteDoc, updateDoc, serverTimestamp, runTransaction
} from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminChatsTab({
  darkMode = false,
  showToast = () => {},
  currentUser = null,
}) {
  const [chatsList, setChatsList] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'disputed' | 'deal' | 'reported'

  // Chat sélectionné pour inspection approfondie
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [arbitrationText, setArbitrationText] = useState('');
  const [isSendingArbitration, setIsSendingArbitration] = useState(false);
  const [isProcessingDeal, setIsProcessingDeal] = useState(false);

  // 1. Écoute temps réel de la collection chats
  useEffect(() => {
    if (!db) return;
    let unsubscribe = () => {};

    try {
      const q = query(collection(db, 'chats'), limit(100));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = [];
          snapshot.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
          list.sort((a, b) => {
            const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp || 0));
            const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp || 0));
            return tB - tA;
          });
          setChatsList(list);
          setIsLoadingChats(false);
        },
        (err) => {
          console.warn('[AdminChatsTab] Erreur écoute chats:', err);
          setIsLoadingChats(false);
        }
      );
    } catch (e) {
      console.warn('[AdminChatsTab] Exception chats:', e);
      setIsLoadingChats(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 2. Écoute temps réel des messages du chat inspecté
  useEffect(() => {
    if (!db || !selectedChat?.id) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    let unsubscribe = () => {};

    try {
      const q = query(
        collection(db, 'chats', String(selectedChat.id), 'messages'),
        orderBy('createdAt', 'asc'),
        limit(150)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs = [];
          snapshot.forEach((docSnap) => {
            msgs.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
          setMessages(msgs);
          setIsLoadingMessages(false);
        },
        () => {
          try {
            const fallbackQ = query(
              collection(db, 'chats', String(selectedChat.id), 'messages'),
              limit(150)
            );
            unsubscribe = onSnapshot(fallbackQ, (snapshot) => {
              const msgs = [];
              snapshot.forEach((docSnap) => {
                msgs.push({
                  id: docSnap.id,
                  ...docSnap.data(),
                });
              });
              msgs.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp || 0);
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp || 0);
                return tA - tB;
              });
              setMessages(msgs);
              setIsLoadingMessages(false);
            });
          } catch (_) {
            setIsLoadingMessages(false);
          }
        }
      );
    } catch (e) {
      setIsLoadingMessages(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedChat?.id]);

  // Filtrage des chats
  const filteredChats = useMemo(() => {
    return (chatsList || []).filter((chat) => {
      const q = (search || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (chat.id && String(chat.id).toLowerCase().includes(q)) ||
        (chat.itemTitle && chat.itemTitle.toLowerCase().includes(q)) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(q)) ||
        (chat.users && chat.users.some(u => String(u).toLowerCase().includes(q))) ||
        (chat.participantNames && Object.values(chat.participantNames).some(name => String(name).toLowerCase().includes(q)));

      if (!matchSearch) return false;
      if (filter === 'disputed') return Boolean(chat.isDisputed || chat.status === 'disputed' || chat.reported);
      if (filter === 'deal') return Boolean(chat.deal || chat.dealStatus || chat.tokensAmount || chat.euroAmount);
      if (filter === 'reported') return Boolean(chat.reported || chat.reportReason);

      return true;
    });
  }, [chatsList, search, filter]);

  // Envoi d'un message officiel d'arbitrage Admin dans le fil du chat
  const handleSendArbitrationMessage = async (e) => {
    if (e) e.preventDefault();
    if (!arbitrationText.trim() || !selectedChat?.id) return;

    setIsSendingArbitration(true);
    try {
      const msgPayload = {
        text: `⚖️ [ARBITRAGE OFFICIEL ADMIN] : ${arbitrationText.trim()}`,
        author: 'Gouvernance & Sécurité Troco',
        authorName: 'Support Modération Troco',
        senderId: currentUser?.uid || 'admin_god_mode',
        isAdminOfficial: true,
        isSystem: true,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'chats', String(selectedChat.id), 'messages'), msgPayload);

      // Met à jour les métadonnées du chat
      await updateDoc(doc(db, 'chats', String(selectedChat.id)), {
        lastMessage: `⚖️ Décision d'arbitrage admin envoyée`,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast('⚖️ Message officiel d\'arbitrage diffusé dans le chat !');
      setArbitrationText('');
    } catch (err) {
      alert('Erreur envoi arbitrage : ' + err.message);
    } finally {
      setIsSendingArbitration(false);
    }
  };

  // Suppression d'un message individuel dans le chat
  const handleDeleteChatMessage = async (msgId) => {
    if (!window.confirm('🗑️ Supprimer définitivement ce message de la discussion ?')) return;

    try {
      await deleteDoc(doc(db, 'chats', String(selectedChat.id), 'messages', String(msgId)));
      showToast('Message de discussion supprimé de Firestore.');
    } catch (err) {
      alert('Erreur suppression message : ' + err.message);
    }
  };

  // Remboursement des Jetons / Euros au payeur
  const handleRefundDeal = async () => {
    if (!selectedChat) return;
    const deal = selectedChat.deal || {};
    const buyerUid = deal.buyerUid || deal.payerUid || (selectedChat.users && selectedChat.users[0]);
    const tokensAmount = Number(deal.tokens || deal.trocoTokens || selectedChat.tokensAmount) || 0;
    const euroAmount = Number(deal.euroAmount || selectedChat.euroAmount) || 0;

    if (!buyerUid) {
      alert("Impossible de déterminer l'UID du payeur pour ce deal.");
      return;
    }

    if (!window.confirm(`↩️ REMBOURSER ${tokensAmount} TrocoTokens et ${euroAmount} € à l'utilisateur ${buyerUid} et clore le litige ?`)) return;

    setIsProcessingDeal(true);
    try {
      await runTransaction(db, async (t) => {
        const buyerRef = doc(db, 'users', String(buyerUid));
        const buyerSnap = await t.get(buyerRef);
        if (buyerSnap.exists()) {
          const currentTokens = Number(buyerSnap.data().trocoTokens) || 0;
          const currentEuros = Number(buyerSnap.data().euroBalance) || 0;
          t.update(buyerRef, {
            trocoTokens: currentTokens + tokensAmount,
            euroBalance: currentEuros + euroAmount,
            updatedAt: serverTimestamp(),
          });
        }

        // Crée une transaction de remboursement
        const txRef = doc(collection(db, 'transactions'));
        t.set(txRef, {
          type: 'deal_refund_admin',
          chatId: selectedChat.id,
          buyerUid,
          tokensAmount,
          euroAmount,
          status: 'refunded_by_admin',
          resolvedBy: currentUser?.email || 'admin',
          createdAt: serverTimestamp(),
        });

        // Met à jour le chat
        const chatRef = doc(db, 'chats', String(selectedChat.id));
        t.update(chatRef, {
          isDisputed: false,
          dealStatus: 'refunded_by_admin',
          'deal.status': 'refunded_by_admin',
          lastMessage: `↩️ Transaction remboursée par l'administrateur (${tokensAmount} T - ${euroAmount} €).`,
          updatedAt: serverTimestamp(),
        });
      });

      // Ajoute message système dans le chat
      await addDoc(collection(db, 'chats', String(selectedChat.id), 'messages'), {
        text: `⚖️ [DÉCISION D'ARBITRAGE] : La transaction a été annulée et ${tokensAmount} TrocoTokens (+ ${euroAmount} €) ont été intégralement recrédités au payeur.`,
        author: 'Arbitrage Troco',
        isAdminOfficial: true,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      showToast(`✅ Remboursement de ${tokensAmount} jetons / ${euroAmount} € effectué avec succès !`);
    } catch (err) {
      alert('Erreur lors du remboursement : ' + err.message);
    } finally {
      setIsProcessingDeal(false);
    }
  };

  // Libération des Jetons / Euros au prestataire
  const handleReleaseDeal = async () => {
    if (!selectedChat) return;
    const deal = selectedChat.deal || {};
    const sellerUid = deal.sellerUid || deal.receiverUid || (selectedChat.users && selectedChat.users[1]);
    const tokensAmount = Number(deal.tokens || deal.trocoTokens || selectedChat.tokensAmount) || 0;
    const euroAmount = Number(deal.euroAmount || selectedChat.euroAmount) || 0;

    if (!sellerUid) {
      alert("Impossible de déterminer l'UID du prestataire pour ce deal.");
      return;
    }

    if (!window.confirm(`🪙 LIBÉRER ${tokensAmount} TrocoTokens et ${euroAmount} € au prestataire ${sellerUid} ?`)) return;

    setIsProcessingDeal(true);
    try {
      await runTransaction(db, async (t) => {
        const sellerRef = doc(db, 'users', String(sellerUid));
        const sellerSnap = await t.get(sellerRef);
        if (sellerSnap.exists()) {
          const currentTokens = Number(sellerSnap.data().trocoTokens) || 0;
          const currentEuros = Number(sellerSnap.data().euroBalance) || 0;
          t.update(sellerRef, {
            trocoTokens: currentTokens + tokensAmount,
            euroBalance: currentEuros + euroAmount,
            dealsCompleted: (Number(sellerSnap.data().dealsCompleted) || 0) + 1,
            updatedAt: serverTimestamp(),
          });
        }

        const txRef = doc(collection(db, 'transactions'));
        t.set(txRef, {
          type: 'deal_release_admin',
          chatId: selectedChat.id,
          sellerUid,
          tokensAmount,
          euroAmount,
          status: 'completed_by_admin',
          resolvedBy: currentUser?.email || 'admin',
          createdAt: serverTimestamp(),
        });

        const chatRef = doc(db, 'chats', String(selectedChat.id));
        t.update(chatRef, {
          isDisputed: false,
          dealStatus: 'completed_by_admin',
          'deal.status': 'completed_by_admin',
          lastMessage: `🪙 Fonds débloqués et versés par l'administrateur (${tokensAmount} T - ${euroAmount} €).`,
          updatedAt: serverTimestamp(),
        });
      });

      await addDoc(collection(db, 'chats', String(selectedChat.id), 'messages'), {
        text: `⚖️ [DÉCISION D'ARBITRAGE] : La mission a été validée par la modération. ${tokensAmount} TrocoTokens (+ ${euroAmount} €) ont été versés au prestataire.`,
        author: 'Arbitrage Troco',
        isAdminOfficial: true,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      showToast(`🪙 Jetons débloqués pour le prestataire avec succès !`);
    } catch (err) {
      alert('Erreur libération : ' + err.message);
    } finally {
      setIsProcessingDeal(false);
    }
  };

  // Suppression complète du chat de Firestore
  const handleDeleteEntireChat = async (chat) => {
    if (!window.confirm(`🗑️ Supprimer TOTALEMENT la discussion "${chat.itemTitle || chat.id}" de Firestore ?`)) return;

    try {
      await deleteDoc(doc(db, 'chats', String(chat.id)));
      showToast('Discussion supprimée de Firestore.');
      if (selectedChat?.id === chat.id) {
        setSelectedChat(null);
      }
    } catch (err) {
      alert('Erreur suppression discussion : ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Barre d'en-tête & filtres */}
      <div
        style={{
          backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
          padding: '16px 20px',
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
            placeholder="Rechercher discussion par participant, titre, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: `Toutes les discussions (${chatsList.length})` },
            { id: 'disputed', label: '⚖️ Litiges & Bloqués' },
            { id: 'deal', label: '🤝 Avec Deals & Jetons' },
            { id: 'reported', label: '🚩 Signalées' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: filter === f.id ? 'none' : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                backgroundColor: filter === f.id ? 'var(--accent-primary, #C67D5B)' : (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                color: filter === f.id ? '#FFF' : 'inherit',
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

      {/* Disposition en Split View (Liste des discussions à gauche / Inspection à droite) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.4fr)', gap: '20px', alignItems: 'start' }}>
        {/* Colonne Gauche : Liste des discussions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '720px', overflowY: 'auto', paddingRight: '4px' }}>
          {isLoadingChats ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Chargement des discussions Firestore...
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune discussion trouvée.
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const isDisputed = Boolean(chat.isDisputed || chat.status === 'disputed' || chat.reported);

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    backgroundColor: isSelected
                      ? (darkMode ? '#241F1A' : '#F5EBE6')
                      : (darkMode ? '#1A1613' : '#FFFFFF'),
                    borderRadius: '16px',
                    border: isSelected
                      ? '2px solid var(--accent-primary, #C67D5B)'
                      : isDisputed
                      ? '1.5px solid #EF4444'
                      : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} color="var(--accent-primary, #C67D5B)" />
                      <span>{chat.itemTitle || `Discussion ${String(chat.id).slice(0, 8)}`}</span>
                    </div>
                    {isDisputed && (
                      <span style={{ fontSize: '10px', backgroundColor: '#EF4444', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontWeight: '900' }}>
                        LITIGE / SIGNALÉ
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.lastMessage || 'Aucun message'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>👥 {(chat.users || []).length} participants</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEntireChat(chat);
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontWeight: '700',
                        padding: '2px 4px',
                      }}
                      title="Supprimer la discussion"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Colonne Droite : Inspecteur de conversation & Arbitrage */}
        <div
          style={{
            backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
            display: 'flex',
            flexDirection: 'column',
            height: '720px',
            overflow: 'hidden',
          }}
        >
          {selectedChat ? (
            <>
              {/* En-tête de la discussion inspectée */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  backgroundColor: darkMode ? '#141210' : '#FAF8F5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{selectedChat.itemTitle || `Chat ID: ${selectedChat.id}`}</span>
                    {selectedChat.isDisputed && (
                      <span style={{ fontSize: '10px', backgroundColor: '#EF4444', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontWeight: '900' }}>
                        LITIGE EN COURS
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Participants : {(selectedChat.users || []).join(' ↔ ')}
                  </div>
                </div>

                {/* Actions d'arbitrage de litige */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleRefundDeal}
                    disabled={isProcessingDeal}
                    className="premium-button"
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#EF4444',
                      color: '#FFF',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: isProcessingDeal ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Rembourser intégralement l'acheteur et clore le litige"
                  >
                    <RefreshCw size={13} /> Rembourser Payeur
                  </button>

                  <button
                    type="button"
                    onClick={handleReleaseDeal}
                    disabled={isProcessingDeal}
                    className="premium-button"
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10B981',
                      color: '#FFF',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: isProcessingDeal ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Libérer les jetons et euros au prestataire"
                  >
                    <Coins size={13} /> Libérer Prestataire
                  </button>
                </div>
              </div>

              {/* Fil des messages en temps réel */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  backgroundColor: darkMode ? '#12100E' : '#FDFCFB',
                }}
              >
                {isLoadingMessages ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    Lecture des messages de la discussion...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    Aucun message échangé dans cette discussion.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSystem = Boolean(m.isSystem || m.isAdminOfficial);
                    const dateStr = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isSystem ? 'center' : 'flex-start',
                          maxWidth: isSystem ? '90%' : '80%',
                          backgroundColor: isSystem
                            ? 'rgba(198, 125, 91, 0.15)'
                            : (darkMode ? '#1E1A16' : '#FFFFFF'),
                          border: isSystem
                            ? '1.5px solid var(--accent-primary, #C67D5B)'
                            : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                          borderRadius: '14px',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: isSystem ? 'var(--accent-primary, #C67D5B)' : 'inherit' }}>
                            {m.author || m.authorName || 'Membre'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{dateStr}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteChatMessage(m.id)}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '0',
                                fontSize: '11px',
                              }}
                              title="Supprimer ce message"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '13px', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulaire d'envoi d'arbitrage officiel */}
              <form
                onSubmit={handleSendArbitrationMessage}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  backgroundColor: darkMode ? '#141210' : '#FAF8F5',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  placeholder="Écrire un message d'arbitrage officiel (visible par les deux utilisateurs)..."
                  value={arbitrationText}
                  onChange={(e) => setArbitrationText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                    backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                    color: 'inherit',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSendingArbitration || !arbitrationText.trim()}
                  className="premium-button"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: 'var(--accent-primary, #C67D5B)',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: isSendingArbitration || !arbitrationText.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} /> Envoyer Arbitrage
                </button>
              </form>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px',
                color: 'var(--text-secondary)',
                padding: '40px',
              }}
            >
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Sélectionnez une discussion</div>
              <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '300px' }}>
                Cliquez sur une discussion à gauche pour inspecter les messages, envoyer un arbitrage officiel ou débloquer/rembourser les fonds d'un litige.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
