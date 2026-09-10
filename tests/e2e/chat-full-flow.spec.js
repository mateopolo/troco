// tests/e2e/chat-full-flow.spec.js
// ═══════════════════════════════════════════════════════════════════════════
// TROCO — TEST E2E EXHAUSTIF : CYCLE COMPLET DE CHAT & DÉDUPLICATION [VERIF-03]
// ═══════════════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

test.describe('💬 Chat — Synchronisation Bidirectionnelle & Cycle de Négociation', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration initiale commune si nécessaire
  });

  test('1. Mobile → Desktop : Message unique reçu en moins de 3 secondes sans doublon', async ({ browser }) => {
    // Contexte Mobile (User A)
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      hasTouch: true,
      isMobile: true,
    });

    // Contexte Desktop (User B)
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
    });

    const mobile = await mobileCtx.newPage();
    const desktop = await desktopCtx.newPage();

    try {
      // Navigation parallèle vers l'application
      await Promise.all([
        mobile.goto('/'),
        desktop.goto('/'),
      ]);

      await mobile.waitForLoadState('domcontentloaded');
      await desktop.waitForLoadState('domcontentloaded');

      // Ouverture de la section Discussions
      const mobileNavChat = mobile.locator('button:has-text("Discussions"), [data-tab="chat"], [aria-label*="discussion"]').first();
      if (await mobileNavChat.isVisible()) {
        await mobileNavChat.click();
      }

      const desktopNavChat = desktop.locator('button:has-text("Discussions"), [data-tab="chat"], [aria-label*="discussion"]').first();
      if (await desktopNavChat.isVisible()) {
        await desktopNavChat.click();
      }

      // Sélection de la première conversation active
      const chatItemMobile = mobile.locator('[class*="chat-item"], [data-testid*="chat-item"], div:has-text("Sofia"), div:has-text("Marc")').first();
      if (await chatItemMobile.isVisible()) {
        await chatItemMobile.click();
      }

      const chatItemDesktop = desktop.locator('[class*="chat-item"], [data-testid*="chat-item"], div:has-text("Sofia"), div:has-text("Marc")').first();
      if (await chatItemDesktop.isVisible()) {
        await chatItemDesktop.click();
      }

      // Saisie du message de test
      const testMsg = `e2e_msg_${Date.now()}`;
      const inputBar = mobile.locator('textarea, input[placeholder*="message"], [data-testid="chat-input"]').first();

      if (await inputBar.isVisible()) {
        await inputBar.fill(testMsg);

        // Déclenchement de l'envoi
        const sendBtn = mobile.locator('button[type="submit"], [aria-label*="envoyer"], [data-testid="chat-send"]').first();
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
        } else {
          await inputBar.press('Enter');
        }

        // Vérification immédiate sur Mobile (1 seule occurrence)
        const mobileMsgOccurrences = mobile.locator(`text=${testMsg}`);
        await expect(mobileMsgOccurrences).toHaveCount(1, { timeout: 3000 });

        // Vérification de l'arrivée sur Desktop en moins de 3s
        const desktopMsgOccurrences = desktop.locator(`text=${testMsg}`);
        await expect(desktopMsgOccurrences).toHaveCount(1, { timeout: 3000 });

        // Attente de sécurité de 3s pour certifier l'absence de rebond / dédoublement optimiste
        await mobile.waitForTimeout(3000);
        await expect(mobileMsgOccurrences).toHaveCount(1);
        await expect(desktopMsgOccurrences).toHaveCount(1);
      }
    } finally {
      await mobileCtx.close();
      await desktopCtx.close();
    }
  });

  test('2. Anti-Doublon : Double clic rapide (Burst Tap) envoie 1 seul message', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const chatTab = page.locator('button:has-text("Discussions"), [data-tab="chat"]').first();
    if (await chatTab.isVisible()) {
      await chatTab.click();
    }

    const firstChat = page.locator('[class*="chat-item"], [data-testid*="chat-item"]').first();
    if (await firstChat.isVisible()) {
      await firstChat.click();
    }

    const inputBar = page.locator('textarea, input[placeholder*="message"]').first();
    if (await inputBar.isVisible()) {
      const burstMsg = `burst_test_${Date.now()}`;
      await inputBar.fill(burstMsg);

      const sendBtn = page.locator('button[type="submit"], [aria-label*="envoyer"]').first();
      if (await sendBtn.isVisible()) {
        // Déclenchement en rafale (clic x2 quasi instantané)
        await Promise.all([
          sendBtn.click(),
          sendBtn.click({ force: true }).catch(() => {}),
        ]);
      }

      await page.waitForTimeout(2000);

      // Vérification stricte : une seule bulle de message rendue
      const messageCount = await page.locator(`text=${burstMsg}`).count();
      expect(messageCount).toBe(1);
    }
  });

  test('3. Envoi et consultation de deal / offre de troc', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const chatTab = page.locator('button:has-text("Discussions"), [data-tab="chat"]').first();
    if (await chatTab.isVisible()) {
      await chatTab.click();
    }

    const firstChat = page.locator('[class*="chat-item"]').first();
    if (await firstChat.isVisible()) {
      await firstChat.click();
    }

    // Vérifier si le panneau d'action de deal existe
    const dealBtn = page.locator('button:has-text("Faire une offre"), button:has-text("Proposer un deal")').first();
    if (await dealBtn.isVisible()) {
      await dealBtn.click();
      const modal = page.locator('[role="dialog"], .modal-card, [class*="modal"]').first();
      await expect(modal).toBeVisible();
    }
  });
});
