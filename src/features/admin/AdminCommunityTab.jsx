import React, { useState, useMemo } from 'react';
import {
  Search, Trash2, Edit3, Save, UserX
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminCommunityTab({
  communityMessages = [],
  isLoading = false,
  darkMode = false,
  showToast = () => {},
  currentUser = null,
  usersList = [],
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'urgent' | 'admin_edited' | 'community' | 'global'
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtrage réactif
  const filteredMessages = useMemo(() => {
    return (communityMessages || []).filter((msg) => {
      const q = (search || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (msg.text && msg.text.toLowerCase().includes(q)) ||
        (msg.author && msg.author.toLowerCase().includes(q)) ||
        (msg.authorUsername && msg.authorUsername.toLowerCase().includes(q)) ||
        (msg.id && String(msg.id).toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (filter === 'urgent') return Boolean(msg.isUrgent);
      if (filter === 'admin_edited') return Boolean(msg.isEditedByAdmin);
      if (filter === 'community') return msg._collection === 'community_messages';
      if (filter === 'global') return msg._collection === 'global_chat';

      return true;
    });
  }, [communityMessages, search, filter]);

  // Sauvegarde directe de la modification du message
  const handleSaveEdit = async (msg) => {
    if (!editingText.trim()) return;
    setIsSaving(true);
    try {
      const collName = msg._collection || 'community_messages';
      const msgRef = doc(db, collName, String(msg.id));
      await updateDoc(msgRef, {
        text: editingText.trim(),
        isEditedByAdmin: true,
        editedAt: serverTimestamp(),
        editedBy: currentUser?.email || 'admin',
      });

      showToast('✅ Message communauté mis à jour et diffusé en direct !');
      setEditingMsgId(null);
      setEditingText('');
    } catch (err) {
      alert('Erreur modification message : ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Suppression directe du message sur Firestore
  const handleDeleteMessage = async (msg) => {
    if (!window.confirm(`🗑️ Supprimer définitivement ce message de "${msg.author || 'Auteur'}" sur Firestore ?`)) return;

    try {
      const collName = msg._collection || 'community_messages';
      await deleteDoc(doc(db, collName, String(msg.id)));
      showToast('🗑️ Message supprimé en temps réel de Firestore.');
      if (editingMsgId === msg.id) {
        setEditingMsgId(null);
      }
    } catch (err) {
      alert('Erreur suppression message : ' + err.message);
    }
  };

  // Bannissement rapide de l'auteur
  const handleBanAuthor = async (msg) => {
    const authorName = msg.author || 'Membre';
    const authorUid = msg.authorUid || msg.userId;

    if (!window.confirm(`🚨 BANNIR immédiatement l'auteur "${authorName}" de la plateforme ?`)) return;

    try {
      if (authorUid) {
        await updateDoc(doc(db, 'users', String(authorUid)), {
          isBanned: true,
          bannedAt: serverTimestamp(),
          bannedReason: `Message communauté abusif: "${msg.text?.slice(0, 50)}..."`,
          updatedAt: serverTimestamp(),
        });
      } else {
        const target = (usersList || []).find(u => u.name === msg.author || u.username === msg.authorUsername);
        if (target) {
          await updateDoc(doc(db, 'users', String(target.id)), {
            isBanned: true,
            bannedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Supprime également le message
      const collName = msg._collection || 'community_messages';
      await deleteDoc(doc(db, collName, String(msg.id)));

      showToast(`⛔ Auteur "${authorName}" banni et message supprimé.`);
    } catch (err) {
      alert('Erreur bannissement : ' + err.message);
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
            placeholder="Rechercher par mot-clé, auteur, UID..."
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
            { id: 'all', label: `Tous les messages (${communityMessages.length})` },
            { id: 'urgent', label: '🚨 Urgents' },
            { id: 'admin_edited', label: '✏️ Modifiés Admin' },
            { id: 'community', label: '💬 Community' },
            { id: 'global', label: '🌍 Global Live' },
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

      {/* Flux des messages temps réel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              color: 'var(--text-secondary)',
            }}
          >
            Connexion au flux en direct (community_messages & global_chat)...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              color: 'var(--text-secondary)',
            }}
          >
            Aucun message ne correspond à votre filtre.
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isEditing = editingMsgId === msg.id;
            const dateStr = (() => {
              if (msg.createdAt?.toDate) return msg.createdAt.toDate().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              if (msg.timestamp?.toDate) return msg.timestamp.toDate().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              if (typeof msg.createdAt === 'string') return new Date(msg.createdAt).toLocaleDateString('fr-FR');
              return 'En direct';
            })();

            return (
              <div
                key={`${msg._collection || 'msg'}_${msg.id}`}
                style={{
                  backgroundColor: darkMode ? '#1A1613' : '#FFFFFF',
                  borderRadius: '18px',
                  border: msg.isUrgent
                    ? '1px solid #EF4444'
                    : msg.isEditedByAdmin
                    ? '1px solid #F59E0B'
                    : '1px solid var(--border-color, rgba(0,0,0,0.08))',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                {/* En-tête auteur & métadonnées */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={msg.avatar || msg.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt=""
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{msg.author || 'Auteur anonyme'}</span>
                        {msg.authorUsername && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            @{msg.authorUsername.replace('@', '')}
                          </span>
                        )}
                        {msg.isUrgent && (
                          <span style={{ fontSize: '10px', backgroundColor: '#EF4444', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
                            URGENT
                          </span>
                        )}
                        {msg.isEditedByAdmin && (
                          <span style={{ fontSize: '10px', backgroundColor: '#F59E0B', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
                            MODIFIÉ PAR ADMIN
                          </span>
                        )}
                        <span style={{ fontSize: '10px', backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {msg._collection || 'community_messages'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {dateStr} • ID: <code>{String(msg.id).slice(0, 8)}</code>
                      </div>
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMsgId(msg.id);
                          setEditingText(msg.text || '');
                        }}
                        className="premium-button"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                          backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: 'inherit',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Modifier ce message en direct"
                      >
                        <Edit3 size={13} /> Modifier
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleBanAuthor(msg)}
                      className="premium-button"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'rgba(239,68,68,0.12)',
                        color: '#EF4444',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Bannir l'auteur de ce message"
                    >
                      <UserX size={13} /> Bannir Auteur
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg)}
                      className="premium-button"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#EF4444',
                        color: '#FFF',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Supprimer définitivement ce message"
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                </div>

                {/* Corps du message ou Éditeur In-line */}
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <textarea
                      rows="3"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      placeholder="Modifier le contenu du message..."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '2px solid var(--accent-primary, #C67D5B)',
                        backgroundColor: darkMode ? '#12100E' : '#FAF8F5',
                        color: 'inherit',
                        fontSize: '13.5px',
                        lineHeight: 1.5,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMsgId(null);
                          setEditingText('');
                        }}
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
                        onClick={() => handleSaveEdit(msg)}
                        disabled={isSaving}
                        className="premium-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#10B981',
                          color: '#FFF',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Save size={14} /> {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.5,
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: darkMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)',
                      border: '1px solid var(--border-color, rgba(0,0,0,0.05))',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.text || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Message vide</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
