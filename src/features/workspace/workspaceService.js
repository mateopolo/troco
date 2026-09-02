/**
 * workspaceService.js — Moteur de persistance & versioning pour Troco Workspace
 * Collection Firestore : `workspaces`
 * Gestion multi-versions (V1, V2, V3...) avec snapshots vectoriels et prévisualisations Canvas.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../../firebase';

export const WORKSPACE_TYPES = {
  WHITEBOARD: 'whiteboard',
  DOC: 'doc',
  SHEET: 'sheet',
};

/**
 * Sauvegarde un instantané (Snapshot) de Workspace avec versioning incrémental strict.
 * Si le document n'existe pas, crée la version 1.
 * Si le document existe, incrémente la version (V2, V3...) et archive l'historique sans écrasement.
 */
export async function saveWorkspaceVersion({
  workspaceId,
  chatId,
  type = WORKSPACE_TYPES.WHITEBOARD,
  title = 'Tableau Blanc Collaboratif',
  data = { paths: [], stickyNotes: [], textElements: [] },
  previewUrl = '',
  thumbnailBase64 = '',
  currentUser = null,
  changeSummary = 'Mise à jour collaborative',
}) {
  if (!db) {
    console.warn('[WorkspaceService] Firestore non disponible — mode local');
    return {
      success: true,
      workspaceId: workspaceId || `local_${Date.now()}`,
      version: 1,
      isLocal: true,
    };
  }

  const effectiveId = String(workspaceId || `ws_${chatId || 'global'}_${type}`);
  const userUid = currentUser?.uid || currentUser?.id || 'anonymous';
  const userName = currentUser?.name || currentUser?.username || 'Collaborateur';

  try {
    const docRef = doc(db, 'workspaces', effectiveId);
    const docSnap = await getDoc(docRef);

    let nextVersion = 1;

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      nextVersion = (Number(existingData.version) || 1) + 1;
    }

    const versionEntry = {
      version: nextVersion,
      name: changeSummary || `Version ${nextVersion}`,
      changeSummary: changeSummary || `Version ${nextVersion}`,
      savedAt: new Date().toISOString(),
      savedByUid: userUid,
      savedByName: userName,
      previewUrl: previewUrl || '',
      backgroundColor: data.backgroundColor || '#FFFFFF',
      data: {
        paths: (data.paths || []).slice(-450),
        stickyNotes: data.stickyNotes || [],
        textElements: data.textElements || [],
        backgroundColor: data.backgroundColor || '#FFFFFF',
      },
      itemCount: (data.paths?.length || 0) + (data.stickyNotes?.length || 0) + (data.textElements?.length || 0),
    };

    const workspacePayload = {
      id: effectiveId,
      chatId: chatId ? String(chatId) : null,
      type,
      title: title || (type === WORKSPACE_TYPES.WHITEBOARD ? 'Tableau Blanc Collaboratif' : 'Workspace'),
      version: nextVersion,
      previewUrl: previewUrl || thumbnailBase64 || '',
      thumbnailBase64: thumbnailBase64 || previewUrl || '',
      data: {
        paths: (data.paths || []).slice(-450),
        stickyNotes: data.stickyNotes || [],
        textElements: data.textElements || [],
        backgroundColor: data.backgroundColor || '#FFFFFF',
      },
      lastModifiedBy: userUid,
      lastModifiedByName: userName,
      updatedAt: serverTimestamp(),
      versionHistory: arrayUnion(versionEntry),
    };

    if (!docSnap.exists()) {
      workspacePayload.createdBy = userUid;
      workspacePayload.createdByName = userName;
      workspacePayload.createdAt = serverTimestamp();
      await setDoc(docRef, workspacePayload);
    } else {
      await updateDoc(docRef, workspacePayload);
    }

    return {
      success: true,
      workspaceId: effectiveId,
      version: nextVersion,
      previewUrl,
      title: workspacePayload.title,
    };
  } catch (error) {
    console.error('🚨 [WorkspaceService] Erreur sauvegarde Firestore:', error);
    return {
      success: false,
      error: error.message || 'Échec de sauvegarde',
      workspaceId: effectiveId,
      version: 1,
    };
  }
}

/**
 * Charge un workspace depuis Firestore avec son état vectoriel complet.
 */
export async function loadWorkspaceData(workspaceId) {
  if (!db || !workspaceId) return null;

  try {
    const docRef = doc(db, 'workspaces', String(workspaceId));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.warn('[WorkspaceService] Erreur chargement Firestore:', err);
    return null;
  }
}

/**
 * Émet automatiquement un message de type `workspace_invite` dans la discussion.
 * Permet à tous les participants du chat de voir la carte cliquable avec miniature et version.
 */
export async function postWorkspaceInviteToChat({
  chatId,
  workspaceId,
  workspaceType = WORKSPACE_TYPES.WHITEBOARD,
  title = 'Tableau Blanc Collaboratif',
  version = 1,
  previewUrl = '',
  currentUser = null,
}) {
  if (!db || !chatId) return false;

  const userUid = currentUser?.uid || currentUser?.id || 'me';
  const userName = currentUser?.name || currentUser?.username || 'Collaborateur';
  const userAvatar = currentUser?.avatar || '';

  const typeLabels = {
    whiteboard: 'Tableau Blanc',
    doc: 'Troco Doc',
    sheet: 'Troco Sheet',
  };

  const label = typeLabels[workspaceType] || 'Workspace';
  const textNotice = `🎨 ${userName} a partagé une nouvelle version du ${label} (V${version})`;

  try {
    const chatDocId = String(chatId);
    const msgPayload = {
      text: textNotice,
      sender: userUid,
      senderName: userName,
      senderAvatar: userAvatar,
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
      type: 'workspace_invite',
      kind: 'workspace_invite',
      workspaceId: String(workspaceId),
      boardId: String(workspaceId),
      workspaceType,
      workspaceTitle: title || label,
      version: Number(version) || 1,
      previewUrl: previewUrl || '',
    };

    await addDoc(collection(db, 'chats', chatDocId, 'messages'), msgPayload);
    await updateDoc(doc(db, 'chats', chatDocId), {
      lastMessage: textNotice,
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSender: userUid,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (err) {
    console.warn('[WorkspaceService] Échec envoi message invite au chat:', err);
    return false;
  }
}

/**
 * Récupère l'historique complet des versions pour un workspace/boardId.
 */
export async function fetchWorkspaceVersions(workspaceId) {
  if (!db || !workspaceId) return [];

  try {
    const docRef = doc(db, 'workspaces', String(workspaceId));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const history = Array.isArray(data.versionHistory) ? data.versionHistory : [];
      return history.sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
    }
    return [];
  } catch (err) {
    console.warn('[WorkspaceService] Erreur récupération versions:', err);
    return [];
  }
}

