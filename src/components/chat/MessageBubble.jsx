import React from 'react';

/**
 * MessageBubble.jsx — Rendu unifié des bulles de messages du chat
 * Supporte le rendu direct des fichiers audio natifs (.mp3, .wav, .mp4, .webm, etc.)
 * 
 * Règles de rendu audio cross-platform :
 * - <audio controls preload="metadata"> avec sources de secours pour compatibilité PC, iOS Safari et Android
 * - Classe max-w-[200px] md:max-w-xs pour s'adapter élégamment aux bulles de discussion
 * - Fallback gracieux si audioUrl absent
 */
export default function MessageBubble({ message = {}, isMe = false }) {
  if (message.type === 'audio' || message.kind === 'audio') {
    return (
      <div className="p-2">
        {message.fileName && (
          <div className="text-xs font-bold mb-1 opacity-90">
            🎵 {message.fileName}
          </div>
        )}
        {message.audioUrl ? (
          <audio
            controls
            preload="metadata"
            src={message.audioUrl}
            className="max-w-[200px] md:max-w-xs"
          >
            <source src={message.audioUrl} type={message.mimeType || 'audio/mp4'} />
            <source src={message.audioUrl} type="audio/webm" />
            <source src={message.audioUrl} type="audio/ogg" />
            <source src={message.audioUrl} type="audio/mpeg" />
            Votre navigateur ne supporte pas l'élément audio.
          </audio>
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
