import React, { useState } from 'react';
import { Sparkles, Languages } from 'lucide-react';
import { translateText } from '../../utils/translator';

/**
 * MessageBubble.jsx — Rendu unifié des bulles de messages du chat
 * Supporte le rendu direct des fichiers audio natifs (.mp3, .wav, .mp4, .webm, etc.)
 * avec transcription textuelle Speech-to-Text et bouton de bascule dynamique
 * [ Voir la traduction ] / [ Voir l'original ].
 */
export default function MessageBubble({ message = {}, isMe = false, targetLang = 'fr' }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const rawTranscript = message.transcript || message.transcription || '';
  const sourceLang = message.transcriptLang || 'auto';

  const handleToggleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (!translatedText && rawTranscript) {
      setIsTranslating(true);
      try {
        const dest = targetLang || (isMe ? 'en' : 'fr');
        const res = await translateText(rawTranscript, dest, sourceLang);
        setTranslatedText(res || rawTranscript);
      } catch (err) {
        console.warn('[MessageBubble] Translation failed:', err);
        setTranslatedText(rawTranscript);
      } finally {
        setIsTranslating(false);
      }
    }
    setShowTranslation(true);
  };

  if (message.type === 'audio' || message.kind === 'audio') {
    return (
      <div className="p-2 flex flex-col gap-1.5">
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

        {/* Sous le lecteur audio : transcription textuelle et bouton pill de traduction */}
        {rawTranscript && (
          <div className="mt-1 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[10.5px] opacity-75 flex items-center gap-1">
                <Sparkles size={11} className="text-[var(--accent-primary)]" />
                {showTranslation ? 'Traduction' : 'Transcription'}
              </span>
              <button
                type="button"
                onClick={handleToggleTranslation}
                disabled={isTranslating}
                className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer flex items-center gap-1"
                title={showTranslation ? "Voir l'original" : "Voir la traduction"}
              >
                <Languages size={10} />
                {isTranslating ? (
                  <span>Traduction...</span>
                ) : showTranslation ? (
                  <span>Voir l'original</span>
                ) : (
                  <span>Voir la traduction</span>
                )}
              </button>
            </div>
            <p className="italic text-[11.5px] leading-relaxed opacity-95">
              « {showTranslation ? (translatedText || rawTranscript) : rawTranscript} »
            </p>
          </div>
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
