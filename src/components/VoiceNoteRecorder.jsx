import React, { useState, useEffect, useRef } from 'react';
import { Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * VoiceNoteRecorder — Enregistrement vocal cross-platform (iOS Safari, Chrome, Firefox, Android)
 *
 * STRATÉGIE MIME TYPE (Cross-Platform Universel) :
 * - audio/mp4 en PREMIER : seul format décodé nativement par Safari / iOS / WebKit
 * - audio/webm;codecs=opus : Chrome / Firefox / Android WebView
 * - audio/webm : fallback Chrome sans opus
 * - audio/ogg : Firefox Linux
 * - '' (vide) : laisse le navigateur choisir (dernier recours)
 *
 * PERSISTANCE :
 * - Upload vers Firebase Storage avec contentType EXPLICITE
 * - await getDownloadURL() résolu AVANT injection dans Firestore
 */

// Détecte les types MIME supportés par le navigateur avec fallback ordonné
export function detectSupportedMimeType() {
  const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
    type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
  ) || '';
  return mimeType;
}

export default function VoiceNoteRecorder({
  isRecording,
  onCancel,
  onSendVoiceNote,
}) {
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [detectedMimeType, setDetectedMimeType] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Démarrer l'enregistrement au montage si isRecording est true
  useEffect(() => {
    let isMounted = true;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        // Normalisation du MediaRecorder à l'enregistrement (mp4 en priorité pour iOS)
        const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
          type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
        ) || '';
        setDetectedMimeType(mimeType);

        const options = mimeType ? { mimeType } : {};
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          // Utilise le mimeType réel du recorder (peut différer de l'option demandée)
          const actualMime = mediaRecorder.mimeType || mimeType || 'audio/mp4';
          const blob = new Blob(audioChunksRef.current, { type: actualMime });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        };

        // timeslice 100ms = chunks fréquents, protège contre les longs enregistrements
        mediaRecorder.start(100);
        timerRef.current = setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
      } catch (err) {
        console.error('[VoiceNoteRecorder] Microphone access error:', err);
        alert('Impossible d\'accéder au microphone. Vérifiez les autorisations de votre navigateur.');
        onCancel?.();
      }
    }

    if (isRecording) {
      startRecording();
    }

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleStopAndPreview = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handleTogglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch(() => {});
    }
  };

  /**
   * handleSend — Upload cross-platform vers Firebase Storage avec contentType EXPLICITE
   * puis résolution stricte de getDownloadURL() avant d'appeler onSendVoiceNote.
   */
  const handleSend = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const doUploadAndSend = async (blob) => {
      if (!blob) {
        onCancel?.();
        setIsUploading(false);
        return;
      }

      // Détermine le type MIME définitif (préfère celui du blob, sinon detectedMimeType)
      const finalMimeType = blob.type || detectedMimeType || 'audio/mp4';

      // Extension de fichier correspondant au MIME type
      const extMap = {
        'audio/mp4': 'mp4',
        'audio/webm': 'webm',
        'audio/webm;codecs=opus': 'webm',
        'audio/ogg': 'ogg',
        'audio/ogg;codecs=opus': 'ogg',
      };
      const ext = extMap[finalMimeType] || 'mp4';
      const fileName = `voice_${Date.now()}.${ext}`;

      let audioUrl = '';

      // Tentative 1 : Firebase Storage avec contentType explicite
      if (storage) {
        try {
          const storageRef = ref(storage, `voice_notes/${fileName}`);
          const snapshot = await uploadBytes(storageRef, blob, {
            contentType: finalMimeType || 'audio/mp4',
          });
          // Résolution STRICTE de l'URL (await bloquant) avant injection Firestore
          audioUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          console.warn('[VoiceNoteRecorder] Storage upload failed, falling back to dataURL:', storageErr);
        }
      }

      // Fallback : dataURL base64 si Storage indisponible
      if (!audioUrl) {
        audioUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (typeof onSendVoiceNote === 'function') {
        try {
          await onSendVoiceNote(blob, duration, audioUrl, finalMimeType);
        } catch (e) {
          console.warn('[VoiceNoteRecorder] onSendVoiceNote error:', e);
        }
      }
      setIsUploading(false);
    };

    if (!audioBlob && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Envoi immédiat pendant l'enregistrement : stop → onstop → upload
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.onstop = async () => {
        const actualMime = mediaRecorderRef.current?.mimeType || detectedMimeType || 'audio/mp4';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        await doUploadAndSend(blob);
      };
      mediaRecorderRef.current.stop();
    } else {
      await doUploadAndSend(audioBlob);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '8px 14px',
      borderRadius: '24px',
      backgroundColor: 'var(--bg-card)',
      border: '1.5px solid var(--accent-primary)',
      boxShadow: 'var(--shadow-card)',
      gap: '10px',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* SECTION GAUCHE : État d'enregistrement & Minuterie */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Pastille clignotante REC */}
        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          display: 'inline-block',
          flexShrink: 0,
          animation: 'pulse 1s infinite',
        }} />

        {/* Temps écoulé */}
        <span style={{
          fontFamily: 'monospace',
          fontWeight: '700',
          fontSize: '14px',
          color: 'var(--text-main)',
          minWidth: '42px',
        }}>
          {formatTimer(duration)}
        </span>

        {/* Aperçu audio / Lecteur multi-source si arrêté */}
        {previewUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <audio
              ref={previewAudioRef}
              src={previewUrl}
              onEnded={() => setIsPreviewPlaying(false)}
              preload="metadata"
            >
              <source src={previewUrl} type={detectedMimeType || 'audio/mp4'} />
              <source src={previewUrl} type="audio/webm" />
              <source src={previewUrl} type="audio/ogg" />
            </audio>
            <button
              type="button"
              onClick={handleTogglePreviewPlay}
              className="premium-button"
              style={{
                border: 'none',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isPreviewPlaying ? 'Pause' : 'Écouter l\'aperçu'}
            >
              {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Aperçu</span>
          </div>
        )}
      </div>

      {/* SECTION DROITE : Boutons d'action (Stop/Preview, Annuler, Envoyer) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Bouton Arrêter & Aperçu (visible tant qu'on enregistre) */}
        {!previewUrl && (
          <button
            type="button"
            onClick={handleStopAndPreview}
            className="premium-button"
            style={{
              border: 'none',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Arrêter et réécouter"
          >
            <Square size={16} fill="currentColor" />
          </button>
        )}

        {/* Bouton Annuler / Poubelle */}
        <button
          type="button"
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              try { mediaRecorderRef.current.stop(); } catch (_) {}
            }
            onCancel?.();
          }}
          className="premium-button"
          style={{
            border: 'none',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Supprimer la note vocale"
        >
          <Trash2 size={16} />
        </button>

        {/* Bouton Envoyer */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading || (duration === 0 && !audioBlob)}
          className="premium-button"
          style={{
            border: 'none',
            background: isUploading ? 'var(--bg-subtle)' : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFF',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-accent)',
            opacity: (duration === 0 && !audioBlob) ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
          title="Envoyer la note vocale"
        >
          {isUploading ? (
            <span style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#FFF',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <Send size={16} style={{ transform: 'translateX(-1px)' }} />
          )}
        </button>
      </div>
    </div>
  );
}
