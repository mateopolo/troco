/**
 * NotesModal.jsx — Application Notes Minimaliste Style Apple Notes Native
 * Épurée, rapide, sans barres d'outils lourdes, avec typographie système lisible et auto-save Firestore.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Share2, Check } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const defaultDoc = {
  title: 'Nouvelle Note',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

// Helper pour extraire un résumé texte court sans balises
const extractSnippet = (text, maxChars = 150) => {
  if (!text) return '';
  const clean = String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*`_~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, maxChars) + (clean.length > maxChars ? '...' : '');
};

export default function NotesModal(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const safeProps = props || {};
  const {
    isOpen,
    onClose = () => {},
    groupId = 'demo_group_notes',
    docId = null,
    documentId = null,
    document: propDoc = null,
    doc: propDocAlias = null,
    note = null,
    documentData = null,
    defaultContent = '',
    projectTitle = 'Notes Partagées',
    currentUser = null,
    darkMode = false,
    onSendToChat = null,
    handleSendMessage = null,
  } = safeProps;

  const effectiveDoc = propDoc || propDocAlias || note || documentData || defaultDoc;
  const effectiveGroupId = String(groupId?.id || groupId || 'demo_group_notes');
  const effectiveDocId = String(
    docId || documentId || effectiveDoc?.id || effectiveDoc?.docId || note?.id || `doc_${effectiveGroupId}_notes`
  );

  const initialContent =
    documentData?.content ??
    defaultContent ??
    (typeof effectiveDoc?.content === 'string'
      ? effectiveDoc.content
      : typeof effectiveDoc?.text === 'string'
      ? effectiveDoc.text
      : defaultDoc.content) ??
    '';

  const [title, setTitle] = useState(
    () => effectiveDoc?.title || effectiveDoc?.name || (projectTitle ? `Note - ${projectTitle}` : defaultDoc.title)
  );
  const [content, setContent] = useState(() => initialContent);
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  const textareaRef = useRef(null);
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Synchronisation Firestore en temps réel
  useEffect(() => {
    if (!isOpen || !effectiveDocId || !db) return;

    try {
      const noteDocRef = doc(db, 'project_shared_notes', String(effectiveDocId));
      const unsubscribe = onSnapshot(
        noteDocRef,
        (snapshot) => {
          try {
            if (snapshot?.exists?.()) {
              const data = snapshot.data() || {};
              if (data?.title) setTitle(data.title);
              if (data?.content !== undefined && data?.lastEditorUid !== (currentUser?.uid || currentUser?.id)) {
                if (!isTypingRef.current) {
                  setContent(data.content != null ? String(data.content) : defaultDoc.content);
                }
              }
              setSaveStatus('Synchronisé en direct 🟢');
            } else {
              const myName = currentUser?.name || currentUser?.displayName || 'Moi';
              const myUid = currentUser?.uid || currentUser?.id || 'me';
              setDoc(
                noteDocRef,
                {
                  docId: effectiveDocId,
                  groupId: effectiveGroupId,
                  title: title || defaultDoc.title,
                  content: content || defaultDoc.content,
                  cells: defaultDoc.cells,
                  lastUpdated: Date.now(),
                  lastEditor: myName,
                  lastEditorUid: myUid,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              ).catch(() => {});
            }
          } catch (snapshotErr) {
            console.warn('[NotesModal] snapshot error:', snapshotErr);
          }
        },
        (err) => {
          console.warn('[NotesModal] snapshot notice:', err);
        }
      );

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (_) {}
  }, [isOpen, effectiveDocId, currentUser, effectiveGroupId, title, content]);

  // Sauvegarde automatique avec debounce
  const syncToFirestore = useCallback(
    (newContent, newTitle) => {
      if (!effectiveDocId || !db) return;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSaveStatus('Enregistrement en cours... ⏳');

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const myName = currentUser?.name || currentUser?.displayName || 'Moi';
          const myUid = currentUser?.uid || currentUser?.id || 'me';
          const snippet = extractSnippet(newContent ?? content ?? '', 150);
          const noteDocRef = doc(db, 'project_shared_notes', String(effectiveDocId));

          await setDoc(
            noteDocRef,
            {
              docId: effectiveDocId,
              groupId: effectiveGroupId,
              title: newTitle || title || defaultDoc.title,
              content: newContent ?? content ?? '',
              cells: defaultDoc.cells,
              lastUpdated: Date.now(),
              snippet,
              summary: snippet,
              lastEditor: myName,
              lastEditorUid: myUid,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          if (effectiveGroupId && effectiveGroupId !== 'demo_group_notes') {
            const chatDocRef = doc(db, 'chats', effectiveGroupId, 'workspace', 'shared_note');
            await setDoc(
              chatDocRef,
              {
                title: newTitle || title || defaultDoc.title,
                content: newContent ?? content ?? '',
                cells: defaultDoc.cells,
                lastUpdated: Date.now(),
                snippet,
                summary: snippet,
                lastEditor: myName,
                lastEditorUid: myUid,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(() => {});
          }

          setSaveStatus('Synchronisé en direct 🟢');
          isTypingRef.current = false;
        } catch (err) {
          console.warn('[NotesModal] Save error:', err);
          setSaveStatus('Mode hors-ligne');
        }
      }, 400);
    },
    [effectiveDocId, effectiveGroupId, currentUser, title, content]
  );

  const handleContentChange = (e) => {
    const val = e.target.value;
    isTypingRef.current = true;
    setContent(val);
    syncToFirestore(val, title);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    syncToFirestore(content, val);
  };

  // Partage vers la discussion
  const handleSendNoteToChat = async () => {
    if (!effectiveGroupId || isSendingToChat) return;
    setIsSendingToChat(true);

    try {
      const authorName = currentUser?.name || currentUser?.displayName || 'Moi';
      const snippet = extractSnippet(content, 150);
      const msgPayload = {
        text: `📝 ${authorName} a partagé une note : "${title}"`,
        sender: currentUser?.uid || currentUser?.id || 'me',
        senderName: authorName,
        senderAvatar: currentUser?.avatar || '',
        timestamp: serverTimestamp(),
        createdAt: Date.now(),
        type: 'workspace_invite',
        kind: 'workspace_invite',
        workspaceType: 'notes',
        workspaceTitle: title,
        docId: effectiveDocId,
        snippet,
        summary: snippet,
      };

      if (db && effectiveGroupId && effectiveGroupId !== 'demo_group_notes') {
        await addDoc(collection(db, 'chats', String(effectiveGroupId), 'messages'), msgPayload);
        await setDoc(
          doc(db, 'chats', String(effectiveGroupId)),
          {
            lastMessage: `📝 Note : "${title}"`,
            lastSenderName: authorName,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (typeof handleSendMessage === 'function') {
        handleSendMessage(msgPayload);
      }

      if (typeof onSendToChat === 'function') {
        onSendToChat(effectiveDocId, msgPayload);
      }

      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 3500);
    } catch (err) {
      console.warn('[NotesModal] Send to chat error:', err);
    } finally {
      setIsSendingToChat(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 md:bg-black/50 md:backdrop-blur-sm p-3 sm:p-6 touch-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        // Bloque la fermeture accidentelle au clic sur le backdrop
        e.stopPropagation();
      }}
    >
      <div
        className="relative w-full max-w-4xl h-[90dvh] max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl flex flex-col shadow-2xl border transition-all bg-[#F9F9F9] dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 border-black/5 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1000000,
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90dvh',
          height: '90dvh',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* 1. HARMONISATION DU HEADER (STRUCTURE & BOUTONS IDENTIQUES À TROCO DOCS) */}
        <header className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black dark:bg-[#2A2624] dark:text-white rounded-full shadow-md hover:bg-gray-100 transition-colors font-medium text-sm cursor-pointer"
            title="Fermer la note"
          >
            <ChevronLeft size={16} />
            <span>Fermer</span>
          </button>

          {/* Indicateur de sauvegarde & Bouton Partager/Sauvegarder */}
          <div className="flex items-center gap-3">
            {/* Indicateur de sauvegarde */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  saveStatus.includes('Enregistrement') || saveStatus.includes('Sauvegarde')
                    ? 'bg-amber-500 animate-pulse'
                    : saveStatus.includes('hors-ligne')
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="hidden sm:inline">{saveStatus}</span>
            </div>

            {/* Bouton Partager/Sauvegarder */}
            <button
              type="button"
              onClick={handleSendNoteToChat}
              disabled={isSendingToChat}
              className="px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-white font-bold shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-2 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary, #C67D5B)',
                color: '#FFFFFF',
              }}
              title="Partager au Chat"
            >
              <Share2 size={15} />
              <span>{isSendingToChat ? 'Envoi...' : 'Partager au Chat'}</span>
            </button>
          </div>
        </header>

        {/* 2. ZONE DE TEXTE ÉPURÉE SANS BORDURES DISGRACIEUSES */}
        <main className="flex-1 flex flex-col w-full overflow-hidden">
          {/* Titre épuré de la note */}
          <div className="px-6 pt-4 md:px-8 md:pt-6">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Titre de la note..."
              className="font-sans font-bold text-2xl md:text-3xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none outline-none w-full"
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif",
              }}
            />
          </div>

          {/* Textarea pleine largeur et hauteur sans bordures sombres */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Rédigez vos notes partagées ici..."
            className="w-full h-full bg-transparent text-[var(--text-primary)] p-6 md:p-8 outline-none border-none resize-none text-lg leading-relaxed font-sans placeholder-gray-400 dark:placeholder-gray-500 box-border flex-1"
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif",
            }}
          />
        </main>

        {/* Toast confirmation de partage */}
        {sendSuccessToast && (
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: '999px',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              zIndex: 20,
            }}
          >
            <Check size={16} />
            <span>Note partagée dans la conversation avec succès !</span>
          </div>
        )}
      </div>
    </div>
  );

  // Échappement de l'overflow du chat et z-index via Portal
  return typeof document !== 'undefined' && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export { NotesModal, defaultDoc };
