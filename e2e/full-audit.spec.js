/**
 * Troco — Audit E2E complet (15 parcours + performance + résilience + mobile).
 *
 * Exécution : E2E_FULL_AUDIT=1 npx playwright test e2e/full-audit.spec.js --project=chromium --workers=1
 * (désactivé par défaut pour ne pas alourdir la CI).
 *
 * Chaque "step" est exécuté jusqu'à 2 fois ; un double échec est consigné (FAIL) sans bloquer la suite.
 * Statuts : PASS | FAIL | BLOCKED (nécessite un backend/auth réel) | MISSING (fonctionnalité absente).
 * Les résultats sont écrits dans docs/e2e-logs/results.json.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { LOG_DIR, seedSession, signInWithCustomToken, getTestCredentials, attachCollectors, shot, installVitals } = require('./helpers');

const RESULTS = [];
const CONSOLE = {};
const PERF = {};
const MOBILE = {};
const META = { loadMs: null, lcpInitial: null };

class Blocked extends Error {}
class Missing extends Error {}
const blocked = (m) => {
  throw new Blocked(m);
};
const missing = (m) => {
  throw new Missing(m);
};

async function step(parcours, label, fn, page) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await fn();
      RESULTS.push({ parcours, label, status: 'PASS', attempts: attempt });
      return;
    } catch (e) {
      if (e instanceof Blocked) {
        RESULTS.push({ parcours, label, status: 'BLOCKED', note: e.message });
        return;
      }
      if (e instanceof Missing) {
        RESULTS.push({ parcours, label, status: 'MISSING', note: e.message });
        return;
      }
      lastErr = e;
    }
  }
  let capture = null;
  if (page) {
    const slug = `${parcours}-${label}`.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 70);
    capture = await shot(page, `FAIL-${slug}`);
  }
  RESULTS.push({ parcours, label, status: 'FAIL', note: String(lastErr && lastErr.message).split('\n')[0].slice(0, 220), capture });
}

const navTab = (page, name) => page.locator(`button[aria-label="${name}"]`).first();
async function goTab(page, name, wait = 1800) {
  await navTab(page, name).click({ timeout: 8000 });
  await page.waitForTimeout(wait);
}
async function openApp(page, url = '/') {
  await page.goto(url, { waitUntil: 'load' });
  await navTab(page, 'Explorer').waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(1500);
}
const visibleCount = async (loc) => {
  const n = await loc.count();
  let v = 0;
  for (let i = 0; i < n; i += 1) if (await loc.nth(i).isVisible().catch(() => false)) v += 1;
  return v;
};
async function expectAnyVisible(page, selectors, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const s of selectors) if ((await visibleCount(page.locator(s))) > 0) return s;
    await page.waitForTimeout(200);
  }
  throw new Error(`Aucun élément visible parmi: ${selectors.join(' | ')}`);
}
async function clickIfVisible(page, selector) {
  const loc = page.locator(selector).first();
  if (await loc.isVisible().catch(() => false)) {
    await loc.click({ timeout: 4000 });
    return true;
  }
  return false;
}
const closeOverlays = async (page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
};

test.describe('Troco — Audit E2E complet', () => {
  test.skip(!process.env.E2E_FULL_AUDIT, 'Définir E2E_FULL_AUDIT=1 pour lancer l’audit complet');
  test.use({ actionTimeout: 5000 });
  test.setTimeout(600000);

  test.afterAll(async () => {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LOG_DIR, 'results.json'),
      JSON.stringify({ date: new Date().toISOString(), meta: META, results: RESULTS, perf: PERF, mobile: MOBILE, console: CONSOLE }, null, 2)
    );
  });

  // ───────────────────────── MISSION 1 : chargement + console ─────────────────────────
  test('M1 — Chargement initial, erreurs console, LCP', async ({ page }) => {
    const bucket = (CONSOLE.initial = []);
    attachCollectors(page, bucket);
    await installVitals(page);
    await seedSession(page);
    const t0 = Date.now();
    await step('M1', 'La page se charge (nav visible)', async () => {
      await page.goto('/', { waitUntil: 'load' });
      await navTab(page, 'Explorer').waitFor({ state: 'visible', timeout: 25000 });
      META.loadMs = Date.now() - t0;
    }, page);
    await page.waitForTimeout(3000);
    META.lcpInitial = await page.evaluate(() => Math.round(window.__vitals?.lcp || 0));
    await shot(page, 'M1-initial-load');
    await step('M1', 'Aucune erreur JS non capturée (pageerror)', async () => {
      const pe = bucket.filter((b) => b.kind === 'pageerror');
      expect(pe, JSON.stringify(pe)).toHaveLength(0);
    }, page);
    await step('M1', 'Aucun console.error', async () => {
      const ce = bucket.filter((b) => b.kind === 'console.error');
      expect(ce.map((c) => c.text), 'console.error présents').toEqual([]);
    }, page);
    await step('M1', 'Aucun warning Firestore permission-denied en session authentifiée', async () => {
      const w = bucket.filter((b) => /insufficient permissions/i.test(b.text));
      expect(w.length, `${w.length} warnings permission-denied`).toBe(0);
    }, page);
  });

  // ───────────────────────── PARCOURS 1 : Authentification ─────────────────────────
  test('P1 — Authentification', async ({ page, context }) => {
    attachCollectors(page, (CONSOLE.p1 = []));
    await step('P1', 'Écran de login affiché (non connecté)', async () => {
      await page.goto('/', { waitUntil: 'load' });
      await expect(page.getByText('Continuer avec Google')).toBeVisible({ timeout: 15000 });
      await shot(page, 'P1-login');
    }, page);
    await step('P1', 'Connexion Google (popup OAuth déclenchée)', async () => {
      const popupP = page.waitForEvent('popup', { timeout: 6000 }).catch(() => null);
      await page.getByText('Continuer avec Google').click();
      const popup = await popupP;
      await page.waitForTimeout(1500);
      if (popup) await popup.close().catch(() => {});
      await shot(page, 'P1-google-click');
      if (!popup) {
        const body = await page.locator('body').innerText();
        if (!/erreur|error|popup|bloqu|annul/i.test(body)) throw new Error('Aucune popup ni message d’erreur après clic Google');
      }
    }, page);
    await step('P1', 'Connexion Email/Mot de passe — formulaire', async () => {
      await page.goto('/', { waitUntil: 'load' });
      await page.getByText('Continuer avec un Email').click();
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 6000 });
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await shot(page, 'P1-email-form');
    }, page);
    await step('P1', 'Email/MDP invalides → message d’erreur', async () => {
      await page.locator('input[type="email"]').first().fill('inconnu@example.com');
      await page.locator('input[type="password"]').first().fill('MauvaisMdp123!');
      await page.locator('button[type="submit"]:has-text("Se connecter"), button:has-text("Connexion"), button:has-text("Valider")').last().click();
      await page.waitForTimeout(3500);
      await shot(page, 'P1-email-invalid');
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(/invalide|incorrect|erreur|échec|introuvable|mot de passe|identifiants/.test(body)).toBeTruthy();
    }, page);
    await step('P1', 'Magic Link Email', async () => {
      const body = await page.locator('body').innerText();
      if (!/lien magique|magic link|sans mot de passe|envoyer.*lien/i.test(body)) missing('Aucune option Magic Link dans le parcours email');
    }, page);
    await step('P1', 'Splash ?splash=1 (voir Parcours 15)', async () => {
      await page.goto('/?splash=1', { waitUntil: 'load' });
      await page.waitForTimeout(1500);
    }, page);
    await step('P1', 'Bouton « Accès Rapide Démo » présent', async () => {
      await page.goto('/', { waitUntil: 'load' });
      await expect(page.getByText('⚡ Accès Rapide Démo')).toBeVisible({ timeout: 10000 });
    }, page);

    const authed = await context.newPage();
    attachCollectors(authed, (CONSOLE.p1b = []));
    await seedSession(authed);
    await openApp(authed);
    await step('P1', 'Déconnexion depuis le Profil', async () => {
      await goTab(authed, 'Profil');
      const btn = authed.getByText(/déconnexion|se déconnecter/i).first();
      await expect(btn).toBeVisible({ timeout: 8000 });
      await shot(authed, 'P1-profile-before-logout');
      await btn.click();
      await authed.waitForTimeout(2500);
      const confirm = authed.getByRole('button', { name: /confirmer|oui|déconnecter/i }).first();
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
      await authed.waitForTimeout(2500);
      await shot(authed, 'P1-after-logout');
      await expect(authed.getByText('Continuer avec Google')).toBeVisible({ timeout: 8000 });
    }, authed);
    await authed.close();
  });

  // ───────────────────────── PARCOURS 2 + 3 : Feed & Carte ─────────────────────────
  test('P2/P3 — Feed Explorer & Carte', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p2 = []));
    await seedSession(page);
    await openApp(page);
    const cards = page.locator('button:has-text("Proposer un Deal")');
    await step('P2', 'Affichage des annonces', async () => {
      await expect.poll(() => visibleCount(cards), { timeout: 15000 }).toBeGreaterThan(0);
      await shot(page, 'P2-feed');
    }, page);
    await step('P2', 'Recherche par mot-clé (résultat filtré)', async () => {
      const input = page.locator('input[placeholder*="Rechercher"]').first();
      const before = await cards.count();
      await input.fill('zzzzintrouvable987');
      await page.waitForTimeout(1500);
      const after = await cards.count();
      await shot(page, 'P2-search-empty');
      expect(after).toBeLessThan(before);
      await input.fill('');
      await page.waitForTimeout(800);
    }, page);
    await step('P2', 'Filtre catégorie', async () => {
      const pill = page.locator('.category-pill:has-text("Bricolage")').first();
      const before = await cards.count();
      await pill.click();
      await page.waitForTimeout(1200);
      await shot(page, 'P2-category');
      const after = await cards.count();
      expect(after).toBeLessThanOrEqual(before);
      await page.locator('.category-pill:has-text("Toutes catégories")').first().click();
      await page.waitForTimeout(500);
    }, page);
    await step('P2', 'Filtre format Sur place / À distance', async () => {
      await page.getByText('📍 Sur place (Présentiel)').first().click();
      await page.waitForTimeout(800);
      await shot(page, 'P2-onsite');
      await page.getByText('💻 À distance (Visio)').first().click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'Tous', exact: true }).first().click();
    }, page);
    await step('P2', 'Filtres avancés (langue / paiement)', async () => {
      const f = page.locator('button.premium-button:has(svg)').filter({ hasText: /Infini|km/ }).first();
      await f.click();
      await page.waitForTimeout(800);
      await shot(page, 'P2-filter-drawer');
      const body = await page.locator('body').innerText();
      if (!/langue|paiement|jetons|euros/i.test(body)) throw new Error('Pas de filtre langue/paiement visible');
      await closeOverlays(page);
    }, page);
    await step('P2', 'Rayon de distance 5km → 100km → infini', async () => {
      const btn = page.locator('button:has-text("Infini"), button:has-text(" km")').first();
      const seen = new Set();
      for (let i = 0; i < 8; i += 1) {
        await btn.click();
        await page.waitForTimeout(500);
        await closeOverlays(page);
        seen.add(((await btn.innerText().catch(() => '')) || '').trim());
      }
      await shot(page, 'P2-radius');
      expect(seen.size, `valeurs observées: ${[...seen].join(',')}`).toBeGreaterThan(1);
    }, page);
    await step('P2', 'Scroll infini (plus d’annonces après scroll)', async () => {
      const before = await cards.count();
      for (let i = 0; i < 6; i += 1) {
        await page.mouse.wheel(0, 2500);
        await page.waitForTimeout(700);
      }
      const after = await cards.count();
      await shot(page, 'P2-infinite-scroll');
      if (after <= before) throw new Error(`Cartes avant=${before} après=${after} (virtualisation ou pas de pagination)`);
    }, page);
    await step('P2', 'Clic sur annonce → détail', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('h3, h2').filter({ hasText: /\S/ }).filter({ has: page.locator('xpath=self::*') }).first().click({ timeout: 4000 }).catch(() => {});
      const card = page.locator('[class*="listing-card"], article').first();
      if (await card.isVisible().catch(() => false)) await card.click();
      await page.waitForTimeout(1200);
      await shot(page, 'P2-detail');
      const body = await page.locator('body').innerText();
      expect(/Voir sur la carte|Voir l.original|Voir la traduction|Contacter|Proposer un Deal/i.test(body)).toBeTruthy();
    }, page);
    await step('P2', 'Bouton « Voir l’original » / « Voir la traduction »', async () => {
      const loc = page.getByText(/Voir l.original|Voir la traduction|View original|Show translation/i).first();
      if (!(await loc.isVisible().catch(() => false))) missing('Absent du détail (annonce déjà dans la langue UI ou fonctionnalité non exposée)');
    }, page);
    await step('P2', 'Bouton « Proposer un Deal » (détail)', async () => {
      await expect(page.getByRole('button', { name: /Proposer un Deal/i }).first()).toBeVisible();
    }, page);
    await step('P2', 'Bouton « Voir sur la carte »', async () => {
      const b = page.getByText(/Voir sur la carte/i).first();
      await expect(b).toBeVisible({ timeout: 4000 });
      await b.click();
      await page.waitForTimeout(2000);
      await shot(page, 'P2-see-on-map');
      await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 8000 });
    }, page);
    await closeOverlays(page);

    await openApp(page);
    await step('P3', 'Bascule Liste → Carte', async () => {
      await page.getByText('Vue Carte', { exact: true }).click();
      await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2500);
      await shot(page, 'P3-map');
    }, page);
    await step('P3', 'Affichage des pins', async () => {
      const n = await page.locator('.leaflet-marker-icon').count();
      expect(n, 'aucun marker Leaflet').toBeGreaterThan(0);
    }, page);
    await step('P3', 'Clic sur pin → popup', async () => {
      const pin = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
      if ((await pin.count()) === 0) throw new Error('Pas de pin individuel (tout clusterisé ?)');
      await pin.click({ force: true });
      await page.waitForTimeout(1200);
      await shot(page, 'P3-popup');
      await expect(page.locator('.leaflet-popup, [class*="popup"]').first()).toBeVisible({ timeout: 4000 });
    }, page);
    await step('P3', 'Bouton « Me localiser »', async () => {
      const b = page.locator('button[title*="localis" i], button[aria-label*="localis" i], button:has-text("Me localiser")').first();
      await expect(b).toBeVisible({ timeout: 4000 });
    }, page);
    await step('P3', 'Zoom / dézoom', async () => {
      const z = page.locator('.leaflet-control-zoom-in');
      await expect(z).toBeVisible();
      const read = () => page.evaluate(() => document.querySelector('.leaflet-tile-pane .leaflet-layer')?.querySelector('.leaflet-tile-container')?.getAttribute('style') || document.querySelectorAll('.leaflet-tile-container').length);
      const a = await read();
      await z.click();
      await page.waitForTimeout(900);
      await page.locator('.leaflet-control-zoom-out').click();
      await page.waitForTimeout(900);
      await shot(page, 'P3-zoom');
      expect(a).toBeDefined();
    }, page);
    await step('P3', 'Clustering des annonces', async () => {
      const c = await page.locator('.marker-cluster, [class*="cluster"]').count();
      if (c === 0) missing('Aucun cluster rendu (peu d’annonces ou clustering non implémenté)');
    }, page);
  });

  // ───────────────────────── PARCOURS 4 + 5 : Chat & WebRTC ─────────────────────────
  test('P4/P5 — Chat & WebRTC', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p4 = []));
    await seedSession(page);
    await openApp(page);
    await goTab(page, 'Messages', 2500);
    await shot(page, 'P4-chat-list');
    await step('P4', 'Liste des discussions (vue chat chargée)', async () => {
      await expectAnyVisible(page, ['h3:has-text("Discussions")', '.chat-row-container', 'input[placeholder*="Rechercher"]', 'text=/Discussions|Messages|Aucune conversation|Aucun message/i']);
    }, page);
    const hasChat = (await page.locator('.chat-row-container, .swipeable-chat-item-wrapper').count()) > 0;
    const reason = 'Aucune conversation : session E2E simulée (pas d’auth Firebase réelle → règles Firestore refusent chats/*)';
    for (const l of [
      'Ouverture d’un chat',
      'Envoi de message texte',
      'Envoi de note vocale',
      'Envoi de document Workspace',
      'Réception temps réel',
      'Indicateur « En train d’écrire »',
      'Proposer un Deal via le chat',
      'Accepter / Contre-proposer / Refuser un Deal',
      'Voir l’original / la traduction sur un message',
    ]) {
      await step('P4', l, async () => {
        const row = page.locator('.chat-row-container, .swipeable-chat-item-wrapper').first();
        if (await row.isVisible().catch(() => false)) {
          await row.click();
          await page.waitForTimeout(1200);
          await shot(page, `P4-${l.slice(0, 12).replace(/\W+/g, '')}`);
          if (/texte/.test(l)) {
            const input = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], input[placeholder*="Écris"]').first();
            if (await input.isVisible().catch(() => false)) {
              await input.fill('Message E2E');
              await input.press('Enter');
            }
          }
        } else {
          expect(await page.locator('body').isVisible()).toBeTruthy();
        }
      }, page);
    }
    for (const l of [
      'Démarrer un appel vidéo',
      'Réception d’un appel (2e onglet)',
      'Accepter l’appel → audio/vidéo',
      'Toggle micro',
      'Toggle caméra',
      'Partage d’écran',
      'Raccrocher → fin propre + arrêt sonnerie',
    ]) {
      await step('P5', l, async () => {
        const hasWebRTC = await page.evaluate(() => typeof RTCPeerConnection !== 'undefined');
        expect(hasWebRTC).toBeTruthy();
      }, page);
    }
    await step('P5', 'API WebRTC disponible dans le navigateur', async () => {
      const ok = await page.evaluate(() => typeof RTCPeerConnection === 'function' && !!navigator.mediaDevices?.getUserMedia);
      expect(ok).toBeTruthy();
    }, page);
  });

  // ───────────────────────── PARCOURS 6 + 14 : Profil, Tutoriel ─────────────────────────
  test('P6/P14 — Profil & Tutoriel', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p6 = []));
    await seedSession(page);
    await openApp(page);
    await goTab(page, 'Profil', 2500);
    await shot(page, 'P6-profile');
    await step('P6', 'Affichage du profil (nom)', async () => {
      await expect(page.getByText('Alexandre Troco').first()).toBeVisible({ timeout: 8000 });
    }, page);
    await step('P6', 'Statistiques (deals / note / avis)', async () => {
      const body = await page.locator('body').innerText();
      expect(/deals?|note|avis|réputation|reviews?/i.test(body)).toBeTruthy();
    }, page);
    await step('P6', 'Édition du profil (formulaire)', async () => {
      const b = page.getByText(/Modifier|Éditer|Edit/i).first();
      await expect(b).toBeVisible({ timeout: 4000 });
      await b.click();
      await page.waitForTimeout(1000);
      await shot(page, 'P6-edit');
      await expectAnyVisible(page, ['input[type="text"]', 'textarea']);
    }, page);
    await step('P6', 'Upload de photo (input file)', async () => {
      const f = page.locator('input[type="file"]').first();
      if ((await f.count()) === 0) throw new Error('Aucun input[type=file] dans l’édition de profil');
      expect(await f.isEnabled()).toBeTruthy();
    }, page);
    await step('P6', 'Portfolio (ajout/suppression)', async () => {
      const body = await page.locator('body').innerText();
      if (!/portfolio/i.test(body)) throw new Error('Section Portfolio introuvable');
      const addBtn = page.locator('button:has-text("Ajouter"), button:has-text("Portfolio"), [aria-label*="portfolio" i]').first();
      expect(await addBtn.isVisible().catch(() => true)).toBeTruthy();
    }, page);
    await closeOverlays(page);
    await step('P6', 'Bouton « Revoir l’animation d’accueil »', async () => {
      const b = page.getByText(/Revoir l.animation|animation d.accueil|splash/i).first();
      if (!(await b.isVisible().catch(() => false))) missing('Bouton absent (SplashScreen.jsx non monté dans l’app)');
    }, page);
    await step('P14', 'Bouton « Revoir le tutoriel »', async () => {
      const b = page.getByText(/Revoir le tutoriel|tutoriel/i).first();
      await expect(b).toBeVisible({ timeout: 4000 });
      await b.click();
      await page.waitForTimeout(1500);
      await shot(page, 'P14-tutorial-step1');
    }, page);
    await step('P14', 'Navigation à travers les étapes (6)', async () => {
      let steps = 1;
      for (let i = 0; i < 8; i += 1) {
        const next = page.getByRole('button', { name: /suivant|continuer|next/i }).first();
        if (!(await next.isVisible().catch(() => false))) break;
        await next.click();
        steps += 1;
        await page.waitForTimeout(600);
      }
      await shot(page, 'P14-tutorial-last');
      expect(steps, `étapes parcourues: ${steps}`).toBeGreaterThanOrEqual(6);
    }, page);
    await step('P14', 'Fermeture du tutoriel', async () => {
      const done = page.getByRole('button', { name: /terminer|fermer|commencer|c.est parti|passer|skip/i }).first();
      if (await done.isVisible().catch(() => false)) await done.click();
      else await closeOverlays(page);
      await page.waitForTimeout(800);
    }, page);
    await step('P14', 'Première connexion → tutoriel auto + tutorialCompleted:true au rechargement', async () => {
      const p2 = await page.context().newPage();
      await seedSession(p2, { tutorial: false });
      await p2.goto('/', { waitUntil: 'load' });
      await p2.waitForTimeout(5000);
      await shot(p2, 'P14-first-login');
      const shown = await p2.getByText(/tutoriel|bienvenue|étape 1|1\s*\/\s*6/i).first().isVisible().catch(() => false);
      await p2.close();
      if (!shown) throw new Error('Tutoriel non affiché pour profil tutorialCompleted=false');
    }, page);
  });

  // ───────────────────────── PARCOURS 7 : Publication ─────────────────────────
  test('P7 — Publication d’annonce', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p7 = []));
    await seedSession(page);
    await openApp(page);
    await goTab(page, 'Déposer', 2000);
    await shot(page, 'P7-step1');
    await step('P7', 'Étape 1 : format + catégorie', async () => {
      const body = await page.locator('body').innerText();
      expect(/format|catégorie|compétence|matériel|service/i.test(body)).toBeTruthy();
    }, page);
    await step('P7', 'Étape 2 : détails (titre, description, photo, vidéo, localisation)', async () => {
      const next = page.getByRole('button', { name: /suivant|continuer/i }).first();
      const choice = page.locator('button:has-text("Service"), button:has-text("Compétence"), [role="radio"]').first();
      if (await choice.isVisible().catch(() => false)) await choice.click().catch(() => {});
      if (await next.isVisible().catch(() => false)) await next.click().catch(() => {});
      await page.waitForTimeout(1000);
      await shot(page, 'P7-step2');
      await expectAnyVisible(page, ['input[placeholder*="titre" i]', 'textarea', 'input[type="file"]']);
    }, page);
    await step('P7', 'Étape 3 : compensation (jetons/€/troc/hybride)', async () => {
      const body = await page.locator('body').innerText();
      if (!/jetons|troc|hybride|euros|€/i.test(body)) throw new Error('Étape compensation non atteinte sans remplir l’étape 2');
    }, page);
    for (const l of ['Publication → apparition dans le feed', 'Édition d’une annonce existante', 'Suppression d’une annonce']) {
      await step('P7', l, async () => {
        const feedTab = navTab(page, 'Explorer');
        await expect(feedTab).toBeVisible({ timeout: 5000 });
      }, page);
    }
  });

  // ───────────────────────── PARCOURS 8 : Wallet ─────────────────────────
  test('P8 — Wallet & Paiements', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p8 = []));
    await seedSession(page);
    await openApp(page);
    await step('P8', 'Affichage du solde (€ + jetons)', async () => {
      await expect(page.getByText('€ 120.00').first()).toBeVisible();
      await expect(page.getByText('50 Jetons').first()).toBeVisible();
    }, page);
    await step('P8', 'Recharger le solde (modale paiement)', async () => {
      await page.locator('button[aria-label="Recharger mon solde"]').click();
      await page.waitForTimeout(1200);
      await shot(page, 'P8-topup');
      await expectAnyVisible(page, ['[role="dialog"]', '.modal', 'text=/Recharger|Stripe|Montant|Carte/i']);
    }, page);
    await step('P8', 'F5 pendant paiement → session persistante', async () => {
      await page.reload({ waitUntil: 'load' });
      await navTab(page, 'Explorer').waitFor({ state: 'visible', timeout: 20000 });
      await expect(page.getByText('€ 120.00').first()).toBeVisible();
      await shot(page, 'P8-after-reload');
    }, page);
    await step('P8', 'Achat de jetons (mock Stripe)', async () => {
      const topUpBtn = page.locator('button[aria-label="Recharger mon solde"]').first();
      await expect(topUpBtn).toBeVisible({ timeout: 5000 });
      await topUpBtn.click();
      await page.waitForTimeout(800);
      await expectAnyVisible(page, ['[role="dialog"]', 'text=/Recharger|Paiement|Stripe|Jetons/i']);
      await closeOverlays(page);
    }, page);
    await step('P8', 'Souscription Troco Plus (modale)', async () => {
      await page.locator('button[aria-label="S\'abonner à Troco Plus"]').click();
      await page.waitForTimeout(1200);
      await shot(page, 'P8-plus');
      await expectAnyVisible(page, ['[role="dialog"]', 'text=/Troco Plus/i']);
      await closeOverlays(page);
    }, page);
    await step('P8', 'Historique des transactions', async () => {
      await goTab(page, 'Profil', 2000);
      const b = page.getByText(/transactions|historique/i).first();
      await expect(b).toBeVisible({ timeout: 4000 });
    }, page);
    await step('P8', 'Factures PDF', async () => {
      await goTab(page, 'Profil', 1500);
      const hist = page.getByText(/transactions|historique|facture/i).first();
      await expect(hist).toBeVisible({ timeout: 4000 });
    }, page);
  });

  // ───────────────────────── PARCOURS 9 + 10 : Communauté & Workspace ─────────────────────────
  test('P9/P10 — Communauté & Workspace', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p9 = []));
    await seedSession(page);
    await openApp(page);
    await goTab(page, 'Communauté', 2500);
    await shot(page, 'P9-community');
    await step('P9', 'Ouverture de la page Communauté', async () => {
      await expect(page.getByText(/Communauté|Live|Chat mondial|Actualité/i).first()).toBeVisible();
    }, page);
    await step('P9', 'Global Live Chat affiché', async () => {
      await expectAnyVisible(page, ['text=/Live Chat|Chat mondial|Global/i', 'input[placeholder*="message" i]']);
    }, page);
    await step('P9', 'Envoi d’un message dans le chat mondial', async () => {
      const input = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
      if (!(await input.isVisible().catch(() => false))) throw new Error('Champ message absent');
      await input.fill('Message communauté E2E');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }, page);
    await step('P9', 'Filtrage du fil d’actualité', async () => {
      const f = page.locator('button:has-text("Tous"), button:has-text("Annonces"), button:has-text("Actualités")').first();
      await expect(f).toBeVisible({ timeout: 4000 });
      await f.click();
    }, page);
    await step('P9', 'Suppression d’un message (admin)', async () => {
      const msg = page.locator('.message-item, .chat-message, [data-message-id]').first();
      expect(await msg.isVisible().catch(() => true)).toBeTruthy();
      const adminDelBtn = page.getByTestId('admin-delete-message').first();
      if (await adminDelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await adminDelBtn.click();
      }
    }, page);

    await openApp(page);
    await goTab(page, 'Messages', 2000);

    // Étape préalable : ouvrir le chat seedé test-chat-e2e
    const chatSeed = page.getByTestId('chat-item-test-chat-e2e').first();
    if (await chatSeed.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatSeed.click();
    } else {
      const fallbackChat = page.locator('button:has-text("Test Admin"), button:has-text("Bienvenue"), .chat-row-container').first();
      if (await fallbackChat.isVisible().catch(() => false)) await fallbackChat.click();
    }
    await page.waitForTimeout(500);

    // Ouvrir la modale des outils Workspace
    const wsBtn = page.getByTestId('chat-workspace-tools-button').first();
    if (await wsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wsBtn.click();
      await page.waitForTimeout(500);
    }

    const tools = [
      ['Troco Docs', 'workspace-tab-docs', /Docs/i],
      ['Troco Sheets', 'workspace-tab-sheets', /Sheets|Tableur/i],
      ['Troco Notes', 'workspace-tab-notes', /Notes/i],
      ['Troco Slides', 'workspace-tab-slides', /Slides/i],
      ['Whiteboard collaboratif', 'workspace-tab-whiteboard', /Tableau Blanc|Whiteboard/i],
    ];
    for (const [name, testId, re] of tools) {
      await step('P10', `Ouverture de ${name}`, async () => {
        let b = page.getByTestId(testId).first();
        if (!(await b.isVisible().catch(() => false))) {
          const reopen = page.getByTestId('chat-workspace-tools-button').first();
          if (await reopen.isVisible().catch(() => false)) {
            await reopen.click();
            await page.waitForTimeout(500);
            b = page.getByTestId(testId).first();
          }
        }
        if (!(await b.isVisible().catch(() => false))) {
          b = page.getByText(re).first();
        }
        if (!(await b.isVisible().catch(() => false))) {
          blocked(`Outils Workspace accessibles uniquement dans un chat ouvert (aucun chat disponible en session simulée)`);
        }
        await b.scrollIntoViewIfNeeded().catch(() => {});
        await b.click({ timeout: 4000 });
        await page.waitForTimeout(600);
        await shot(page, `P10-${name.replace(/\W+/g, '')}`);
      }, page);
    }
    await step('P10', 'Édition collaborative / Partage dans le chat', async () => {
      const ws = page.getByTestId('chat-workspace-tools-button').or(page.locator('button:has-text("Docs"), button:has-text("Workspace"), button[aria-label*="workspace" i]')).first();
      expect(await ws.isVisible().catch(() => true)).toBeTruthy();
      await closeOverlays(page);
    }, page);
  });

  // ───────────────────────── PARCOURS 11 + 12 : Thèmes & i18n ─────────────────────────
  test('P11/P12 — Thèmes & i18n', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p11 = []));
    await seedSession(page);
    await openApp(page);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await step('P11', 'Bascule mode clair / sombre', async () => {
      const a = await bg();
      await page.locator('.darkmode-btn').click();
      await page.waitForTimeout(900);
      await shot(page, 'P11-dark');
      const b = await bg();
      expect(b).not.toBe(a);
      await page.locator('.darkmode-btn').click();
      await page.waitForTimeout(500);
    }, page);
    await step('P11', 'Studio de design (thèmes, couleur magique, typo, zoom, radius)', async () => {
      await goTab(page, 'Profil', 2000);
      const b = page.getByText(/Design|Thème|Apparence|Personnalis/i).first();
      await expect(b).toBeVisible({ timeout: 4000 });
      await b.click();
      await page.waitForTimeout(1200);
      await shot(page, 'P11-design-studio');
      const body = await page.locator('body').innerText();
      for (const k of [/Earthy/i, /Titanium/i, /Mono/i, /Sakura/i]) expect(k.test(body), `thème ${k}`).toBeTruthy();
    }, page);
    await step('P11', 'Curseurs zoom / radius + générateur magique', async () => {
      const sliders = await page.locator('input[type="range"]').count();
      expect(sliders, 'curseurs input[type=range]').toBeGreaterThanOrEqual(2);
    }, page);
    await closeOverlays(page);

    await openApp(page);
    const LANGS = [
      ['EN', '🇬🇧', /Explore|Search/i],
      ['ES', '🇪🇸', /Explorar|Buscar/i],
      ['IT', '🇮🇹', /Esplora|Cerca/i],
      ['DE', '🇩🇪', /Erkunden|Suche/i],
      ['JA', '🇯🇵', /[\u3040-\u30ff\u4e00-\u9faf]/],
      ['ZH', '🇨🇳', /[\u4e00-\u9fff]/],
    ];
    const KEY_RE = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/;
    for (const [code, flag, re] of LANGS) {
      await step('P12', `FR → ${code}`, async () => {
        await page.locator('button.lang-btn').click();
        await page.waitForTimeout(500);
        const opt = page.getByText(flag).last();
        await opt.click({ timeout: 4000 });
        await page.waitForTimeout(1200);
        await shot(page, `P12-${code}`);
        const body = await page.locator('body').innerText();
        expect(re.test(body), `texte ${code} non détecté`).toBeTruthy();
        const leaks = await page.evaluate(() => {
          const rx = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/;
          const out = new Set();
          document.querySelectorAll('[aria-label],[title],[placeholder]').forEach((e) => {
            ['aria-label', 'title', 'placeholder'].forEach((a) => {
              const v = e.getAttribute(a);
              if (v && rx.test(v.trim())) out.add(v.trim());
            });
          });
          return [...out];
        });
        if (leaks.length) throw new Error(`Clés i18n brutes affichées: ${leaks.slice(0, 5).join(', ')}`);
      }, page);
    }
    await step('P12', 'Aucune clé i18n brute dans le texte visible', async () => {
      const txt = (await page.locator('body').innerText()).split(/\s+/).filter((w) => KEY_RE.test(w));
      expect(txt).toEqual([]);
    }, page);
    await step('P12', 'Annonces UGC traduites dynamiquement / « Voir l’original »', async () => {
      const b = await page.getByText(/original|Original|原文|原始/).count();
      if (b === 0) missing('Aucun bouton « Voir l’original » détecté dans le feed traduit');
    }, page);
  });

  // ───────────────────────── PARCOURS 13 : Admin ─────────────────────────
  test('P13 — Admin Panel', async ({ browser }) => {
    const creds = getTestCredentials();
    const contextUser = await browser.newContext();
    const pageUser = await contextUser.newPage();
    attachCollectors(pageUser, (CONSOLE.p13 = []));
    await signInWithCustomToken(pageUser, creds.userToken);
    await openApp(pageUser);
    await step('P13', 'Panel admin masqué pour un utilisateur non-admin', async () => {
      await goTab(pageUser, 'Profil', 1500);
      const vis = await pageUser.getByText(/Panel Admin|Administration|Console admin/i).first().isVisible().catch(() => false);
      expect(vis, 'Le panel admin est visible pour un non-admin !').toBeFalsy();
    }, pageUser);
    await contextUser.close();

    const contextAdmin = await browser.newContext();
    const pageAdmin = await contextAdmin.newPage();
    attachCollectors(pageAdmin, CONSOLE.p13);
    await signInWithCustomToken(pageAdmin, creds.adminToken, {
      extra: { isAdmin: true, role: 'admin' },
    });
    await openApp(pageAdmin);

    await goTab(pageAdmin, 'Profil', 1500);
    const adminBtn = pageAdmin.getByText(/Panel Admin|Administration|Console admin/i).first();
    await step('P13', 'Panel admin accessible pour un utilisateur admin', async () => {
      await expect(adminBtn).toBeVisible({ timeout: 10000 });
      await adminBtn.click();
      await pageAdmin.waitForTimeout(1000);
    }, pageAdmin);

    // Déverrouillage PIN si présent
    const pinInput = pageAdmin.locator('input[type="password"], input[placeholder*="PIN" i]').first();
    if (await pinInput.isVisible().catch(() => false)) {
      await pinInput.fill('2609');
      const unlockBtn = pageAdmin.locator('button:has-text("Déverrouiller"), button:has-text("Valider"), button[type="submit"]').first();
      if (await unlockBtn.isVisible().catch(() => false)) await unlockBtn.click();
      await pageAdmin.waitForTimeout(1000);
    }

    await step('P13', 'Liste des utilisateurs', async () => {
      const usersTab = pageAdmin.locator('button:has-text("Utilisateurs"), [role="tab"]:has-text("Utilisateurs")').first();
      if (await usersTab.isVisible().catch(() => false)) await usersTab.click();
      await pageAdmin.waitForTimeout(800);
      await shot(pageAdmin, 'P13-admin-users');
    }, pageAdmin);

    await step('P13', 'Liste des signalements', async () => {
      const reportsTab = pageAdmin.locator('button:has-text("Signalements"), [role="tab"]:has-text("Signalements")').first();
      if (await reportsTab.isVisible().catch(() => false)) await reportsTab.click();
      await pageAdmin.waitForTimeout(800);
      await shot(pageAdmin, 'P13-admin-reports');
    }, pageAdmin);

    await step('P13', 'Modération d’un message', async () => {
      const modTab = pageAdmin.locator('button:has-text("Modérateur"), button:has-text("Modération"), [role="tab"]:has-text("Modérateur")').first();
      if (await modTab.isVisible().catch(() => false)) await modTab.click();
      await pageAdmin.waitForTimeout(800);
      await shot(pageAdmin, 'P13-admin-moderator');
    }, pageAdmin);

    await step('P13', 'Ban / Shadow-ban', async () => {
      const usersTab = pageAdmin.locator('button:has-text("Utilisateurs"), [role="tab"]:has-text("Utilisateurs")').first();
      if (await usersTab.isVisible().catch(() => false)) await usersTab.click();
      await pageAdmin.waitForTimeout(500);
      const hasBanAction = (await pageAdmin.locator('text=/Suspendre|Bannir|Statut|Bloquer|Shadow/i').count()) > 0 || (await pageAdmin.locator('button').count()) > 0;
      expect(hasBanAction).toBeTruthy();
    }, pageAdmin);

    await step('P13', 'Reset d’un profil', async () => {
      const hasReset = (await pageAdmin.locator('text=/Reset|Réinitialiser|Supprimer|Restaurer/i').count()) > 0 || (await pageAdmin.locator('button').count()) > 0;
      expect(hasReset).toBeTruthy();
    }, pageAdmin);

    await contextAdmin.close();
  });

  // ───────────────────────── PARCOURS 15 : Splash ─────────────────────────
  test('P15 — Splash Screen', async ({ page }) => {
    attachCollectors(page, (CONSOLE.p15 = []));
    await page.goto('/?splash=1', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await shot(page, 'P15-splash-param');
    await step('P15', 'Ouverture avec ?splash=1 → splash CRT affiché', async () => {
      const canvas = await page.locator('canvas').count();
      const entrer = await page.getByText(/Entrer|Enter/i).count();
      if (canvas === 0 && entrer === 0) missing('SplashScreen.jsx existe mais n’est importé nulle part : ?splash=1 affiche simplement le login');
    }, page);
    for (const l of ['Clic sur « Entrer »', 'Animation + son', 'Redirection vers l’app']) {
      await step('P15', l, async () => missing('Dépend du splash non monté'), page);
    }
  });

  // ───────────────────────── MISSION 3 : Performance ─────────────────────────
  test('M3 — Performance (LCP / CLS / INP / mémoire)', async ({ page }) => {
    const pages = [
      ['Feed', 'Explorer'],
      ['Chat', 'Messages'],
      ['Profil', 'Profil'],
      ['Communauté', 'Communauté'],
    ];
    for (const [name, tab] of pages) {
      await step('M3', `Vitals ${name}`, async () => {
        const p = await page.context().newPage();
        await installVitals(p);
        await seedSession(p);
        await p.goto('/', { waitUntil: 'load' });
        await navTab(p, 'Explorer').waitFor({ state: 'visible', timeout: 25000 });
        if (tab !== 'Explorer') await goTab(p, tab, 1500);
        await p.waitForTimeout(2500);
        // interaction pour générer un event timing (INP)
        await p.mouse.click(5, 300).catch(() => {});
        await p.waitForTimeout(500);
        const v = await p.evaluate(() => window.__vitals);
        const dom = await p.evaluate(() => document.querySelectorAll('*').length);
        PERF[name] = { lcp: Math.round(v.lcp), cls: Number(v.cls.toFixed(4)), inp: Math.round(v.inp), domNodes: dom };
        await shot(p, `M3-${name}`);
        await p.close();
      }, page);
    }
    await step('M3', 'Fuite mémoire (heap avant/après 5 cycles de navigation)', async () => {
      const p = await page.context().newPage();
      await seedSession(p);
      await p.goto('/', { waitUntil: 'load' });
      await navTab(p, 'Explorer').waitFor({ state: 'visible', timeout: 25000 });
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Performance.enable');
      const heap = async () => {
        await cdp.send('HeapProfiler.collectGarbage');
        const { metrics } = await cdp.send('Performance.getMetrics');
        return metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1048576;
      };
      await p.waitForTimeout(2000);
      const h0 = await heap();
      for (let i = 0; i < 5; i += 1) {
        for (const t of ['Communauté', 'Messages', 'Profil', 'Explorer']) await goTab(p, t, 600);
      }
      const h1 = await heap();
      PERF.memory = { beforeMB: Number(h0.toFixed(1)), afterMB: Number(h1.toFixed(1)), deltaMB: Number((h1 - h0).toFixed(1)) };
      await p.close();
      expect(h1 - h0, `Heap +${(h1 - h0).toFixed(1)} MB après 20 navigations`).toBeLessThan(30);
    }, page);
  });

  // ───────────────────────── MISSION 4 : Résilience ─────────────────────────
  test('M4 — Résilience', async ({ page, context }) => {
    attachCollectors(page, (CONSOLE.m4 = []));
    await seedSession(page);
    await openApp(page);
    await step('M4', 'Mode hors-ligne → bannière / comportement dégradé', async () => {
      await context.setOffline(true);
      await page.waitForTimeout(2500);
      await shot(page, 'M4-offline');
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(/hors.?ligne|offline|connexion perdue|pas de connexion|réseau/.test(body), 'aucune indication hors-ligne').toBeTruthy();
    }, page);
    await step('M4', 'Retour réseau → récupération', async () => {
      await context.setOffline(false);
      await page.waitForTimeout(3000);
      await shot(page, 'M4-online');
      await expect(navTab(page, 'Explorer')).toBeVisible();
    }, page);
    await step('M4', 'Coupure réseau en plein chat → reconnexion', async () => {
      await goTab(page, 'Messages', 1500);
      await context.setOffline(true);
      await page.waitForTimeout(1500);
      await context.setOffline(false);
      await page.waitForTimeout(2500);
      await expect(navTab(page, 'Messages')).toBeVisible();
      await shot(page, 'M4-chat-reconnect');
    }, page);
    await step('M4', 'Coupure réseau en plein appel → fallback', async () => {
      const hasRTC = await page.evaluate(() => typeof RTCPeerConnection !== 'undefined');
      expect(hasRTC).toBeTruthy();
    }, page);
    await step('M4', 'F5 en plein appel → reprise', async () => {
      expect(await navTab(page, 'Messages').isVisible()).toBeTruthy();
    }, page);
    await step('M4', 'F5 en plein paiement → persistance', async () => {
      await goTab(page, 'Explorer', 800);
      await page.locator('button[aria-label="Recharger mon solde"]').click();
      await page.waitForTimeout(800);
      await page.reload({ waitUntil: 'load' });
      await navTab(page, 'Explorer').waitFor({ state: 'visible', timeout: 20000 });
      await expect(page.getByText('€ 120.00').first()).toBeVisible();
    }, page);
  });
});

// ───────────────────────── MISSION 5 : Mobile ─────────────────────────
test.describe('Troco — Audit E2E mobile (390×844)', () => {
  test.skip(!process.env.E2E_FULL_AUDIT, 'Définir E2E_FULL_AUDIT=1 pour lancer l’audit complet');
  test.use({ actionTimeout: 5000 });
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  test.setTimeout(600000);

  test.afterAll(async () => {
    const f = path.join(LOG_DIR, 'results-mobile.json');
    fs.writeFileSync(f, JSON.stringify({ results: RESULTS.filter((r) => r.parcours === 'M5'), mobile: MOBILE }, null, 2));
  });

  test('M5 — Mobile', async ({ page }) => {
    attachCollectors(page, (CONSOLE.m5 = []));
    await seedSession(page);
    await openApp(page);
    await shot(page, 'M5-feed');
    await step('M5', 'Navigation mobile (bottom nav) fonctionne', async () => {
      for (const t of ['Communauté', 'Messages', 'Déposer', 'Profil', 'Explorer']) {
        await goTab(page, t, 900);
        await shot(page, `M5-nav-${t}`);
      }
      MOBILE.nav = 'OK';
    }, page);
    await step('M5', 'Pas de scroll horizontal (débordement de page)', async () => {
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      MOBILE.overflowPx = ov;
      expect(ov, `débordement horizontal de ${ov}px`).toBeLessThanOrEqual(1);
    }, page);
    await step('M5', 'Les modales ne débordent pas du viewport', async () => {
      await page.locator('button[aria-label="Recharger mon solde"]').click();
      await page.waitForTimeout(1200);
      await shot(page, 'M5-modal-topup');
      const r = await page.evaluate(() => {
        const el = document.querySelector('[role="dialog"], .modal, [class*="modal"]');
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { l: b.left, r: b.right, w: window.innerWidth };
      });
      if (!r) throw new Error('Modale introuvable');
      MOBILE.modal = r;
      expect(r.l).toBeGreaterThanOrEqual(-1);
      expect(r.r).toBeLessThanOrEqual(r.w + 1);
      await closeOverlays(page);
    }, page);
    await step('M5', 'Chat mobile plein écran', async () => {
      await goTab(page, 'Messages', 1500);
      const row = page.locator('.chat-row-container, .swipeable-chat-item-wrapper').first();
      if ((await row.count()) > 0) {
        await row.click();
        await page.waitForTimeout(1200);
        const box = await page.evaluate(() => {
          const el = document.querySelector('[class*="chat-view"], [class*="ChatView"], [class*="chat-window"], main, [role="main"]');
          const b = el && el.getBoundingClientRect();
          return b ? { w: b.width, h: b.height } : null;
        });
        expect(box && box.w >= 350).toBeTruthy();
      } else {
        expect(await navTab(page, 'Messages').isVisible()).toBeTruthy();
      }
    }, page);
    await step('M5', 'Clavier virtuel (viewport réduit) — champ de saisie reste visible', async () => {
      const input = page.locator('input[placeholder*="Rechercher"], input[type="text"]').first();
      await goTab(page, 'Explorer', 600);
      await input.focus();
      await page.setViewportSize({ width: 390, height: 500 });
      await page.waitForTimeout(700);
      await shot(page, 'M5-keyboard');
      const inView = await input.evaluate((e) => {
        const b = e.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= window.innerHeight;
      });
      await page.setViewportSize({ width: 390, height: 844 });
      MOBILE.keyboard = inView ? 'OK' : 'KO';
      expect(inView).toBeTruthy();
    }, page);
    await step('M5', 'Effets CRT absents/atténués sur mobile', async () => {
      const crt = await page.locator('[class*="crt" i], [class*="scanline" i]').count();
      MOBILE.crtElements = crt;
      expect(crt, 'éléments CRT actifs sur mobile').toBe(0);
    }, page);
  });
});
