/**
 * NotesModal.jsx — Alias & Composant défensif pour la modale Notes Partagées
 * Phase 103 : Sécurisation absolue de l'ouverture et fallback sur documentData.content
 */

import React from 'react';
import SharedDocumentModal from './SharedDocumentModal';

const defaultDoc = {
  title: 'Nouveau Document',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

export default function NotesModal(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const safeProps = props || {};
  const documentData = safeProps.document || safeProps.documentData || safeProps.note || defaultDoc;
  // 🚨 PHASE 103 : Initialisation avec valeurs par défaut pour éviter le crash de l'éditeur
  const content = documentData?.content ?? '';

  const groupId = String(safeProps.groupId?.id || safeProps.groupId || safeProps.chatId || 'demo_group_notes');
  const docId = String(safeProps.docId || safeProps.documentId || documentData?.id || safeProps.note?.id || `doc_${groupId}_notes`);

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return (
    <SharedDocumentModal
      isOpen={Boolean(safeProps.isOpen)}
      onClose={typeof safeProps.onClose === 'function' ? safeProps.onClose : () => {}}
      groupId={groupId}
      docId={docId}
      documentId={docId}
      document={documentData}
      documentData={documentData}
      content={content}
      projectTitle={safeProps.projectTitle || documentData?.title || defaultDoc.title}
      currentUser={safeProps.currentUser || { name: 'Moi', uid: 'me' }}
      darkMode={Boolean(safeProps.darkMode)}
      onSendToChat={safeProps.onSendToChat}
      handleSendMessage={safeProps.handleSendMessage}
    />
  );
}
