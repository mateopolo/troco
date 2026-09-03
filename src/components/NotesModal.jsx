/**
 * NotesModal.jsx — Alias & Composant défensif pour la modale Notes Partagées
 * Permet l'import direct de NotesModal ou SharedDocumentModal avec protection absolue contre les TypeError.
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
  const safeProps = props || {};
  const groupId = String(safeProps.groupId?.id || safeProps.groupId || safeProps.chatId || 'demo_group_notes');
  const docId = String(safeProps.docId || safeProps.documentId || safeProps.document?.id || safeProps.note?.id || `doc_${groupId}_notes`);

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return (
    <SharedDocumentModal
      isOpen={Boolean(safeProps.isOpen)}
      onClose={typeof safeProps.onClose === 'function' ? safeProps.onClose : () => {}}
      groupId={groupId}
      docId={docId}
      documentId={docId}
      document={safeProps.document || defaultDoc}
      projectTitle={safeProps.projectTitle || safeProps.document?.title || safeProps.note?.title || defaultDoc.title}
      currentUser={safeProps.currentUser || { name: 'Moi', uid: 'me' }}
      darkMode={Boolean(safeProps.darkMode)}
      onSendToChat={safeProps.onSendToChat}
      handleSendMessage={safeProps.handleSendMessage}
    />
  );
}
