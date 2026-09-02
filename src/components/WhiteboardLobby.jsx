/**
 * WhiteboardLobby.jsx — Écran d'accueil & Historique multi-tableaux blancs (Phase 99)
 * 
 * Permet de :
 * 1. Créer un nouveau tableau blanc avec ID isolé.
 * 2. Visualiser l'historique complet des tableaux de la discussion avec prévisualisation Base64.
 * 3. Reprendre un projet existant avec isolation stricte des données de session.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Clock,
  Palette,
  FolderKanban,
  Calendar,
  User,
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
  chatId,
  selectedChat = null,
  onSelectBoard,
  onCreateNewBoard,
  onClose,
  darkMode = false,
  projectTitle = 'Tableaux Blancs Collaboratifs',
}) {
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveChatId = String(
    chatId || selectedChat?.id || selectedChat?.firestoreId || ''
  );

  // Synchronisation temps réel Firestore : interrogation de 'workspaces' et 'project_whiteboards'
  useEffect(() => {
    if (!db || !effectiveChatId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;
    const boardsMap = new Map();

    // 1. Requête principale exigée : collection 'workspaces' (chatId == selectedChat.id && type == 'whiteboard')
    const qWorkspaces = query(
      collection(db, 'workspaces'),
      where('chatId', '==', effectiveChatId),
      where('type', '==', 'whiteboard')
    );

    // 2. Requête miroir héritée : collection 'project_whiteboards' (groupId == effectiveChatId)
    const qLegacy = query(
      collection(db, 'project_whiteboards'),
      where('groupId', '==', effectiveChatId)
    );

    const updateCombinedBoards = () => {
      if (!isMounted) return;
      const combined = Array.from(boardsMap.values());
      combined.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setBoards(combined);
      setIsLoading(false);
    };

    const unsubWorkspaces = onSnapshot(
      qWorkspaces,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
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
            version: data.version ? `V${data.version}` : 'V1',
            updatedAt: ts,
            thumbnail:
              data.thumbnailBase64 ||
              data.previewUrl ||
              data.data?.thumbnailBase64 ||
              null,
            lastEditor:
              data.lastModifiedByName || data.lastEditor || 'Collaborateur',
            source: 'workspaces',
          });
        });
        updateCombinedBoards();
      },
      (err) => {
        console.warn('[WhiteboardLobby] workspaces onSnapshot note:', err);
        setIsLoading(false);
      }
    );

    const unsubLegacy = onSnapshot(
      qLegacy,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = data.boardId || data.id || docSnap.id;
          const ts = data.updatedAt?.toMillis
            ? data.updatedAt.toMillis()
            : data.updatedAt?.seconds
            ? data.updatedAt.seconds * 1000
            : data.timestamp || Date.now();

          // Si pas encore présent ou version plus récente
          const existing = boardsMap.get(docId);
          if (!existing || ts >= (existing.updatedAt || 0)) {
            boardsMap.set(docId, {
              id: docId,
              boardId: docId,
              title: data.title || 'Tableau Blanc Collaboratif',
              version: data.versionNumber ? `V${data.versionNumber}` : 'V1',
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
        console.warn('[WhiteboardLobby] legacy onSnapshot note:', err);
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubWorkspaces === 'function') unsubWorkspaces();
      if (typeof unsubLegacy === 'function') unsubLegacy();
    };
  }, [effectiveChatId]);

  // Filtrage selon terme de recherche
  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return boards;
    const q = searchQuery.toLowerCase().trim();
    return boards.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.lastEditor?.toLowerCase().includes(q) ||
        b.version?.toLowerCase().includes(q)
    );
  }, [boards, searchQuery]);

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
              boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
              flexShrink: 0,
            }}
          >
            <FolderKanban size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              className="font-editorial-heading"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                letterSpacing: '-0.2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Tableaux Blancs
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
              {selectedChat?.projectTitle || projectTitle || 'Projets créatifs de la conversation'}
            </p>
          </div>
        </div>

        {/* Bouton Fermer */}
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
      </header>

      {/* 2. ZONE DE DÉFILEMENT CONTENANT LES DEUX SECTIONS */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* SECTION A : BOUTON D'ACTION PRINCIPAL "CRÉER UN NOUVEAU TABLEAU BLANC" */}
        <section>
          <button
            type="button"
            onClick={onCreateNewBoard}
            className="premium-button"
            style={{
              width: '100%',
              padding: '18px 24px',
              borderRadius: '20px',
              border: 'none',
              background: 'linear-gradient(135deg, #C67D5B 0%, #B26A4A 50%, #9E583A 100%)',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(198,125,91,0.32), 0 2px 6px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              textAlign: 'left',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(198,125,91,0.42)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(198,125,91,0.32)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Plus size={26} strokeWidth={3} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    letterSpacing: '-0.2px',
                  }}
                >
                  <span>✨ Créer un nouveau tableau blanc</span>
                  <Sparkles size={16} color="#FEF08A" />
                </div>
                <div style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '3px' }}>
                  Générer un tableau vierge isolé avec synchronisation temps réel
                </div>
              </div>
            </div>

            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </div>
          </button>
        </section>

        {/* SECTION B : GRILLE "HISTORIQUE DES PROJETS" */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Barre d'outils de section : Titre + Recherche */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#C67D5B" />
              <h2
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: darkMode ? '#D4C5B5' : '#6B5E54',
                }}
              >
                Historique des projets ({boards.length})
              </h2>
            </div>

            {/* Barre de recherche si plus de 2 tableaux */}
            {boards.length > 2 && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '240px',
                }}
              >
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: darkMode ? '#A89F91' : '#7C7267',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.12)'
                      : '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: darkMode ? '#1E1916' : '#FFFFFF',
                    color: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* États : Chargement / Vide / Grille de projets */}
          {isLoading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: '200px',
                    borderRadius: '18px',
                    backgroundColor: darkMode
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.04)',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.06)'
                      : '1px solid rgba(0,0,0,0.06)',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              ))}
            </div>
          ) : filteredBoards.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                borderRadius: '20px',
                textAlign: 'center',
                backgroundColor: darkMode ? '#181412' : '#FFFFFF',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: darkMode
                    ? 'rgba(198,125,91,0.15)'
                    : 'rgba(198,125,91,0.1)',
                  color: '#C67D5B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Palette size={26} />
              </div>
              <div>
                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: '15px',
                    fontWeight: '700',
                  }}
                >
                  {searchQuery ? 'Aucun résultat trouvé' : 'Aucun tableau blanc pour le moment'}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12.5px',
                    color: darkMode ? '#A89F91' : '#7C7267',
                    maxWidth: '360px',
                  }}
                >
                  {searchQuery
                    ? "Essayez d'autres mots-clés pour retrouver votre projet."
                    : 'Créez votre premier espace de dessin pour collaborer, faire des croquis ou planifier des deals.'}
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => onSelectBoard(board.id, board)}
                  className="whiteboard-card hover-subtle"
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    backgroundColor: darkMode ? '#191513' : '#FFFFFF',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.08)',
                    boxShadow: darkMode
                      ? '0 6px 20px rgba(0,0,0,0.35)'
                      : '0 6px 18px rgba(61,53,48,0.06)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = '#C67D5B';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = darkMode
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.08)';
                  }}
                >
                  {/* Miniature Bounding Box (Phase 73 Base64) ou Placeholder élégant */}
                  <div
                    style={{
                      height: '135px',
                      width: '100%',
                      backgroundColor: darkMode ? '#0F0D0B' : '#F4EFEB',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: darkMode
                        ? '1px solid rgba(255,255,255,0.06)'
                        : '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {board.thumbnail ? (
                      <img
                        src={board.thumbnail}
                        alt={board.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          backgroundColor: darkMode ? '#12100E' : '#FFFFFF',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          color: darkMode ? '#5A5046' : '#C4B5A5',
                        }}
                      >
                        <Palette size={28} strokeWidth={1.5} />
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>
                          Aperçu vectoriel
                        </span>
                      </div>
                    )}

                    {/* Badge de Version */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(198, 125, 91, 0.92)',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: '800',
                        letterSpacing: '0.4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      }}
                    >
                      {board.version}
                    </div>

                    {/* Badge Date relative */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(8px)',
                        color: darkMode ? '#FAF7F2' : '#231E1B',
                        fontSize: '10px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={10} />
                      <span>{formatRelativeTime(board.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Corps de la carte */}
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '13.5px',
                        fontWeight: '700',
                        color: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={board.title}
                    >
                      {board.title}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: darkMode ? '#A89F91' : '#7C7267',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {board.lastEditor}
                        </span>
                      </div>

                      <span
                        style={{
                          color: '#C67D5B',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        Ouvrir
                        <ArrowRight size={11} />
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
