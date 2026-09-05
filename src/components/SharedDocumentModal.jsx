import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Bold, Italic, Heading1, Heading2, Heading3,
  List, CheckSquare, Quote, Code, Download, Printer,
  Share2, Eye, Edit3, Check
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_NOTE_CONTENT = `# 📝 Notes de Session & Objectifs Collaboratifs

### Points d'action du projet
- [x] Cadrage initial et alignement des compétences
- [ ] Validation de la charte graphique et du prototype
- [ ] Finalisation des livrables et déblocage de l'Escrow

### 💡 Idées & Réflexions Clés
> "La simplicité est la sophistication suprême."

Partagez ici vos comptes-rendus, listes de tâches et spécifications en direct avec vos collaborateurs.`;

// Squelette local sécurisé par défaut garantissant zéro crash
const defaultDoc = {
  title: 'Nouveau Document',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

// Helper pour extraire les 150 premiers caractères sans balises HTML ni Markdown
const extractSnippet = (textOrHtml, maxChars = 150) => {
  if (!textOrHtml) return '';
  const clean = String(textOrHtml)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*`_~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, maxChars) + (clean.length > maxChars ? '...' : '');
};

/**
 * SharedDocumentModal — Outil autonome de Notes Partagées Collaboratives (Apple-Style)
 * Séparé du Whiteboard pour une immersion et une ergonomie 100% dédiées à la prise de notes.
 */
function SharedDocumentModalContent({
  isOpen,
  onClose,
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
}) {
  const effectiveDoc = propDoc || propDocAlias || note || documentData || defaultDoc;
  const effectiveGroupId = String(groupId?.id || groupId || 'demo_group_notes');
  const effectiveDocId = String(docId || documentId || effectiveDoc?.id || effectiveDoc?.docId || `doc_${effectiveGroupId}_notes`);

  // 🚨 PHASE 103 : Initialisation avec fallback sécurisé
  const contentValue = documentData?.content ?? defaultContent ?? (typeof effectiveDoc?.content === 'string' ? effectiveDoc.content : (typeof effectiveDoc?.text === 'string' ? effectiveDoc.text : defaultDoc.content)) ?? '';

  const [title, setTitle] = useState(() => effectiveDoc?.title || effectiveDoc?.name || (projectTitle ? `Notes - ${projectTitle}` : defaultDoc.title));
  const [content, setContent] = useState(() => contentValue);
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  const textareaRef = useRef(null);
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Synchronisation Firestore Multi-utilisateurs
  useEffect(() => {
    if (!isOpen || !effectiveDocId || !db) return;

    try {
      const noteDocRef = doc(db, 'project_shared_notes', String(effectiveDocId));
      const unsubscribe = onSnapshot(noteDocRef, (snapshot) => {
        try {
          if (snapshot?.exists?.()) {
            const data = snapshot.data() || {};
            if (data?.title) setTitle(data?.title || defaultDoc.title);
            if (data?.content !== undefined && data?.lastEditorUid !== (currentUser?.uid || currentUser?.id)) {
              if (!isTypingRef.current) {
                setContent(data?.content != null ? String(data.content) : defaultDoc.content);
              }
            }
            setSaveStatus('Synchronisé en direct 🟢');
          } else {
            // Initialisation immédiate par défaut si le document n'existe pas encore
            const myName = currentUser?.name || currentUser?.displayName || 'Moi';
            const myUid = currentUser?.uid || currentUser?.id || 'me';
            setDoc(noteDocRef, {
              docId: effectiveDocId,
              groupId: effectiveGroupId,
              title: title || defaultDoc.title,
              content: content || defaultDoc.content,
              cells: defaultDoc.cells,
              lastUpdated: Date.now(),
              lastEditor: myName,
              lastEditorUid: myUid,
              updatedAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          }
        } catch (snapshotErr) {
          console.warn('[SharedDocumentModal] onSnapshot processing error:', snapshotErr);
        }
      }, (err) => {
        console.warn('[Firestore Shared Note] Snapshot notice:', err);
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (_) {}
  }, [isOpen, effectiveDocId, currentUser, effectiveGroupId, title, content]);

  // Sauvegarde debouncée vers Firestore
  const syncToFirestore = useCallback((newContent, newTitle) => {
    if (!effectiveDocId || !db) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    setSaveStatus('Enregistrement en cours...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const myName = currentUser?.name || currentUser?.displayName || 'Moi';
        const myUid = currentUser?.uid || currentUser?.id || 'me';
        const snippet = extractSnippet(newContent ?? content ?? '', 150);
        const noteDocRef = doc(db, 'project_shared_notes', String(effectiveDocId));
        await setDoc(noteDocRef, {
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
        }, { merge: true });

        if (effectiveGroupId && effectiveGroupId !== 'demo_group_notes') {
          const chatDocRef = doc(db, 'chats', effectiveGroupId, 'workspace', 'shared_note');
          await setDoc(chatDocRef, {
            title: newTitle || title || defaultDoc.title,
            content: newContent ?? content ?? '',
            cells: defaultDoc.cells,
            lastUpdated: Date.now(),
            snippet,
            summary: snippet,
            lastEditor: myName,
            lastEditorUid: myUid,
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }

        setSaveStatus('Synchronisé en direct 🟢');
        isTypingRef.current = false;
      } catch (err) {
        console.warn('[Shared Document] Save error:', err);
        setSaveStatus('Mode hors-ligne');
      }
    }, 400);
  }, [effectiveDocId, groupId, currentUser]);

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

  // Insertion de balises Markdown
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    let newText = '';
    let newCursorPos = start + prefix.length;

    if (selectedText) {
      newText = before + prefix + selectedText + suffix + after;
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    } else {
      newText = before + prefix + suffix + after;
      newCursorPos = start + prefix.length;
    }

    setContent(newText);
    syncToFirestore(newText, title);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Export Markdown (.md)
  const handleExportMarkdown = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Document Imprimable (.pdf / print)
  const handleExportPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1F2937; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { color: #C67D5B; border-bottom: 2px solid #E5E7EB; padding-bottom: 12px; }
            h2, h3 { color: #374151; margin-top: 24px; }
            blockquote { border-left: 4px solid #C67D5B; margin: 0; padding-left: 16px; color: #6B7280; font-style: italic; }
            pre { background: #F3F4F6; padding: 16px; border-radius: 8px; font-family: monospace; }
            ul { padding-left: 20px; }
            .meta { font-size: 12px; color: #9CA3AF; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">Document exporté depuis Troco Shared Notes • ${new Date().toLocaleDateString('fr-FR')}</div>
          <div>${content.replace(/\n/g, '<br/>')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Partager le document directement dans la conversation
  const handleSendNoteToChat = async () => {
    if (!groupId || isSendingToChat) return;
    setIsSendingToChat(true);

    try {
      const authorName = currentUser?.name || 'Moi';
      const snippet = extractSnippet(content, 150);
      const msgPayload = {
        text: `📝 ${authorName} a mis à jour les Notes Partagées : "${title}"`,
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

      if (db && groupId && groupId !== 'demo_group_notes') {
        await addDoc(collection(db, 'chats', String(groupId), 'messages'), msgPayload);
        await setDoc(doc(db, 'chats', String(groupId)), {
          lastMessage: `📝 Notes partagées : "${title}"`,
          lastSenderName: authorName,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      if (typeof handleSendMessage === 'function') {
        handleSendMessage(msgPayload);
      }

      if (onSendToChat) onSendToChat(effectiveDocId, msgPayload);

      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 3500);
    } catch (err) {
      console.warn('[Shared Note] Send to chat error:', err);
    } finally {
      setIsSendingToChat(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 md:bg-[rgba(15,12,11,0.82)] md:backdrop-blur-md p-3 sm:p-4 touch-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl flex flex-col shadow-2xl border transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1000000,
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90dvh',
          backgroundColor: darkMode ? '#1C1816' : '#FAF7F2',
          borderRadius: '20px',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-color, #E8DDD3)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* HEADER NOTES PARTAGÉES (MARKDOWN) */}
        <div
          className={`p-4 sm:p-5 flex flex-col w-full border-b ${
            darkMode ? 'bg-[#1C1816] border-white/10' : 'bg-[#FAF7F2] border-stone-200'
          }`}
        >
          {/* LIGNE 1 : BOUTON FERMER À GAUCHE, TITRE AU CENTRE, STATUT DE SYNCHRONISATION À DROITE */}
          <div className="flex justify-between items-center w-full mb-3 gap-3">
            {/* Bouton "X Fermer" (gros et visible, appelant onClose) à gauche */}
            <button
              type="button"
              onClick={onClose}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer shadow-sm ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-[#FAF7F2]'
                  : 'bg-stone-200/90 hover:bg-stone-300 text-[#3D3530]'
              }`}
              title="Fermer la note"
            >
              <X size={16} />
              <span>Fermer</span>
            </button>

            {/* Titre du document au centre */}
            <div className="flex items-center justify-center gap-2.5 min-w-0 flex-1 max-w-md mx-auto">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(198,125,91,0.15)',
                  color: '#C67D5B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={16} />
              </div>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Titre de la note..."
                className="w-full bg-transparent border-0 outline-none font-bold text-center text-base sm:text-lg min-w-0"
                style={{
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Statut de synchronisation à droite */}
            <div className="flex items-center gap-2 text-xs shrink-0 whitespace-nowrap justify-end">
              <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {saveStatus}
              </span>
            </div>
          </div>

          {/* LIGNE 2 : ACTIONS DOCUMENT (FLEX-WRAP MOBILE-FRIENDLY) */}
          <div className="flex flex-wrap items-center gap-2 w-full mb-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                previewMode
                  ? 'bg-[#C67D5B] text-white'
                  : (darkMode ? 'bg-white/10 text-[#FAF7F2] hover:bg-white/15' : 'bg-stone-200/90 text-[#3D3530] hover:bg-stone-300')
              }`}
            >
              {previewMode ? <Edit3 size={14} /> : <Eye size={14} />}
              <span>{previewMode ? 'Éditer' : 'Aperçu'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                darkMode ? 'bg-white/10 text-[#FAF7F2] hover:bg-white/15' : 'bg-stone-200/90 text-[#3D3530] hover:bg-stone-300'
              }`}
              title="Exporter au format Markdown (.md)"
            >
              <Download size={14} />
              <span>.md</span>
            </button>

            <button
              type="button"
              onClick={handleExportPrint}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                darkMode ? 'bg-white/10 text-[#FAF7F2] hover:bg-white/15' : 'bg-stone-200/90 text-[#3D3530] hover:bg-stone-300'
              }`}
              title="Imprimer / Exporter PDF"
            >
              <Printer size={14} />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleSendNoteToChat}
              disabled={isSendingToChat}
              className="premium-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #C67D5B 0%, #B86B49 100%)',
                boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
                cursor: isSendingToChat ? 'wait' : 'pointer',
              }}
            >
              <Share2 size={14} />
              <span>{isSendingToChat ? 'Envoi...' : 'Partager au Chat'}</span>
            </button>
          </div>

          {/* LIGNE 3 : STATUTS ET BARRE DE FORMATAGE */}
          <div
            className={`flex items-center gap-3 overflow-x-auto no-scrollbar w-full py-2 border-y ${
              darkMode ? 'border-white/10' : 'border-stone-200'
            }`}
          >
            {/* COMPTEUR DE MOTS */}
            <div className="flex items-center gap-2 text-xs shrink-0 whitespace-nowrap">
              <span style={{ color: darkMode ? '#8E857E' : '#A89E95' }}>
                {wordCount} mots ({charCount} caractères)
              </span>
            </div>

            {/* BARRE DE FORMATAGE H1, H2, B, I, etc. */}
            {!previewMode && (
              <>
                <div
                  className="w-[1px] h-4 shrink-0"
                  style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : '#E0D4C5' }}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => insertFormatting('# ')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Titre 1"
                  >
                    <Heading1 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Titre 2"
                  >
                    <Heading2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('### ')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Titre 3"
                  >
                    <Heading3 size={16} />
                  </button>
                  <div
                    className="w-[1px] h-4 shrink-0 mx-0.5"
                    style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : '#E0D4C5' }}
                  />
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Gras"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Italique"
                  >
                    <Italic size={16} />
                  </button>
                  <div
                    className="w-[1px] h-4 shrink-0 mx-0.5"
                    style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : '#E0D4C5' }}
                  />
                  <button
                    type="button"
                    onClick={() => insertFormatting('- [ ] ')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-emerald-500"
                    title="Case à cocher / Tâche"
                  >
                    <CheckSquare size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Liste à puces"
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Citation"
                  >
                    <Quote size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('```javascript\n', '\n```')}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    style={{ color: darkMode ? '#FAF7F2' : '#3D3530' }}
                    title="Bloc de code"
                  >
                    <Code size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ZONE DE CONTENU / ÉDITEUR */}
        <div className="flex-1 min-h-[300px] flex flex-col relative" style={{ flex: 1, display: 'flex', minHeight: '300px', position: 'relative' }}>
          {previewMode ? (
            <div
              className="flex-1 p-4 sm:p-6 overflow-y-auto text-[15px] leading-relaxed font-sans"
              style={{
                flex: 1,
                padding: '20px 24px',
                overflowY: 'auto',
                fontSize: '15px',
                lineHeight: 1.7,
                color: darkMode ? '#FAF7F2' : '#3D3530',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              {String(content || '').split('\n').map((line, idx) => {
                const safeLine = String(line || '');
                if (safeLine.startsWith('# ')) {
                  return <h1 key={idx} style={{ color: '#C67D5B', margin: '16px 0 8px', fontSize: '26px' }}>{safeLine.replace('# ', '')}</h1>;
                }
                if (safeLine.startsWith('## ')) {
                  return <h2 key={idx} style={{ color: darkMode ? '#FAF7F2' : '#2D2520', margin: '14px 0 6px', fontSize: '20px' }}>{safeLine.replace('## ', '')}</h2>;
                }
                if (safeLine.startsWith('### ')) {
                  return <h3 key={idx} style={{ color: darkMode ? '#E5DCD3' : '#4D423A', margin: '12px 0 4px', fontSize: '16px' }}>{safeLine.replace('### ', '')}</h3>;
                }
                if (safeLine.startsWith('> ')) {
                  return (
                    <blockquote
                      key={idx}
                      style={{
                        borderLeft: '4px solid #C67D5B',
                        paddingLeft: '14px',
                        margin: '8px 0',
                        color: darkMode ? '#B8ABA0' : '#6B5E54',
                        fontStyle: 'italic',
                      }}
                    >
                      {safeLine.replace('> ', '')}
                    </blockquote>
                  );
                }
                if (safeLine.startsWith('- [x] ') || safeLine.startsWith('- [ ] ')) {
                  const isChecked = safeLine.startsWith('- [x] ');
                  const taskText = safeLine.replace(/- \[[ x]\] /, '');
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                      <input type="checkbox" checked={isChecked} readOnly style={{ accentColor: '#C67D5B' }} />
                      <span style={{ textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.6 : 1 }}>{taskText}</span>
                    </div>
                  );
                }
                if (safeLine.startsWith('- ')) {
                  return <li key={idx} style={{ marginLeft: '20px', margin: '3px 0' }}>{safeLine.replace('- ', '')}</li>;
                }
                if (!safeLine.trim()) return <div key={idx} style={{ height: '8px' }} />;
                return <p key={idx} style={{ margin: '4px 0' }}>{safeLine}</p>;
              })}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content || ''}
              onChange={handleContentChange}
              placeholder="Rédigez vos notes partagées ici en Markdown..."
              className="flex-1 w-full h-full p-4 sm:p-6 bg-transparent border-0 outline-none resize-none text-[15px] leading-relaxed font-sans box-border"
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                padding: '20px 24px',
                backgroundColor: 'transparent',
                color: darkMode ? '#FAF7F2' : '#3D3530',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '15px',
                lineHeight: 1.7,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* TOAST NOTIFICATION SUCCÈS PARTAGE */}
          {sendSuccessToast && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                animation: 'popIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                zIndex: 20,
              }}
            >
              <Check size={16} />
              <span>Note partagée dans la conversation avec succès !</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return typeof document !== 'undefined' && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default function SharedDocumentModal(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const documentData = props?.document || props?.documentData || props?.note || defaultDoc;
  // 🚨 PHASE 103 : Initialise les objets avec des valeurs par défaut pour éviter le crash de l'éditeur de texte
  const content = documentData?.content ?? '';

  return (
    <SharedDocumentModalContent
      {...props}
      documentData={documentData}
      defaultContent={content}
    />
  );
}

