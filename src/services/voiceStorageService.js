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
 * Upload d'une note vocale sur Firebase Storage avec normalisation MIME cross-platform
 * Si Firebase Storage est indisponible ou bloque les permissions, bascule gracieusement sur un DataURL
 */
export async function uploadVoiceNote(audioBlob, chatId = 'global') {
  if (!audioBlob) return { success: false, error: 'No audio blob provided' };

  // Détection des types MIME supportés par le navigateur avec fallback ordonné
  const supportedMime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
    type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
  ) || '';

  const finalContentType = audioBlob.type || supportedMime || 'audio/mp4';
  const ext = finalContentType.includes('mp4') ? 'mp4' : finalContentType.includes('ogg') ? 'ogg' : 'webm';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = `voice_notes/${String(chatId)}/${fileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: finalContentType,
    };

    const snapshot = await uploadBytes(storageRef, audioBlob, metadata);
    // Résolution stricte de l'URL Firebase Storage avant injection Firestore
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      audioUrl: downloadURL,
      storagePath,
      mimeType: finalContentType,
      isLocal: false,
    };
  } catch (err) {
    console.warn('[VoiceStorageService] Firebase Storage upload failed, fallback to DataURL:', err);
    try {
      const dataUrl = await blobToDataURL(audioBlob);
      return {
        success: true,
        audioUrl: dataUrl,
        mimeType: finalContentType,
        isLocal: true,
      };
    } catch (fallbackErr) {
      console.error('[VoiceStorageService] DataURL conversion failed:', fallbackErr);
      return { success: false, error: fallbackErr };
    }
  }
}

/**
 * Upload d'un fichier audio (MP3, WAV, etc.) sur Firebase Storage sans limitation arbitraire de taille.
 * Force impérativement les métadonnées avec contentType: file.type || 'audio/mpeg'.
 */
export async function uploadAudioFile(file, chatId = 'global') {
  if (!file) throw new Error('No audio file provided');

  const resolvedContentType = file.type || 'audio/mpeg';
  const cleanName = `${Date.now()}_${file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'audio.mp3'}`;
  const storagePath = `chat_audios/${cleanName}`;

  try {
    if (storage) {
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'audio/mpeg',
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return {
        success: true,
        audioUrl: downloadUrl,
        fileName: file.name || cleanName,
        contentType: resolvedContentType,
      };
    }
  } catch (err) {
    console.warn('[VoiceStorageService] Storage upload failed, fallback to DataURL:', err);
  }

  // Fallback DataURL résilient si Storage est indisponible
  const dataUrl = await blobToDataURL(file);
  return {
    success: true,
    audioUrl: dataUrl,
    fileName: file.name || cleanName,
    contentType: resolvedContentType,
  };
}
