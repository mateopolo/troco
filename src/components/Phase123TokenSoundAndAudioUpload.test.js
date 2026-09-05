import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageBubble from './chat/MessageBubble';

describe('Phase 123 : Fix des effets sonores de jetons et ajout de l\'upload de fichiers audio', () => {
  const useChatManagerPath = path.join(__dirname, '../hooks/useChatManager.js');
  const useChatManagerContent = fs.readFileSync(useChatManagerPath, 'utf-8');

  const chatInputBarPath = path.join(__dirname, 'chat/ChatInputBar.jsx');
  const chatInputBarContent = fs.readFileSync(chatInputBarPath, 'utf-8');

  const messageBubblePath = path.join(__dirname, 'chat/MessageBubble.jsx');
  const messageBubbleContent = fs.readFileSync(messageBubblePath, 'utf-8');

  describe('1. Fix du son des jetons (useChatManager.js)', () => {
    test('handleSendToken ne joue pas playNotificationSound() ni playBetclicBalanceSound(true) pour l\'expéditeur', () => {
      // Isoler le bloc handleSendToken
      const handleSendTokenStart = useChatManagerContent.indexOf('const handleSendToken = async');
      const handleSendTokenEnd = useChatManagerContent.indexOf('renderDealCard =', handleSendTokenStart);
      const handleSendTokenBlock = useChatManagerContent.slice(handleSendTokenStart, handleSendTokenEnd);

      // Ne doit PAS jouer le son de gain ou la notification d'arrivée
      expect(handleSendTokenBlock).not.toContain('playNotificationSound()');
      expect(handleSendTokenBlock).not.toContain('playBetclicBalanceSound(true)');

      // Doit jouer le son d'envoi type swoosh
      expect(handleSendTokenBlock).toContain('playSwooshSound()');
    });

    test('Seul le listener onSnapshot déclenche le son de gain vert playBetclicBalanceSound(true)', () => {
      const walletStorePath = path.join(__dirname, '../stores/useWalletStore.js');
      const walletStoreContent = fs.readFileSync(walletStorePath, 'utf-8');
      expect(walletStoreContent).toContain('playBetclicBalanceSound(true);');

      const appPath = path.join(__dirname, '../App.js');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      expect(appContent).toContain('playBetclicBalanceSound(true);');
    });
  });

  describe('2. Ajout de l\'upload audio dans le chat (ChatInputBar.jsx & MessageBubble.jsx)', () => {
    test('ChatInputBar contient un input file caché accept="audio/*" avec onChange={handleAudioUpload}', () => {
      expect(chatInputBarContent).toMatch(/<input[^>]*type="file"[^>]*accept="audio\/\*"[^>]*onChange=\{handleAudioUpload\}/);
      expect(chatInputBarContent).toContain('audioInputRef');
    });

    test('ChatInputBar connecte l\'upload à un bouton Trombone (Paperclip)', () => {
      expect(chatInputBarContent).toContain('Paperclip');
      expect(chatInputBarContent).toContain('audioInputRef.current.click()');
    });

    test('handleAudioUpload uploade vers chat_audios/ et envoie le message avec type: "audio", audioUrl, fileName', () => {
      expect(chatInputBarContent).toContain('chat_audios/');
      expect(chatInputBarContent).toContain("type: 'audio'");
      expect(chatInputBarContent).toContain('audioUrl: downloadUrl');
      expect(chatInputBarContent).toContain('fileName: file.name');
    });

    test('MessageBubble.jsx affiche le lecteur audio natif pour message.type === "audio"', () => {
      expect(messageBubbleContent).toContain('message.type === \'audio\'');
      expect(messageBubbleContent).toContain('<audio controls src={message.audioUrl} className="max-w-[200px] md:max-w-xs" />');

      // Test de rendu React
      const { container } = render(
        <MessageBubble
          message={{
            type: 'audio',
            audioUrl: 'https://example.com/test_audio.mp3',
            fileName: 'test_audio.mp3',
          }}
          isMe={false}
        />
      );

      const audioTag = container.querySelector('audio');
      expect(audioTag).toBeInTheDocument();
      expect(audioTag.getAttribute('src')).toBe('https://example.com/test_audio.mp3');
      expect(audioTag.classList.contains('max-w-[200px]')).toBe(true);
    });
  });

  describe('3. Règle de non-régression (Images et Jetons)', () => {
    test('L\'upload d\'images est toujours intact dans ChatInputBar', () => {
      expect(chatInputBarContent).toContain('accept="image/*"');
      expect(chatInputBarContent).toContain('handleImageSelect');
    });
  });
});
