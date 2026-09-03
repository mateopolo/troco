/**
 * TrocoDocs.jsx — Composant défensif dédié pour Troco Docs / Suite Office Cloud
 * Protection absolue contre les TypeError et initialisation immédiate avec defaultDoc.
 */

import React from 'react';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

const defaultDoc = {
  title: 'Nouveau Document',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

export default function TrocoDocs(props) {
  const safeProps = props || {};
  const groupId = String(safeProps.groupId?.id || safeProps.groupId || safeProps.chatId || 'demo_group_office');
  const documentId = String(
    safeProps.documentId ||
    safeProps.docId ||
    safeProps.document?.id ||
    safeProps.document?.documentId ||
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
      document={safeProps.document || defaultDoc}
      projectTitle={safeProps.projectTitle || safeProps.document?.title || defaultDoc.title}
      currentUser={safeProps.currentUser || { name: 'Moi', uid: 'me' }}
      darkMode={Boolean(safeProps.darkMode)}
      initialTab={safeProps.initialTab || 'docs'}
    />
  );
}

export { TrocoDocs, defaultDoc };
