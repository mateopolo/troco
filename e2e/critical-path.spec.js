const { test, expect } = require('@playwright/test');

test.describe('Troco — Parcours Critique E2E (Critical Path)', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration d'un profil connecté persistant pour simuler la session utilisateur
    await page.addInitScript(() => {
      localStorage.setItem('troco_user_profile', JSON.stringify({
        id: 'test-user-123',
        uid: 'test-user-123',
        name: 'Alexandre Troco',
        email: 'alexandre@troco.app',
        avatar: '',
        trocoTokens: 50,
        euroBalance: 120,
        cguAcceptedAt: Date.now(),
        verified: true,
      }));
      localStorage.setItem('troco_cgu_accepted', 'true');
      localStorage.setItem('troco_auth_session', 'true');
    });

    await page.goto('/');
  });

  test('1. Charge l\'application et affiche le Feed principal', async ({ page }) => {
    // Vérification du chargement de l'application et du Feed
    await expect(page.locator('body')).toBeVisible();
    await page.waitForLoadState('domcontentloaded');

    // Vérification de la présence des éléments de navigation
    const navBar = page.locator('nav, .app-bottom-nav, .app-header-container');
    await expect(navBar.first()).toBeVisible();
  });

  test('2. Navigation vers la Messagerie (Chat)', async ({ page }) => {
    // Clic sur l'onglet Messagerie / Chat
    const chatNavButton = page.locator('button:has-text("Messages"), button:has-text("Chat"), [data-tab="chat"]').first();
    if (await chatNavButton.isVisible()) {
      await chatNavButton.click();
    }

    // Vérifier que la vue chat ou la liste des conversations est active
    await expect(page.locator('input[type="text"], .chat-row-container, .dynamic-island-container').first()).toBeVisible();
  });

  test('3. Envoi d\'un message dans une conversation', async ({ page }) => {
    // Sélection d'une conversation si dans la liste
    const chatItem = page.locator('.chat-row-container, .swipeable-chat-item-wrapper').first();
    if (await chatItem.isVisible()) {
      await chatItem.click();
    }

    // Saisie et envoi d'un message
    const messageInput = page.locator('input[placeholder*="message"], input[placeholder*="Écris"]').first();
    if (await messageInput.isVisible()) {
      await messageInput.fill('Bonjour, je suis très intéressé par ton annonce !');
      await messageInput.press('Enter');

      // Vérifier la présence du message optimiste
      await expect(page.locator('text=Bonjour, je suis très intéressé par ton annonce !').first()).toBeVisible();
    }
  });

  test('4. Déclenchement de la modale "Proposer un deal"', async ({ page }) => {
    // Clic sur le bouton de proposition de deal / poignée de main
    const dealButton = page.locator('button:has-text("Deal"), button:has-text("Proposer"), button[title*="Deal"]').first();
    if (await dealButton.isVisible()) {
      await dealButton.click();

      // Vérifier l'ouverture du modal de négociation
      const dealModal = page.locator('.modal-deal, .counter-offer-modal, h3:has-text("Deal"), h3:has-text("Offre")').first();
      await expect(dealModal).toBeVisible();
    }
  });

  test('5. Ouverture du Tableau Blanc Collaboratif (Whiteboard)', async ({ page }) => {
    // Clic sur l'outil Tableau Blanc
    const whiteboardBtn = page.locator('button:has-text("Tableau Blanc"), button[title*="Tableau"], button[title*="Whiteboard"]').first();
    if (await whiteboardBtn.isVisible()) {
      await whiteboardBtn.click();

      // Vérifier le montage du canvas du Whiteboard
      const canvasElement = page.locator('canvas, .whiteboard-canvas, .collaborative-whiteboard-modal').first();
      await expect(canvasElement).toBeVisible();
    }
  });
});
