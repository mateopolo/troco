/**
 * NotesModal.jsx — Alias & Composant défensif pour la modale Notes Partagées
 * Permet l'import direct de NotesModal ou SharedDocumentModal avec protection absolue contre les TypeError.
 */

import React from 'react';
import SharedDocumentModal from './SharedDocumentModal';

export default function NotesModal(props) {
  const safeProps = props || {};
  return (
    <SharedDocumentModal
      {...safeProps}
      docId={safeProps.docId || safeProps.documentId || safeProps.document?.id || safeProps.note?.id}
      documentId={safeProps.documentId || safeProps.docId || safeProps.document?.id || safeProps.note?.id}
      projectTitle={safeProps.projectTitle || safeProps.document?.title || safeProps.note?.title || 'Notes Partagées'}
    />
  );
}
