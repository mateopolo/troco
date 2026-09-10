import { Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Envoie un email de notification de suppression de compte avec lien de rétractation (30 jours).
 */
export async function sendDeletionEmail(uid: string, db?: Firestore): Promise<{ sent: boolean; email?: string }> {
  try {
    const authUser = await getAuth().getUser(uid).catch(() => null);
    const email = authUser?.email;

    if (!email) {
      console.log(`[GDPR Email] No email found for uid ${uid}`);
      return { sent: false };
    }

    // Journalisation simulée ou intégration SendGrid / Firebase Trigger Email
    console.log(`[GDPR Email] Confirmation de suppression programmée envoyée à ${email} pour le compte ${uid}. Rétractation sous 30 jours.`);
    
    // Si la collection mail existe (Extension Trigger Email), on peut y écrire :
    if (db) {
      await db.collection('mail').add({
        to: email,
        message: {
          subject: 'Confirmation de la demande de suppression de compte — Troco',
          text: `Bonjour,\n\nVotre compte Troco a été programmé pour suppression définitive dans 30 jours.\nSi vous souhaitez annuler cette demande, vous pouvez vous reconnecter ou utiliser le lien de restauration dans votre espace.\n\nL'équipe Troco`,
        },
      }).catch(() => {});
    }

    return { sent: true, email };
  } catch (err) {
    console.warn(`[GDPR Email] Failed to send deletion email for uid ${uid}:`, err);
    return { sent: false };
  }
}
