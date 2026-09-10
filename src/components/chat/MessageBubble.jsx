import React from 'react';

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
    return (
      <div className="p-2">
        {message.audioUrl ? (
          <audio
            controls
            src={message.audioUrl}
            className="h-10 max-w-[200px] z-10 relative rounded-full"
            preload="metadata"
          />
        ) : (
          <span className="text-xs italic opacity-60">
            🎵 {message.fileName || 'Fichier audio'} — URL manquante
          </span>
        )}
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
