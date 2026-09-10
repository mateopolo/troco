import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Service to safely read public user profile data from `users_public/{uid}`
 * (does not expose email, balances, phone numbers, or private info).
 */
export const usersPublicService = {
  /**
   * Fetch a single public profile by UID
   */
  async getPublicProfile(uid) {
    if (!uid) return null;
    try {
      const snap = await getDoc(doc(db, 'users_public', uid));
      if (snap.exists()) {
        return { uid, ...snap.data() };
      }
      return null;
    } catch (err) {
      console.warn(`[usersPublicService] Error fetching public profile ${uid}:`, err);
      return null;
    }
  },

  /**
   * Subscribe to a single public profile
   */
  subscribePublicProfile(uid, callback) {
    if (!uid) return () => {};
    return onSnapshot(doc(db, 'users_public', uid), (snap) => {
      if (snap.exists()) {
        callback({ uid, ...snap.data() });
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn(`[usersPublicService] Subscription error for ${uid}:`, err);
    });
  }
};
