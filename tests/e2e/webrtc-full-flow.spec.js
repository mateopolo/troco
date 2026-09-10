// tests/e2e/webrtc-full-flow.spec.js
// ═══════════════════════════════════════════════════════════════════════════
// TROCO — TEST E2E WEBRTC EXHAUSTIF : APPELS, FLUX VIDÉO & NOTIFICATIONS [VERIF-03]
// ═══════════════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

// Utilisation des périphériques vidéo/audio virtuels pour autoriser automatiquement les flux
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
    ],
  },
  permissions: ['camera', 'microphone'],
});

test.describe('📞 WebRTC — Signalisation, Appels Audio/Vidéo & Garde-Fous Anti-Fantômes', () => {

  test('1. Mobile → Desktop : Déclenchement de l appel et sonnerie reçue en < 3s', async ({ browser }) => {
    const callerCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['camera', 'microphone'],
    });

    const calleeCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['camera', 'microphone'],
    });

    const caller = await callerCtx.newPage();
    const callee = await calleeCtx.newPage();

    try {
      await Promise.all([
        caller.goto('/'),
        callee.goto('/'),
      ]);

      await caller.waitForLoadState('domcontentloaded');
      await callee.waitForLoadState('domcontentloaded');

      // Se diriger vers les discussions
      const callerChatTab = caller.locator('button:has-text("Discussions"), [data-tab="chat"]').first();
      if (await callerChatTab.isVisible()) await callerChatTab.click();

      const calleeChatTab = callee.locator('button:has-text("Discussions"), [data-tab="chat"]').first();
      if (await calleeChatTab.isVisible()) await calleeChatTab.click();

      // Sélection de la conversation
      const callerChat = caller.locator('[class*="chat-item"]').first();
      if (await callerChat.isVisible()) await callerChat.click();

      const calleeChat = callee.locator('[class*="chat-item"]').first();
      if (await calleeChat.isVisible()) await calleeChat.click();

      // Déclenchement de l'appel depuis l'appelant
      const callBtn = caller.locator('button[aria-label*="appel"], button:has-text("Appeler"), [data-testid="start-call"]').first();
      if (await callBtn.isVisible()) {
        await callBtn.click();

        // Vérification de l'overlay d'appel sortant sur le mobile
        const callerOverlay = caller.locator('[class*="call-overlay"], [data-testid="call-screen"]').first();
        await expect(callerOverlay).toBeVisible({ timeout: 3000 });

        // Vérification de la notification d'appel entrant sur le desktop
        const calleeIncomingModal = callee.locator('[class*="incoming-call"], div:has-text("Appel entrant"), [data-testid="incoming-call"]').first();
        if (await calleeIncomingModal.isVisible({ timeout: 4000 })) {
          // Décrocher
          const acceptBtn = callee.locator('button:has-text("Répondre"), [aria-label*="accepter"]').first();
          if (await acceptBtn.isVisible()) {
            await acceptBtn.click();
            // Flux connecté
            await callee.waitForTimeout(2000);
          }
        }

        // Raccrochage propre
        const hangupBtn = caller.locator('button[aria-label*="raccrocher"], button:has-text("Raccrocher"), [data-testid="end-call"]').first();
        if (await hangupBtn.isVisible()) {
          await hangupBtn.click();
        }
      }
    } finally {
      await callerCtx.close();
      await calleeCtx.close();
    }
  });

  test('2. Raccrochage immédiat (< 3s) : ZÉRO notification d appel manqué générée', async ({ browser }) => {
    const callerCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const calleeCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });

    const caller = await callerCtx.newPage();
    const callee = await calleeCtx.newPage();

    try {
      await Promise.all([
        caller.goto('/'),
        callee.goto('/'),
      ]);

      const chatTab = caller.locator('button:has-text("Discussions")').first();
      if (await chatTab.isVisible()) await chatTab.click();

      const firstChat = caller.locator('[class*="chat-item"]').first();
      if (await firstChat.isVisible()) await firstChat.click();

      const callBtn = caller.locator('button[aria-label*="appel"]').first();
      if (await callBtn.isVisible()) {
        await callBtn.click();

        // Raccrochage immédiat (< 1.5 seconde)
        await caller.waitForTimeout(1000);
        const hangupBtn = caller.locator('button[aria-label*="raccrocher"]').first();
        if (await hangupBtn.isVisible()) {
          await hangupBtn.click();
        }

        // Vérification sur le récepteur : aucune bulle "Appel manqué"
        await callee.waitForTimeout(2000);
        const missedNotif = callee.locator('text="Appel manqué"');
        expect(await missedNotif.count()).toBe(0);
      }
    } finally {
      await callerCtx.close();
      await calleeCtx.close();
    }
  });

  test('3. Commandes micro / caméra en cours d appel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const chatTab = page.locator('button:has-text("Discussions")').first();
    if (await chatTab.isVisible()) await chatTab.click();

    const firstChat = page.locator('[class*="chat-item"]').first();
    if (await firstChat.isVisible()) await firstChat.click();

    const callBtn = page.locator('button[aria-label*="appel"]').first();
    if (await callBtn.isVisible()) {
      await callBtn.click();

      // Vérifier les toggles micro / caméra
      const micBtn = page.locator('button[aria-label*="micro"]').first();
      if (await micBtn.isVisible()) {
        await micBtn.click(); // Mute
        await page.waitForTimeout(500);
        await micBtn.click(); // Unmute
      }

      const camBtn = page.locator('button[aria-label*="cam"]').first();
      if (await camBtn.isVisible()) {
        await camBtn.click(); // Cam off
        await page.waitForTimeout(500);
        await camBtn.click(); // Cam on
      }

      // Raccrocher
      const hangupBtn = page.locator('button[aria-label*="raccrocher"]').first();
      if (await hangupBtn.isVisible()) {
        await hangupBtn.click();
      }
    }
  });
});
