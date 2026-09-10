/**
 * Service Worker Registration for Troco PWA
 * Gère la détection de nouvelle version, l'invalidation forcée du cache,
 * les vérifications périodiques et l'affichage d'un Toast de mise à jour mobile.
 */

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/))
);

let isRefreshing = false;

// Redémarrage automatique propre lorsque le nouveau Service Worker prend le contrôle
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    console.info('[PWA] Nouveau Service Worker actif : rechargement de l’application...');
    window.location.reload(true);
  });
}

/**
 * Applique la mise à jour : force le Service Worker en attente à s'activer,
 * vide les caches locaux et recharge immédiatement la page.
 */
export function applyServiceWorkerUpdate(registration) {
  try {
    const waitingWorker =
      registration?.waiting ||
      (navigator.serviceWorker?.controller?.state === 'installed'
        ? navigator.serviceWorker.controller
        : null);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'CLEAR_CACHE' });
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (err) {
    console.warn('[PWA] PostMessage to SW failed:', err);
  }

  // Purge de tous les caches connus
  if (typeof window !== 'undefined' && 'caches' in window) {
    caches
      .keys()
      .then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
      .finally(() => {
        window.location.reload(true);
      });
  } else {
    window.location.reload(true);
  }
}

/**
 * Affiche un Toast visuel discret et moderne (Glassmorphic) invitant l'utilisateur
 * à cliquer pour recharger la nouvelle version de Troco.
 */
export function showUpdateToast(registration) {
  if (typeof document === 'undefined') return;

  const existingToast = document.getElementById('troco-pwa-update-toast');
  if (existingToast) return;

  const toast = document.createElement('div');
  toast.id = 'troco-pwa-update-toast';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999999;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    border-radius: 16px;
    background: rgba(26, 20, 16, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1.5px solid #F59E0B;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.25);
    color: #FFFFFF;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    max-width: calc(100vw - 32px);
    width: auto;
    animation: pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  `;

  // Animation CSS
  if (!document.getElementById('pwa-toast-style')) {
    const style = document.createElement('style');
    style.id = 'pwa-toast-style';
    style.textContent = `
      @keyframes pwaSlideUp {
        from { transform: translate(-50%, 30px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      #troco-pwa-update-btn:hover {
        transform: scale(1.03);
        filter: brightness(1.1);
      }
      #troco-pwa-update-btn:active {
        transform: scale(0.97);
      }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `
    <span style="font-size: 18px; line-height: 1;">🚀</span>
    <span style="flex: 1; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
      Nouvelle mise à jour disponible !
    </span>
    <button id="troco-pwa-update-btn" style="
      background: #F59E0B;
      color: #000000;
      border: none;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
      flex-shrink: 0;
    ">
      Mettre à jour
    </button>
  `;

  document.body.appendChild(toast);

  const btn = toast.querySelector('#troco-pwa-update-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      btn.textContent = 'Mise à jour...';
      btn.disabled = true;
      applyServiceWorkerUpdate(registration);
    });
  }
}

/**
 * Gère la détection d'une mise à jour de l'application
 */
function handleUpdateFound(registration, config) {
  console.info('[PWA] 🚀 Nouvelle version détectée (déploiement Vercel/Git).');

  // Callback de configuration si fourni
  if (config && typeof config.onUpdate === 'function') {
    try {
      config.onUpdate(registration, () => applyServiceWorkerUpdate(registration));
    } catch (e) {
      console.warn('[PWA] Erreur dans config.onUpdate:', e);
    }
  }

  // Événement personnalisé pour intégration UI dans les composants React (ex: App.js)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('troco:sw_update_available', {
        detail: {
          registration,
          applyUpdate: () => applyServiceWorkerUpdate(registration),
        },
      })
    );
  }

  // Affichage du Toast de rechargement PWA
  showUpdateToast(registration);
}

export function register(config) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then((registration) => {
          console.info('[PWA] Service worker actif en local.');
          setupPeriodicUpdates(registration, config);
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

/**
 * Configure les vérifications régulières de nouvelles versions sur mobile & desktop
 */
function setupPeriodicUpdates(registration, config) {
  if (!registration) return;

  // 1. Vérification si un worker attend déjà
  if (registration.waiting) {
    handleUpdateFound(registration, config);
  }

  // 2. Vérification périodique toutes les 60 secondes
  setInterval(() => {
    registration.update().catch(() => {});
  }, 60 * 1000);

  // 3. Vérification lors du retour sur l'onglet ou réouverture de l'application PWA
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });
  }

  window.addEventListener('focus', () => {
    registration.update().catch(() => {});
  });
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      setupPeriodicUpdates(registration, config);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nouveau déploiement détecté : afficher le Toast et proposer la purge/rechargement
              handleUpdateFound(registration, config);
            } else {
              console.info('[PWA] Contenu mis en cache pour utilisation hors ligne.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.warn('[PWA] Erreur enregistrement Service Worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload(true);
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.info('[PWA] Aucune connexion Internet trouvée. Mode hors ligne activé.');
    });
}

export function unregister() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.warn(error.message);
      });
  }
}
