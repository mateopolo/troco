import logger from '../utils/logger';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';

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
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      audioUrl: downloadURL,
      storagePath,
      mimeType: finalContentType,
      isLocal: false,
    };
  } catch (err) {
    logger.error('[VoiceStorageService] Firebase Storage upload failed:', err);
    logger.error('[VoiceStorageService] Firebase Storage error code:', err?.code);
    logger.error('[VoiceStorageService] Firebase Storage error message:', err?.message);
    try {
      const dataUrl = await blobToDataURL(audioBlob);
      return {
        success: true,
        audioUrl: dataUrl,
        mimeType: finalContentType,
        isLocal: true,
      };
    } catch (fallbackErr) {
      logger.error('[VoiceStorageService] DataURL conversion failed:', fallbackErr);
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

  const extension = String(file.name || '').split('.').pop().toLowerCase();
  const extensionMime = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    aac: 'audio/aac',
  }[extension];
  const resolvedContentType = file.type?.startsWith('audio/')
    ? file.type
    : extensionMime || 'audio/wav';
  if (!file.type?.startsWith('audio/') && !extensionMime) {
    throw new Error('Unsupported audio file type');
  }
  const cleanName = `${Date.now()}_${file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'audio.mp3'}`;
  const storagePath = `chat_audios/${cleanName}`;

  try {
    if (storage) {
      const storageRef = ref(storage, storagePath);
      const downloadUrl = await uploadResumable(storageRef, file, {
        contentType: resolvedContentType,
        customMetadata: {
          uploadedBy: auth.currentUser?.uid || 'anonymous',
          originalName: file.name,
        },
      });
      return {
        success: true,
        audioUrl: downloadUrl,
        fileName: file.name || cleanName,
        contentType: resolvedContentType,
      };
    }
  } catch (err) {
    logger.error('[VoiceStorageService] Storage upload failed:', err);
    logger.error('[VoiceStorageService] Storage error code:', err?.code);
    logger.error('[VoiceStorageService] Storage error message:', err?.message);
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

function uploadResumable(storageRef, data, metadata) {
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, data, metadata);
    const timeout = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Firebase Storage upload timeout after 60 seconds.'));
    }, 60000);
    const finish = (callback) => {
      clearTimeout(timeout);
      callback();
    };

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        logger.debug?.('[VoiceStorageService] Upload progress:', {
          progress: snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0,
        });
      },
      (error) => finish(() => reject(error)),
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          finish(() => resolve(downloadURL));
        } catch (error) {
          finish(() => reject(error));
        }
      },
    );
  });
}
