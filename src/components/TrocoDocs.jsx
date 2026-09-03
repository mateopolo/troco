/**
 * TrocoDocs.jsx — Composant défensif dédié pour Troco Docs / Suite Office Cloud
 * Phase 103 : Sécurisation absolue de l'ouverture et fallback sur documentData.content
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
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

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
    />
  );
}

export { TrocoDocs, defaultDoc };
