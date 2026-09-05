/**
 * TrocoSlides.jsx — Composant défensif dédié pour Troco Slides (Présentations PowerPoint)
 * Standardisation unifiée des en-têtes bureautiques avec initialTab="slides"
 */

import React from 'react';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

const defaultDoc = {
  title: 'Nouvelle Présentation',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

export default function TrocoSlides(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const safeProps = props || {};
  const documentData = safeProps.document || safeProps.documentData || safeProps.slidesData || defaultDoc;
  const content = documentData?.content ?? '';

  const groupId = String(safeProps.groupId?.id || safeProps.groupId || safeProps.chatId || 'demo_group_office');
  const documentId = String(
    safeProps.documentId ||
    safeProps.docId ||
    documentData?.id ||
    documentData?.documentId ||
    `slides_${groupId}_slides`
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
      initialTab="slides"
      onSendToChat={safeProps.onSendToChat}
      handleSendMessage={safeProps.handleSendMessage}
    />
  );
}

export { TrocoSlides, defaultDoc };
