import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Convertit un Blob audio en Data URL Base64 (fallback résilient offline/storage)
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload d'une note vocale sur Firebase Storage
 * Si Firebase Storage est indisponible ou bloque les permissions, bascule gracieusement sur un DataURL
 */
export async function uploadVoiceNote(audioBlob, chatId = 'global') {
  if (!audioBlob) return { success: false, error: 'No audio blob provided' };

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webm`;
  const storagePath = `voice_notes/${String(chatId)}/${fileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: audioBlob.type || 'audio/webm',
    };

    const snapshot = await uploadBytes(storageRef, audioBlob, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      audioUrl: downloadURL,
      storagePath,
      isLocal: false,
    };
  } catch (err) {
    console.warn('[VoiceStorageService] Firebase Storage upload failed, fallback to DataURL:', err);
    try {
      const dataUrl = await blobToDataURL(audioBlob);
      return {
        success: true,
        audioUrl: dataUrl,
        isLocal: true,
      };
    } catch (fallbackErr) {
      console.error('[VoiceStorageService] DataURL conversion failed:', fallbackErr);
      return { success: false, error: fallbackErr };
    }
  }
}
