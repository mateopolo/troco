import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 12 — Workspace Tools in Chat & E2E Parcours 10 [VERIF-W10]', () => {
  const modalPath = path.resolve(__dirname, '../../src/components/ProjectWorkspaceToolsModal.jsx');
  const chatViewPath = path.resolve(__dirname, '../../src/components/ChatView.jsx');
  const chatInputBarPath = path.resolve(__dirname, '../../src/components/chat/ChatInputBar.jsx');
  const e2ePath = path.resolve(__dirname, '../../e2e/full-audit.spec.js');

  const modalCode = fs.readFileSync(modalPath, 'utf-8');
  const chatViewCode = fs.readFileSync(chatViewPath, 'utf-8');
  const chatInputBarCode = fs.readFileSync(chatInputBarPath, 'utf-8');
  const e2eCode = fs.readFileSync(e2ePath, 'utf-8');

  it('1. ProjectWorkspaceToolsModal définit les 5 onglets avec les data-testid requis', () => {
    expect(modalCode).toContain('data-testid={tab.testId}');
    expect(modalCode).toContain("testId: 'workspace-tab-docs'");
    expect(modalCode).toContain("testId: 'workspace-tab-sheets'");
    expect(modalCode).toContain("testId: 'workspace-tab-notes'");
    expect(modalCode).toContain("testId: 'workspace-tab-slides'");
    expect(modalCode).toContain("testId: 'workspace-tab-whiteboard'");
  });

  it('2. Les 5 onglets correspondent aux regex attendus par les tests E2E Playwright', () => {
    // Troco Docs /Docs/i
    expect(modalCode).toMatch(/Troco Docs/i);
    // Troco Sheets /Sheets|Tableur/i
    expect(modalCode).toMatch(/Troco Sheets|Tableur/i);
    // Troco Notes /Notes/i
    expect(modalCode).toMatch(/Troco Notes/i);
    // Troco Slides /Slides/i
    expect(modalCode).toMatch(/Troco Slides/i);
    // Whiteboard /Tableau Blanc|Whiteboard/i
    expect(modalCode).toMatch(/Tableau Blanc|Whiteboard/i);
  });

  it('3. ChatView.jsx intègre le bouton d’outils Workspace avec data-testid="chat-workspace-tools-button"', () => {
    expect(chatViewCode).toContain('data-testid="chat-workspace-tools-button"');
    // Vérifier la présence dans les 2 en-têtes (groupe et 1-to-1)
    const matches = chatViewCode.match(/data-testid="chat-workspace-tools-button"/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('4. ChatView.jsx supporte la sélection de discussion via data-testid="chat-item-${chat.id}"', () => {
    expect(chatViewCode).toContain('data-testid={`chat-item-${chat.id}`}');
  });

  it('5. ChatInputBar.jsx intègre également le bouton Workspace avec data-testid', () => {
    expect(chatInputBarCode).toContain('data-testid="chat-workspace-tools-input-button"');
  });

  it('6. e2e/full-audit.spec.js Parcours 10 inclut la sélection du chat seedé et l’ouverture du modal', () => {
    expect(e2eCode).toContain("chat-item-test-chat-e2e");
    expect(e2eCode).toContain("chat-workspace-tools-button");
    expect(e2eCode).toContain("workspace-tab-docs");
    expect(e2eCode).toContain("workspace-tab-sheets");
    expect(e2eCode).toContain("workspace-tab-notes");
    expect(e2eCode).toContain("workspace-tab-slides");
    expect(e2eCode).toContain("workspace-tab-whiteboard");
  });
});
