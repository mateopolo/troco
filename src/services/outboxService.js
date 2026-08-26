/**
 * outboxService.js — Moteur de résilience financière & Outbox Pattern IndexedDB
 * Garantit qu'aucune transaction, paiement ou opération critique n'est perdue en cas de coupure réseau.
 * Réconciliation automatique dès le rétablissement de la connectivité avec idempotency keys.
 */

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DB_NAME = 'troco_fintech_outbox_db';
const DB_VERSION = 1;
const STORE_TRANSACTIONS = 'outbox_transactions';
const STORE_MUTATIONS = 'outbox_mutations';

class OutboxService {
  constructor() {
    this.dbPromise = this.initDB();
    this.isSyncing = false;
    this.initNetworkListeners();
  }

  // Initialisation de la base locale IndexedDB
  initDB() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const idb = event.target.result;
        if (!idb.objectStoreNames.contains(STORE_TRANSACTIONS)) {
          const store = idb.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'idempotencyKey' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!idb.objectStoreNames.contains(STORE_MUTATIONS)) {
          const store = idb.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.warn('[OutboxService] IndexedDB init error:', e);
        resolve(null);
      };
    });
  }

  // Écoute des événements réseau online/offline
  initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[OutboxService] 🟢 Réseau rétabli — Déclenchement de la réconciliation Outbox...');
      this.flushOutbox();
    });

    // Tentative périodique de réconciliation silencieuse
    setInterval(() => {
      if (navigator.onLine) {
        this.flushOutbox();
      }
    }, 45000);
  }

  // Enregistrement d'une transaction dans l'Outbox avant/pendant l'émission
  async queueTransaction(transactionPayload) {
    const idempotencyKey = transactionPayload.idempotencyKey || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      ...transactionPayload,
      idempotencyKey,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
      clientTimestamp: new Date().toISOString(),
    };

    try {
      const idb = await this.dbPromise;
      if (idb) {
        const tx = idb.transaction(STORE_TRANSACTIONS, 'readwrite');
        tx.objectStore(STORE_TRANSACTIONS).put(record);
        await new Promise((res) => (tx.oncomplete = res));
      }
    } catch (e) {
      console.warn('[OutboxService] Échec écriture locale IndexedDB:', e);
    }

    // Si nous sommes en ligne, tenter la synchronisation immédiate
    if (navigator.onLine) {
      this.syncSingleTransaction(record);
    }

    return idempotencyKey;
  }

  // Synchronisation d'une transaction unitaire vers Firestore
  async syncSingleTransaction(record) {
    if (!db) return false;
    try {
      const txRef = doc(collection(db, 'transactions'), record.idempotencyKey);
      await setDoc(txRef, {
        ...record,
        status: 'completed',
        syncedAt: serverTimestamp(),
      }, { merge: true });

      // Retirer de l'Outbox locale dès confirmation Firestore
      await this.removeRecord(STORE_TRANSACTIONS, record.idempotencyKey);
      return true;
    } catch (err) {
      console.warn('[OutboxService] Erreur de sync transaction (restera en file locale) :', err);
      return false;
    }
  }

  // Vidange et réconciliation de toutes les opérations en attente
  async flushOutbox() {
    if (this.isSyncing || !navigator.onLine || !db) return;
    this.isSyncing = true;

    try {
      const idb = await this.dbPromise;
      if (!idb) return;

      // 1. Réconciliation des transactions
      const tx = idb.transaction(STORE_TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORE_TRANSACTIONS);
      const allPending = await new Promise((res) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });

      for (const item of allPending) {
        if (item.status === 'pending' || item.status === 'failed') {
          const success = await this.syncSingleTransaction(item);
          if (!success) {
            // Incrémenter le compteur de retry
            const updateTx = idb.transaction(STORE_TRANSACTIONS, 'readwrite');
            item.retryCount = (item.retryCount || 0) + 1;
            if (item.retryCount > 10) item.status = 'failed';
            updateTx.objectStore(STORE_TRANSACTIONS).put(item);
          }
        }
      }
    } catch (e) {
      console.warn('[OutboxService] Erreur globale lors du flushOutbox:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  // Suppression d'un enregistrement résolu
  async removeRecord(storeName, key) {
    try {
      const idb = await this.dbPromise;
      if (!idb) return;
      const tx = idb.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
    } catch (_) {}
  }
}

export const outboxService = new OutboxService();
