// Helpers partagés pour la suite E2E complète (full-audit.spec.js)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(ROOT, 'docs', 'e2e-screenshots');
const LOG_DIR = path.join(ROOT, 'docs', 'e2e-logs');
const VIDEO_DIR = path.join(ROOT, 'docs', 'e2e-videos');
[SHOT_DIR, LOG_DIR, VIDEO_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const TEST_PROFILE = {
  id: 'test-user-123',
  uid: 'test-user-123',
  name: 'Alexandre Troco',
  username: '@alexandre',
  email: 'alexandre@troco.app',
  avatar: '',
  trocoTokens: 50,
  euroBalance: 120,
  cguAcceptedAt: new Date().toISOString(),
  onboardingCompleted: true,
  tutorialCompleted: true,
  skills: ['Développement Web', 'Design UI'],
  equipment: ['MacBook Pro'],
  socialLinks: ['https://github.com/mateopolo'],
  portfolioImages: [],
  verified: true,
};

/** Injecte une session E2E (bypass d'auth géré par window.__E2E__ dans l'app). */
async function seedSession(page, { tutorial = true, extra = {} } = {}) {
  await page.addInitScript(
    ({ profile, tutorial: tut, extra: ex }) => {
      window.__E2E__ = true;
      const p = { ...profile, tutorialCompleted: tut, ...ex };
      localStorage.setItem('troco_e2e_authenticated', 'true');
      localStorage.setItem('troco_auth_session', 'true');
      localStorage.setItem('troco_cgu_accepted', 'true');
      localStorage.setItem('troco_cookie_consent', 'accepted');
      localStorage.setItem('troco_consent_timestamp', String(Date.now()));
      localStorage.setItem('troco_user_profile', JSON.stringify(p));
      localStorage.setItem(
        'troco_auth_store',
        JSON.stringify({ state: { isAuthenticated: true, profile: p, profileDraft: p }, version: 0 })
      );
    },
    { profile: TEST_PROFILE, tutorial, extra }
  );
}

/** Collecte erreurs console / pageerror / requêtes en échec. */
function attachCollectors(page, bucket) {
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') bucket.push({ kind: `console.${t}`, text: m.text().slice(0, 400) });
  });
  page.on('pageerror', (e) => bucket.push({ kind: 'pageerror', text: String(e.message).slice(0, 400) }));
}

async function shot(page, name) {
  const file = path.join(SHOT_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
  } catch (_) {
    /* capture best-effort */
  }
  return `docs/e2e-screenshots/${name}.png`;
}

/** Mesure LCP / CLS / INP-approx via PerformanceObserver. À appeler après navigation. */
async function installVitals(page) {
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0, inp: 0 };
    try {
      new PerformanceObserver((l) => {
        const e = l.getEntries();
        window.__vitals.lcp = e[e.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__vitals.inp = Math.max(window.__vitals.inp, e.duration);
      }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    } catch (_) {
      /* navigateur sans support */
    }
  });
}

module.exports = { ROOT, SHOT_DIR, LOG_DIR, VIDEO_DIR, TEST_PROFILE, seedSession, attachCollectors, shot, installVitals };
