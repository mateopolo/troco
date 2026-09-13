import React from 'react';
import { Table } from 'lucide-react';

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

  if (message.type === 'sheet_share') {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-2xl max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/40">
            <Table size={20} className="text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {message.sheetTitle || 'Tableau partagé'}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {message.cellCount || 0} cellules
            </p>
          </div>
        </div>
        {message.previewImageUrl && (
          <img
            src={message.previewImageUrl}
            alt={`Aperçu de ${message.sheetTitle || 'Tableau partagé'}`}
            className="w-full h-32 object-cover rounded-lg"
          />
        )}
        <a
          href={message.sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
        >
          Ouvrir le tableur
        </a>
      </div>
    );
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
          <p className="transcript-text text-sm text-[var(--text-secondary)] mt-2">{transcript}</p>
          <button type="button" className="text-xs underline mt-1" disabled>
            Original / Traduction
          </button>
        </>
      )}
      {!transcript && (
        <>
          <button
            type="button"
            className="text-xs underline mt-1"
            aria-label="Transcrire la note vocale avec SpeechRecognition"
            disabled
          >
            Transcrire
          </button>
        </>
      )}
    </div>
  );
}
