import React, { useState, useEffect, useRef } from 'react';
import { Square, Trash2, Send, Play, Pause, Sparkles } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * VoiceNoteRecorder — Enregistrement vocal cross-platform (iOS Safari, Chrome, Firefox, Android)
 * avec capture Speech-to-Text (SpeechRecognition) en parallèle pour transcription et traduction instantanée.
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
  userLang = 'fr',
}) {
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [detectedMimeType, setDetectedMimeType] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');

  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Démarrer l'enregistrement et la reconnaissance vocale au montage
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

        // 1. Normalisation du MediaRecorder à l'enregistrement (mp4 en priorité pour iOS)
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

        // 2. Capture de la transcription vocale en parallèle (Speech-to-Text STT)
        const SpeechRecognition = typeof window !== 'undefined'
          ? (window.SpeechRecognition || window.webkitSpeechRecognition)
          : null;

        if (SpeechRecognition) {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            const langMap = {
              fr: 'fr-FR',
              en: 'en-US',
              es: 'es-ES',
              it: 'it-IT',
              de: 'de-DE',
              pt: 'pt-PT',
            };
            recognition.lang = langMap[userLang?.toLowerCase()] || 'fr-FR';

            recognition.onresult = (event) => {
              let text = '';
              for (let i = 0; i < event.results.length; i++) {
                text += event.results[i][0].transcript;
              }
              const trimmed = text.trim();
              transcriptRef.current = trimmed;
              setLiveTranscript(trimmed);
            };

            recognition.onerror = (event) => {
              if (event.error !== 'no-speech') {
                console.debug('[VoiceNoteRecorder] SpeechRecognition note:', event.error);
              }
            };

            recognition.start();
            recognitionRef.current = recognition;
          } catch (recErr) {
            console.debug('[VoiceNoteRecorder] SpeechRecognition start note:', recErr);
          }
        }
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
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
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
  }, [isRecording, userLang]);

  const handleStopAndPreview = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
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
   * handleSend — Upload cross-platform vers Firebase Storage avec contentType explicite
   * puis résolution stricte de getDownloadURL() avant d'appeler onSendVoiceNote avec transcript.
   */
  const handleSend = async () => {
    if (isUploading) return;
    setIsUploading(true);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const doUploadAndSend = async (blob) => {
      if (!blob) {
        onCancel?.();
        setIsUploading(false);
        return;
      }

      const finalMimeType = blob.type || detectedMimeType || 'audio/mp4';
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

      if (storage) {
        try {
          const storageRef = ref(storage, `voice_notes/${fileName}`);
          const snapshot = await uploadBytes(storageRef, blob, {
            contentType: finalMimeType || 'audio/mp4',
          });
          audioUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          console.warn('[VoiceNoteRecorder] Storage upload failed, fallback to dataURL:', storageErr);
        }
      }

      if (!audioUrl) {
        audioUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const capturedTranscript = transcriptRef.current || liveTranscript || '';

      if (typeof onSendVoiceNote === 'function') {
        try {
          await onSendVoiceNote(blob, duration, audioUrl, finalMimeType, capturedTranscript, userLang);
        } catch (e) {
          console.warn('[VoiceNoteRecorder] onSendVoiceNote error:', e);
        }
      }
      setIsUploading(false);
    };

    if (!audioBlob && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
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
          flexShrink: 0,
        }}>
          {formatTimer(duration)}
        </span>

        {/* Retranscription en direct discrète */}
        {liveTranscript ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontStyle: 'italic',
          }}>
            <Sparkles size={11} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              « {liveTranscript} »
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
            Enregistrement audio...
          </span>
        )}

        {/* Aperçu audio si arrêté */}
        {previewUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
              aria-label={isPreviewPlaying ? 'Mettre en pause l\'aperçu audio' : 'Écouter l\'aperçu audio de la note vocale'}
            >
              {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Aperçu</span>
          </div>
        )}
      </div>

      {/* SECTION DROITE : Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Bouton Arrêter & Aperçu */}
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
            aria-label="Arrêter l'enregistrement et réécouter"
          >
            <Square size={16} fill="currentColor" />
          </button>
        )}

        {/* Bouton Annuler */}
        <button
          type="button"
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch (_) {}
            }
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
          aria-label="Supprimer la note vocale et annuler"
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
          aria-label="Envoyer la note vocale"
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
