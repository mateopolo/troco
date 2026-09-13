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

    const downloadURL = await uploadResumable(storageRef, audioBlob, metadata, 3000);

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
 * Les fichiers importés ne sont jamais convertis en Data URL : Firestore refuserait
 * les fichiers dépassant sa limite de 1 MiB lorsqu'ils sont stockés dans un message.
 */
export async function uploadAudioFile(file, chatId = 'global') {
  if (!file) throw new Error('No audio file provided');
  // Le ré-encodage WAV bloque le thread principal et ne compresse pas le PCM.
  // L'original est conservé pour rendre la sélection et l'envoi immédiats.
  const uploadFile = file;

  const extension = String(uploadFile.name || file.name || '').split('.').pop().toLowerCase();
  const extensionMime = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    aac: 'audio/aac',
  }[extension];
  const resolvedContentType = uploadFile.type?.startsWith('audio/')
    ? uploadFile.type
    : extensionMime || 'audio/wav';
  if (!file.type?.startsWith('audio/') && !extensionMime) {
    throw new Error('Unsupported audio file type');
  }
  const cleanName = `${Date.now()}_${file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'audio.mp3'}`;
  const storagePath = `chat_audios/${cleanName}`;

  try {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized.');
    }

    const storageRef = ref(storage, storagePath);
    const uploadPromise = uploadFile.size <= 10 * 1024 * 1024
      ? uploadBytesWithTimeout(storageRef, uploadFile, {
        contentType: resolvedContentType,
        customMetadata: {
          uploadedBy: auth.currentUser?.uid || 'anonymous',
          originalName: file.name,
        },
      }, 15000)
      : uploadResumable(storageRef, uploadFile, {
      contentType: resolvedContentType,
      customMetadata: {
        uploadedBy: auth.currentUser?.uid || 'anonymous',
        originalName: file.name,
      },
      }, 60000);
    const uploadedSnapshot = await uploadPromise;
    const downloadUrl = await getDownloadURL(uploadedSnapshot.ref);
    return {
      success: true,
      audioUrl: downloadUrl,
      fileName: file.name || cleanName,
      contentType: resolvedContentType,
    };
  } catch (err) {
    logger.error('[VoiceStorageService] Storage upload failed:', err);
    logger.error('[VoiceStorageService] Storage error code:', err?.code);
    logger.error('[VoiceStorageService] Storage error message:', err?.message);
    throw err;
  }

  function uploadBytesWithTimeout(storageRef, data, metadata, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Firebase Storage upload timeout after ${timeoutMs / 1000} seconds.`));
        }
      }, timeoutMs);

      uploadBytes(storageRef, data, metadata)
        .then((snapshot) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          resolve(snapshot);
        })
        .catch((error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}

function uploadResumable(storageRef, data, metadata, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, data, metadata);
    const timeout = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error(`Firebase Storage upload timeout after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
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
