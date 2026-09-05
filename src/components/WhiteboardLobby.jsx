/**
 * WhiteboardLobby.jsx — Écran d'accueil & Historique multi-tableaux blancs (Phase 102)
 *
 * 2 gros boutons centrés :
 * 1. "Créer un nouveau tableau"
 * 2. "Reprendre le dernier tableau"
 * + Liste et recherche des projets créatifs de la conversation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  RotateCcw,
  Sparkles,
  Palette,
  FolderKanban,
  Clock,
  ArrowRight,
  Search,
  RefreshCw,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Récemment';
  const now = Date.now();
  const diffMs = now - Number(timestamp);
  if (diffMs < 0) return "À l'instant";
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export default function WhiteboardLobby({
  onSelect: propOnSelect,
  onCreateNew: propOnCreateNew,
  onSelectBoard,
  onCreateNewBoard,
  onClose = () => {},
  chatId,
  selectedChat = null,
  darkMode = false,
  projectTitle = 'Tableaux Blancs Collaboratifs',
}) {
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveChatId = String(
    chatId || selectedChat?.id || selectedChat?.firestoreId || ''
  );

  const onCreateNew = (forcedId = null) => {
    try {
      const newBoardId = (typeof forcedId === 'string' && forcedId) ? forcedId : `board_${effectiveChatId || 'chat'}_${Date.now()}`;
      setCurrentBoardId(newBoardId);
      if (typeof propOnCreateNew === 'function') {
        propOnCreateNew(newBoardId);
      }
      if (typeof onCreateNewBoard === 'function' && propOnCreateNew !== onCreateNewBoard) {
        onCreateNewBoard(newBoardId);
      }
    } catch (err) {
      console.error('[WhiteboardLobby] Erreur dans onCreateNew:', err);
    }
  };

  const onSelect = (boardId, bData = null) => {
    try {
      setCurrentBoardId(boardId);
      if (typeof propOnSelect === 'function') {
        propOnSelect(boardId);
      }
      if (typeof onSelectBoard === 'function') {
        const data = bData || boards.find(b => b.id === boardId || b.boardId === boardId) || null;
        onSelectBoard(boardId, data);
      }
    } catch (err) {
      console.error('[WhiteboardLobby] Erreur dans onSelect:', err);
    }
  };

  const handleCreate = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      // 🚨 PHASE FIX : Génération obligatoire d'un ID unique pour isoler le nouveau canvas
      const newBoardId = `board_${effectiveChatId || 'chat'}_${Date.now()}`;
      setCurrentBoardId(newBoardId);
      let handled = false;
      if (typeof propOnCreateNew === 'function') {
        propOnCreateNew(newBoardId);
        handled = true;
      }
      if (typeof onCreateNewBoard === 'function' && (!handled || propOnCreateNew !== onCreateNewBoard)) {
        onCreateNewBoard(newBoardId);
        handled = true;
      }
      if (!handled) {
        if (typeof propOnSelect === 'function') {
          propOnSelect(newBoardId);
        } else if (typeof onSelectBoard === 'function') {
          onSelectBoard(newBoardId, { id: newBoardId, title: 'Nouveau Tableau Blanc' });
        }
      }
    } catch (err) {
      console.error('[WhiteboardLobby] Erreur lors de la création d\'un nouveau tableau blanc:', err);
    }
  };

  const handleResume = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      if (history.length > 0) {
        const targetBoard = history[0];
        const targetId = targetBoard.id || targetBoard.boardId;
        setCurrentBoardId(targetId);
        if (typeof propOnSelect === 'function') {
          propOnSelect(targetId);
        }
        if (typeof onSelectBoard === 'function' && propOnSelect !== onSelectBoard) {
          onSelectBoard(targetId, targetBoard);
        }
      } else {
        handleCreate(e);
      }
    } catch (err) {
      console.error('[WhiteboardLobby] Erreur lors de la reprise du dernier tableau:', err);
    }
  };

  const handleSelect = (boardId, boardData = null) => {
    try {
      setCurrentBoardId(boardId);
      if (typeof propOnSelect === 'function') {
        propOnSelect(boardId);
      }
      if (typeof onSelectBoard === 'function') {
        onSelectBoard(boardId, boardData || boards.find(b => b.id === boardId || b.boardId === boardId) || null);
      }
    } catch (err) {
      console.error('[WhiteboardLobby] Erreur lors de la sélection du tableau:', err);
    }
  };

  // Synchronisation temps réel Firestore : interrogation de 'workspaces' et 'project_whiteboards'
  useEffect(() => {
    if (!db || !effectiveChatId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;
    const boardsMap = new Map();

    const qWorkspaces = query(
      collection(db, 'workspaces'),
      where('chatId', '==', effectiveChatId),
      where('type', '==', 'whiteboard')
    );

    const qLegacy = query(
      collection(db, 'project_whiteboards'),
      where('groupId', '==', effectiveChatId)
    );

    const updateCombinedBoards = () => {
      if (!isMounted) return;
      const combined = Array.from(boardsMap.values());
      combined.sort((a, b) => (Number(b.lastModified || b.updatedAt || 0)) - (Number(a.lastModified || a.updatedAt || 0)));
      setBoards(combined);
      setIsLoading(false);
    };

    const unsubWorkspaces = onSnapshot(
      qWorkspaces,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const docId = data.id || data.workspaceId || docSnap.id;
          const ts = data.updatedAt?.toMillis
            ? data.updatedAt.toMillis()
            : data.updatedAt?.seconds
            ? data.updatedAt.seconds * 1000
            : data.timestamp || Date.now();

          boardsMap.set(docId, {
            id: docId,
            boardId: docId,
            title: data.title || 'Tableau Blanc Collaboratif',
            version: data.versionNumber ? `V${data.versionNumber}` : (data.version || 'V1'),
            lastModified: ts,
            updatedAt: ts,
            thumbnail: data.thumbnailBase64 || data.previewUrl || null,
            lastEditor: data.lastEditor || data.lastModifiedByName || 'Collaborateur',
            source: 'workspaces',
          });
        });
        updateCombinedBoards();
      },
      (err) => {
        console.warn('[WhiteboardLobby] workspaces onSnapshot notice:', err);
        setIsLoading(false);
      }
    );

    const unsubLegacy = onSnapshot(
      qLegacy,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const docId = data.boardId || data.id || docSnap.id;
          const ts = data.updatedAt?.toMillis
            ? data.updatedAt.toMillis()
            : data.updatedAt?.seconds
            ? data.updatedAt.seconds * 1000
            : data.timestamp || Date.now();

          const existing = boardsMap.get(docId);
          if (!existing || ts >= (existing.updatedAt || 0)) {
            boardsMap.set(docId, {
              id: docId,
              boardId: docId,
              title: data.title || 'Tableau Blanc Collaboratif',
              version: data.versionNumber ? `V${data.versionNumber}` : 'V1',
              lastModified: ts,
              updatedAt: ts,
              thumbnail: data.thumbnailBase64 || data.previewUrl || null,
              lastEditor: data.lastEditor || data.lastModifiedByName || 'Collaborateur',
              source: 'project_whiteboards',
            });
          }
        });
        updateCombinedBoards();
      },
      (err) => {
        console.warn('[WhiteboardLobby] legacy onSnapshot notice:', err);
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubWorkspaces === 'function') unsubWorkspaces();
      if (typeof unsubLegacy === 'function') unsubLegacy();
    };
  }, [effectiveChatId]);

  // 🚨 PHASE 105 : Liste history triée par date décroissante (lastModified)
  const history = useMemo(() => {
    return [...boards].sort((a, b) => {
      const timeA = Number(a.lastModified || a.updatedAt || 0);
      const timeB = Number(b.lastModified || b.updatedAt || 0);
      return timeB - timeA;
    });
  }, [boards]);

  const lastBoard = history.length > 0 ? history[0] : null;

  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase().trim();
    return history.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.lastEditor?.toLowerCase().includes(q) ||
        b.version?.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  return (
    <div
      className="whiteboard-lobby-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: darkMode ? '#12100E' : '#FAF7F2',
        color: darkMode ? '#FAF7F2' : '#231E1B',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. EN-TÊTE DU LOBBY */}
      <header
        style={{
          padding: '16px 20px',
          borderBottom: darkMode
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(0,0,0,0.08)',
          backgroundColor: darkMode ? '#191513' : '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(198,125,91,0.3)',
            }}
          >
            <Palette size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: '800',
                letterSpacing: '-0.3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Tableaux Blancs Collaboratifs
            </h1>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: darkMode ? '#A89F91' : '#7C7267',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedChat?.projectTitle || projectTitle || 'Espace de co-création visuelle'}
            </p>
          </div>
        </div>

        {/* Bouton Fermer */}
        {typeof onClose === 'function' && (
          <button
            type="button"
            onClick={onClose}
            className="premium-button"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
            title="Fermer et revenir au chat"
            aria-label="Fermer la modale"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        )}
      </header>

      {/* 2. ZONE CENTRALE AVEC LES 2 GROS BOUTONS CENTRÉS */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '24px 20px',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        {/* SECTION DES 2 GROS BOUTONS CENTRÉS */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '16px 0 8px',
          }}
        >
          <div style={{ maxWidth: '600px', marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '900',
                letterSpacing: '-0.4px',
                color: darkMode ? '#FAF7F2' : '#2D2520',
                margin: '0 0 8px',
              }}
            >
              Bienvenue dans votre Studio Whiteboard
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: darkMode ? '#B8ABA0' : '#6B5E54',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Dessinez, brainstormez et concevez vos projets en direct avec votre partenaire de troc.
            </p>
          </div>

          {/* LES 2 GROS BOUTONS CENTRÉS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              width: '100%',
              maxWidth: '680px',
            }}
          >
            {/* BOUTON 1 : CRÉER UN NOUVEAU TABLEAU */}
            <button
              type="button"
              onClick={handleCreate}
              className="premium-button"
              aria-label="Créer un nouveau tableau blanc"
              style={{
                padding: '24px 20px',
                borderRadius: '20px',
                border: 'none',
                background: 'linear-gradient(135deg, #C67D5B 0%, #B26A4A 50%, #9E583A 100%)',
                color: '#FFFFFF',
                boxShadow: '0 10px 28px rgba(198,125,91,0.38), 0 2px 6px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textAlign: 'center',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 14px 34px rgba(198,125,91,0.48)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(198,125,91,0.38)';
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255,255,255,0.24)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={32} strokeWidth={3} />
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span>Créer un nouveau tableau blanc</span>
                  <Sparkles size={16} color="#FEF08A" />
                </div>
                <div style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '4px', lineHeight: 1.4 }}>
                  Page blanche vierge isolée
                </div>
              </div>
            </button>

            {/* BOUTON 2 : REPRENDRE LE DERNIER TABLEAU */}
            <button
              type="button"
              onClick={handleResume}
              className="premium-button"
              aria-label="Reprendre le dernier tableau"
              style={{
                padding: '24px 20px',
                borderRadius: '20px',
                border: darkMode ? '1.5px solid rgba(198,125,91,0.5)' : '1.5px solid #C67D5B',
                backgroundColor: darkMode ? '#1A1614' : '#FFFFFF',
                color: darkMode ? '#FAF7F2' : '#2D2520',
                boxShadow: darkMode
                  ? '0 10px 28px rgba(0,0,0,0.4)'
                  : '0 10px 28px rgba(198,125,91,0.12)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textAlign: 'center',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 14px 34px rgba(198,125,91,0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 10px 28px rgba(0,0,0,0.4)'
                  : '0 10px 28px rgba(198,125,91,0.12)';
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(198,125,91,0.15)',
                  color: '#C67D5B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RotateCcw size={28} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#C67D5B' }}>
                  Reprendre le dernier tableau
                </div>
                <div style={{ fontSize: '12.5px', color: darkMode ? '#A89F91' : '#7C7267', marginTop: '4px', lineHeight: 1.4 }}>
                  {lastBoard ? `${lastBoard.title || 'Tableau actif'} (${lastBoard.version})` : 'Continuer sur le tableau actif'}
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* SECTION HISTORIQUE & LISTE DES TABLEAUX DE LA CONVERSATION */}
        <section
          style={{
            backgroundColor: darkMode ? '#1A1614' : '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: darkMode
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(0,0,0,0.08)',
            boxShadow: darkMode
              ? '0 4px 20px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderKanban size={18} color="#C67D5B" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                Historique des Tableaux ({boards.length})
              </h3>
            </div>

            {/* Barre de recherche */}
            {boards.length > 2 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : '#F3EFEA',
                  fontSize: '13px',
                }}
              >
                <Search size={14} color="#888" />
                <input
                  type="text"
                  placeholder="Rechercher un tableau..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    outline: 'none',
                    fontSize: '12px',
                    width: '140px',
                  }}
                />
              </div>
            )}
          </div>

          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <RefreshCw size={16} className="animate-spin" />
              <span>Chargement des tableaux blancs...</span>
            </div>
          ) : filteredBoards.length === 0 ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                color: darkMode ? '#8E857B' : '#8A7E73',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                borderRadius: '14px',
              }}
            >
              <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '14px' }}>
                {searchQuery ? 'Aucun tableau ne correspond à votre recherche.' : 'Aucun tableau blanc archivé pour l’instant.'}
              </p>
              <p style={{ margin: 0, fontSize: '12px' }}>
                Cliquez sur "Créer un nouveau tableau" ci-dessus pour lancer votre premier atelier graphique.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              {filteredBoards.map((board) => (
                <div
                  key={board.id}
                  className="whiteboard-card"
                  onClick={() => handleSelect(board.boardId || board.id, board)}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: darkMode ? '#12100E' : '#FAF7F2',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C67D5B';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = darkMode
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Thumbnail si dispo */}
                  {board.thumbnail ? (
                    <div
                      style={{
                        width: '100%',
                        height: '110px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={board.thumbnail}
                        alt="Aperçu du tableau"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '70px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(198,125,91,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C67D5B',
                      }}
                    >
                      <Palette size={24} />
                    </div>
                  )}

                  <div>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: darkMode ? '#FAF7F2' : '#2D2520',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {board.title || 'Tableau sans titre'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        fontSize: '11px',
                        color: darkMode ? '#8E857B' : '#8A7E73',
                      }}
                    >
                      <span style={{ fontWeight: '700', color: '#C67D5B' }}>{board.version}</span>
                      <span>{board.lastEditor}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {formatRelativeTime(board.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
