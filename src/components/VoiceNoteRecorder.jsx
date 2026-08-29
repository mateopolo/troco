import React, { useState, useEffect, useRef } from 'react';
import { Square, Trash2, Send, Play, Pause } from 'lucide-react';

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
        const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? { mimeType: 'audio/webm;codecs=opus' }
          : MediaRecorder.isTypeSupported('audio/webm')
            ? { mimeType: 'audio/webm' }
            : MediaRecorder.isTypeSupported('audio/mp4')
              ? { mimeType: 'audio/mp4' }
              : {};

        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm',
          });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        };

        mediaRecorder.start(100);
        timerRef.current = setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
      } catch (err) {
        console.error('[VoiceNoteRecorder] Microphone access error:', err);
        alert('Impossible d’accéder au microphone. Veuillez vérifier les autorisations de votre navigateur.');
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

  const handleSend = async () => {
    if (isUploading) return;
    setIsUploading(true);

    if (!audioBlob && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Si l'utilisateur clique directement sur envoyer pendant l'enregistrement
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current.mimeType || 'audio/webm',
        });
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (typeof onSendVoiceNote === 'function') {
          try { await onSendVoiceNote(blob, duration); } catch (e) { console.warn(e); }
        }
        setIsUploading(false);
      };
      mediaRecorderRef.current.stop();
    } else if (audioBlob) {
      if (typeof onSendVoiceNote === 'function') {
        try { await onSendVoiceNote(audioBlob, duration); } catch (e) { console.warn(e); }
      }
      setIsUploading(false);
    } else {
      onCancel?.();
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
      {/* SECTION GAUCHE : INDICATEUR OU LECTEUR PRÉVISUALISATION */}
      {previewUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <audio
            ref={previewAudioRef}
            src={previewUrl}
            onEnded={() => setIsPreviewPlaying(false)}
          />
          <button
            type="button"
            onClick={handleTogglePreviewPlay}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {isPreviewPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
            Prévisualiser ({formatTimer(duration)})
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-danger)',
              boxShadow: '0 0 8px var(--accent-danger)',
              animation: 'pulse 1.2s infinite',
            }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-danger)' }}>
              REC {formatTimer(duration)}
            </span>
          </div>

          {/* ONDE AUDIO ANIMÉE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
            {[14, 22, 10, 26, 18, 12, 24, 16, 20, 10].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: '2px',
                  animation: `bounceDot 1s infinite ease-in-out`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* COMMANDES DE FIN D'ENREGISTREMENT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* ANNULER */}
        <button
          type="button"
          onClick={onCancel}
          className="premium-button"
          style={{
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Annuler l'enregistrement"
        >
          <Trash2 size={16} />
        </button>

        {/* STOP / PRÉVISUALISER (si encore en train d'enregistrer) */}
        {!previewUrl && (
          <button
            type="button"
            onClick={handleStopAndPreview}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Écouter avant d'envoyer"
          >
            <Square size={14} fill="currentColor" />
          </button>
        )}

        {/* ENVOYER LE MESSAGE VOCAL */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading}
          className="premium-button"
          style={{
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-accent)',
            opacity: isUploading ? 0.7 : 1,
          }}
          title="Envoyer la note vocale"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
