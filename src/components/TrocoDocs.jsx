/**
 * TrocoDocs.jsx — Composant ergonomique Word/Docs (Page A4 centrée et focus global)
 * Phase 139 : Bureau fond gris avec clic-to-focus et feuille A4 texturée
 */

import React, { useRef } from 'react';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

const defaultDoc = {
  title: 'Nouveau Document',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

/**
 * Couche 1 (Bureau/fond grisé) + Couche 2 (Feuille A4 éditable)
 */
export function TrocoDocsEditor({
  editorRef: externalEditorRef,
  content = '',
  onInput = () => {},
  onChange = () => {},
  placeholder = "Rédigez ici vos comptes-rendus, spécifications et notes collaboratives...",
}) {
  const localRef = useRef(null);
  const editorRef = externalEditorRef || localRef;

  return (
    <div
      className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#12100F] p-4 md:p-10 cursor-text"
      onClick={() => editorRef.current?.focus()}
    >
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        placeholder={placeholder}
        onInput={onInput}
        onChange={onChange}
        className="w-full max-w-[21cm] min-h-[29.7cm] mx-auto bg-white text-black p-[2cm] shadow-xl outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 transition-shadow"
      />
    </div>
  );
}

export default function TrocoDocs(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const editorRef = useRef(null);
  const safeProps = props || {};
  const documentData = safeProps.document || safeProps.documentData || defaultDoc;
  // 🚨 PHASE 103 : Initialisation avec fallback sécurisé
  const content = documentData?.content ?? '';

  const groupId = String(safeProps.groupId?.id || safeProps.groupId || safeProps.chatId || 'demo_group_office');
  const documentId = String(
    safeProps.documentId ||
    safeProps.docId ||
    documentData?.id ||
    documentData?.documentId ||
    `doc_${groupId}_docs`
  );

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return (
    <CloudOfficeSuiteModal
      isOpen={Boolean(safeProps.isOpen)}
      onClose={typeof safeProps.onClose === 'function' ? safeProps.onClose : () => {}}
      groupId={groupId}
      documentId={documentId}
      docId={documentId}
      document={documentData}
      documentData={documentData}
      content={content}
      projectTitle={safeProps.projectTitle || documentData?.title || defaultDoc.title}
      currentUser={safeProps.currentUser || { name: 'Moi', uid: 'me' }}
      darkMode={Boolean(safeProps.darkMode)}
      initialTab={safeProps.initialTab || 'docs'}
      editorRef={editorRef}
    />
  );
}

export { TrocoDocs, defaultDoc };
