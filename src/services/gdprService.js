import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * GDPR Service calling Cloud Functions deleteUserCompletely and restoreAccount.
 * Fully compliant with GDPR Article 17 (Right to Erasure) and 10-year accounting retention.
 */
export const gdprService = {
  /**
   * Request soft deletion (30-day grace period) or immediate hard deletion.
   */
  async deleteUserCompletely({ immediate = false } = {}) {
    const fn = httpsCallable(functions, 'deleteUserCompletely');
    const response = await fn({ immediate });
    return response.data;
  },

  /**
   * Cancel pending deletion within the 30-day grace period.
   */
  async restoreAccount() {
    const fn = httpsCallable(functions, 'restoreAccount');
    const response = await fn({});
    return response.data;
  },
};
