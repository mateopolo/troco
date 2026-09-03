import React from 'react';
import { render } from '@testing-library/react';
import { getChatAudioContext } from '../hooks/useChatManager';
import fs from 'fs';
import path from 'path';

describe('Phase 116 : Découplage du State (Whiteboard) et Fix des Memory Leaks', () => {
  test('1. AudioContext dans useChatManager est un singleton réutilisable', () => {
    // Mock window.AudioContext
    const mockResume = jest.fn().mockResolvedValue(undefined);
    const mockContextInstance = {
      state: 'running',
      resume: mockResume,
      createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        frequency: { setValueAtTime: jest.fn() },
        start: jest.fn(),
        stop: jest.fn(),
      })),
      createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: {
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
      })),
      currentTime: 100,
      destination: {},
    };

    const MockAudioContext = jest.fn(() => mockContextInstance);
    window.AudioContext = MockAudioContext;

    const ctx1 = getChatAudioContext();
    const ctx2 = getChatAudioContext();
    const ctx3 = getChatAudioContext();

    expect(ctx1).toBe(ctx2);
    expect(ctx2).toBe(ctx3);
    // Exactement 1 instanciation malgré 3 appels
    expect(MockAudioContext).toHaveBeenCalledTimes(1);
  });

  test('2. CloudOfficeSuiteModal.jsx ne possède pas docContent dans les dépendances du listener de document', () => {
    const filePath = path.join(__dirname, 'CloudOfficeSuiteModal.jsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Vérifie que le premier listener onSnapshot (Troco Docs) ne dépend pas de docContent ou docTitle
    // Regex recherchant la clôture du useEffect de synchronisation Troco Docs
    const docsEffectMatch = content.match(
      /\/\/ Synchronisation Firestore en temps réel pour Troco Docs[\s\S]*?}, \[([^\]]*)\]\);/
    );

    expect(docsEffectMatch).toBeTruthy();
    const depsString = docsEffectMatch[1];
    expect(depsString).not.toContain('docContent');
    expect(depsString).not.toContain('docTitle');
  });

  test('3. CollaborativeWhiteboardModal.jsx ne possède pas remoteCursors dans les dépendances de présence', () => {
    const filePath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Vérifie que le listener de présence ne dépend plus de remoteCursors
    const presenceEffectMatch = content.match(
      /\/\/ ================= 3\.1 SYSTÈME DE PRÉSENCE FIREBASE & MULTIJOUEUR LIVE =================[\s\S]*?}, \[([^\]]*)\]\);/
    );

    expect(presenceEffectMatch).toBeTruthy();
    const depsString = presenceEffectMatch[1];
    expect(depsString).not.toContain('remoteCursors');
  });

  test('4. CollaborativeWhiteboardModal.jsx utilise currentDrawRef et aucun setLocalPaths dans handlePointerMove', () => {
    const filePath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extraction de la fonction handlePointerMove
    const pointerMoveMatch = content.match(
      /const handlePointerMove = \(e\) => {([\s\S]*?)const handlePointerUp/
    );

    expect(pointerMoveMatch).toBeTruthy();
    const pointerMoveBody = pointerMoveMatch[1];

    // Vérifie qu'aucun setLocalPaths ni setCanvasObjects n'est invoqué pendant le move
    expect(pointerMoveBody).not.toContain('setLocalPaths(');
    expect(pointerMoveBody).not.toContain('setCanvasObjects(');

    // Vérifie que currentDrawRef est utilisé pour bufferiser les points
    expect(pointerMoveBody).toContain('currentDrawRef.current.push(newPoint)');
    expect(content).toContain('const currentDrawRef = useRef([]);');
  });
});
