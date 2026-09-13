import React, { useState } from 'react';

/**
 * MessageBubble.jsx — Rendu unifié des bulles de messages du chat
 * Supporte le rendu direct des fichiers audio natifs (.mp3, .wav, etc.)
 * 
 * Règles de rendu audio :
 * - h-10 : hauteur contrainte pour ne pas déformer la mise en page
 * - max-w-[200px] : largeur max pour rester dans la bulle
 * - z-10 relative : correct stacking au-dessus des autres éléments
 * - rounded-full : aspect pill moderne
 * - Fallback si audioUrl absent : message d'erreur explicite
 */
export default function MessageBubble({ message = {}, isMe = false }) {
  if (message.type === 'audio') {
    return <AudioMessage message={message} />;
  }

  if (typeof message.type === 'string' && message.type.startsWith('office_')) {
    const kind = message.type.slice('office_'.length);
    return (
      <div className="p-3 rounded-2xl border border-[#C67D5B]/30 bg-[#C67D5B]/10 min-w-[220px]">
        <div className="text-xs font-bold uppercase tracking-wide text-[#A65D40]">
          {kind === 'sheets' ? '📊 Troco Sheets' : kind === 'slides' ? '📽️ Troco Slides' : kind === 'docs' ? '📝 Troco Docs' : '📌 Troco Notes'}
        </div>
        <div className="font-semibold mt-1">{message.title || 'Document partagé'}</div>
        <div className="text-xs opacity-75 mt-1 line-clamp-3">{message.summary || message.text}</div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-2xl ${
        isMe
          ? 'bg-[#C67D5B] text-white'
          : 'bg-gray-100 dark:bg-[#2A2624] text-inherit'
      }`}
    >
      {message.fileName && (
        <div className="text-xs font-bold mb-1 opacity-90">{message.fileName}</div>
      )}
      <div className="text-sm">{message.text || message.content}</div>
    </div>
  );
}

function AudioMessage({ message }) {
  const [showTranscript, setShowTranscript] = useState(Boolean(message.transcript));
  const [requestedTranscript, setRequestedTranscript] = useState(false);
  const transcript = typeof message.transcript === 'string' ? message.transcript.trim() : '';
  return (
    <div className="p-2">
      {message.audioUrl ? (
        <audio controls src={message.audioUrl} className="max-w-[200px] md:max-w-xs h-10 z-10 relative rounded-full" preload="metadata" />
      ) : (
        <span className="text-xs italic opacity-60">🎵 {message.fileName || 'Fichier audio'} — URL manquante</span>
      )}
      {transcript && (
        <>
          <p className="text-xs mt-2">{showTranscript ? transcript : 'Traduction non disponible'}</p>
          <button type="button" className="text-xs underline mt-1" onClick={() => setShowTranscript(value => !value)}>
            Original / Traduction
          </button>
        </>
      )}
      {!transcript && (
        <>
          {requestedTranscript && <p className="text-xs mt-2 italic opacity-70">Transcription non disponible pour cette note.</p>}
          <button
            type="button"
            className="text-xs underline mt-1"
            aria-label="Transcrire la note vocale avec SpeechRecognition"
            onClick={() => setRequestedTranscript(true)}
          >
            Transcrire
          </button>
        </>
      )}
    </div>
  );
}
