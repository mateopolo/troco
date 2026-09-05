/**
 * TrocoSheets.jsx — Composant défensif dédié pour Troco Sheets (Tableur Excel)
 * Standardisation unifiée des en-têtes bureautiques avec initialTab="sheets"
 */

import React from 'react';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

const defaultDoc = {
  title: 'Nouvelle Feuille de Calcul',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

export default function TrocoSheets(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const safeProps = props || {};
  const documentData = safeProps.document || safeProps.documentData || safeProps.sheet || defaultDoc;
  const content = documentData?.content ?? '';

  const groupId = String(safeProps.groupId?.id || safeProps.groupId || safeProps.chatId || 'demo_group_office');
  const documentId = String(
    safeProps.documentId ||
    safeProps.docId ||
    documentData?.id ||
    documentData?.documentId ||
    `sheet_${groupId}_sheets`
  );

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
      initialTab="sheets"
      onSendToChat={safeProps.onSendToChat}
      handleSendMessage={safeProps.handleSendMessage}
    />
  );
}

export { TrocoSheets, defaultDoc };
