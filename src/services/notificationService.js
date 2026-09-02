import { playPop } from './audioService';
import { hapticLight } from '../utils/haptics';

/**
 * notificationService.js
 * Moteur global de notifications in-app façon "Dynamic Island"
 */

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.currentNotification = null;
    this.timeoutId = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    if (this.currentNotification) {
      listener(this.currentNotification);
    }
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentNotification);
      } catch (err) {
        console.warn('[NotificationService] Listener error:', err);
      }
    });
  }

  /**
   * Déclenche une notification Dynamic Island
   * @param {Object} options 
   * @param {string} options.title Titre ou nom de l'expéditeur
   * @param {string} options.message Texte du message (tronqué)
   * @param {string} [options.avatar] URL de l'avatar ou lettre
   * @param {string} [options.icon] Type d'icône (ex: 'chat', 'deal', 'token', 'bell')
   * @param {Function} [options.onClick] Action au clic (redirection chat/deal)
   * @param {Object} [options.data] Données associées (chatId, listingId, etc.)
   * @param {number} [options.duration=4500] Durée d'affichage en ms
   */
  show({
    title,
    message,
    avatar = null,
    icon = 'bell',
    onClick = null,
    data = null,
    duration = 4500,
  }) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    const notification = {
      id: Date.now() + Math.random(),
      title: title || 'Notification',
      message: message || '',
      avatar,
      icon,
      onClick,
      data,
      duration,
      createdAt: Date.now(),
    };

    this.currentNotification = notification;
    this.notifyListeners();

    // Effets sensoriels premium
    try {
      playPop();
      hapticLight();
    } catch (_) {}

    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.dismiss();
      }, duration);
    }

    return notification.id;
  }

  dismiss() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentNotification = null;
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();

export const showDynamicIslandNotification = (options) => notificationService.show(options);
export const dismissDynamicIslandNotification = () => notificationService.dismiss();

export default notificationService;
