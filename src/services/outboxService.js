/**
 * outboxService.js — Moteur de résilience & Outbox Pattern IndexedDB via `idb`
 * 
 * Stocke et synchronise de manière asynchrone et non-bloquante :
 * 1. La file d'attente des messages hors-ligne (outbox_messages)
 * 2. Le cache local haute performance des conversations et fils de messages (chat_cache)
 * 3. Les transactions et mutations financières critiques (outbox_transactions, outbox_mutations)
 * 
 * Réconciliation automatique dès le rétablissement de la connectivité réseau.
 */

import { openDB } from 'idb';
import { collection, doc, setDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

const DB_NAME = 'troco_fintech_outbox_db';
const DB_VERSION = 2;

const STORE_TRANSACTIONS = 'outbox_transactions';
const STORE_MUTATIONS = 'outbox_mutations';
const STORE_MESSAGES = 'outbox_messages';
const STORE_CHAT_CACHE = 'chat_cache';

class OutboxService {
  constructor() {
    this.dbPromise = null;
    this.isSyncing = false;
    this.isSyncingMessages = false;
    this.memFallback = new Map(); // Fallback en mémoire si IndexedDB indisponible (ex: SSR / tests)
    this.initNetworkListeners();
  }

  // Initialisation de la base IndexedDB via la librairie idb
  async getDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(dbInstance, oldVersion) {
          if (!dbInstance.objectStoreNames.contains(STORE_TRANSACTIONS)) {
            const store = dbInstance.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'idempotencyKey' });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!dbInstance.objectStoreNames.contains(STORE_MUTATIONS)) {
            const store = dbInstance.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
            store.createIndex('status', 'status', { unique: false });
          }
          if (!dbInstance.objectStoreNames.contains(STORE_MESSAGES)) {
            const msgStore = dbInstance.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
            msgStore.createIndex('status', 'status', { unique: false });
            msgStore.createIndex('chatId', 'chatId', { unique: false });
            msgStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!dbInstance.objectStoreNames.contains(STORE_CHAT_CACHE)) {
            dbInstance.createObjectStore(STORE_CHAT_CACHE, { keyPath: 'key' });
          }
        },
      }).catch((err) => {
        logger.warn('[OutboxService] Échec ouverture IndexedDB via idb:', err);
        return null;
      });
    }

    return this.dbPromise;
  }

  // Écoute des événements réseau online/offline
  initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      logger.info('[OutboxService] 🟢 Réseau rétabli — Déclenchement de la réconciliation Outbox (Transactions & Messages)...');
      this.flushOutbox();
    });

    // Tentative périodique de réconciliation silencieuse
    setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.flushOutbox();
      }
    }, 45000);
  }

  // =========================================================================
  // GESTION DU CACHE INDEXEDDB (CHATS & MESSAGES) — REMPLACE LOCALSTORAGE
  // =========================================================================

  /**
   * Récupère la liste des conversations mise en cache de façon asynchrone (non-bloquante).
   */
  async getCachedChats() {
    try {
      const idb = await this.getDB();
      if (!idb) {
        return this.memFallback.get('chats_list') || null;
      }
      const record = await idb.get(STORE_CHAT_CACHE, 'chats_list');
      return record?.data || null;
    } catch (e) {
      logger.warn('[OutboxService] getCachedChats error:', e);
      return this.memFallback.get('chats_list') || null;
    }
  }

  /**
   * Sauvegarde la liste des conversations dans IndexedDB en arrière-plan.
   */
  async setCachedChats(chats) {
    if (!Array.isArray(chats)) return;
    try {
      this.memFallback.set('chats_list', chats);
      const idb = await this.getDB();
      if (idb) {
        await idb.put(STORE_CHAT_CACHE, {
          key: 'chats_list',
          data: chats,
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      logger.warn('[OutboxService] setCachedChats error:', e);
    }
  }

  /**
   * Récupère les messages d'un fil de discussion mis en cache dans IndexedDB.
   */
  async getCachedMessages(chatId) {
    if (!chatId) return null;
    const key = `thread_${chatId}`;
    try {
      const idb = await this.getDB();
      if (!idb) {
        return this.memFallback.get(key) || null;
      }
      const record = await idb.get(STORE_CHAT_CACHE, key);
      return record?.data || null;
    } catch (e) {
      logger.warn('[OutboxService] getCachedMessages error:', e);
      return this.memFallback.get(key) || null;
    }
  }

  /**
   * Sauvegarde les messages d'un fil de discussion dans IndexedDB.
   */
  async setCachedMessages(chatId, messages) {
    if (!chatId || !Array.isArray(messages)) return;
    const key = `thread_${chatId}`;
    try {
      this.memFallback.set(key, messages);
      const idb = await this.getDB();
      if (idb) {
        await idb.put(STORE_CHAT_CACHE, {
          key,
          data: messages,
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      logger.warn('[OutboxService] setCachedMessages error:', e);
    }
  }

  // =========================================================================
  // GESTION DE L'OUTBOX DES MESSAGES (OFFLINE QUEUE & AUTO-SYNC)
  // =========================================================================

  /**
   * Place un message dans l'Outbox locale IndexedDB lors d'un envoi hors-ligne.
   */
  async queueMessage(messagePayload) {
    const id = messagePayload.id || messagePayload.temporaryId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      ...messagePayload,
      id,
      temporaryId: id,
      status: 'pending',
      retryCount: 0,
      createdAt: messagePayload.createdAt
        ? (typeof messagePayload.createdAt === 'number'
          ? messagePayload.createdAt
          : (messagePayload.createdAt.getTime ? messagePayload.createdAt.getTime() : Date.now()))
        : Date.now(),
    };

    try {
      const idb = await this.getDB();
      if (idb) {
        await idb.put(STORE_MESSAGES, record);
      } else {
        this.memFallback.set(`outbox_msg_${id}`, record);
      }
    } catch (e) {
      logger.warn('[OutboxService] Échec queueMessage IndexedDB:', e);
      this.memFallback.set(`outbox_msg_${id}`, record);
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.flushMessagesOutbox();
    }

    return id;
  }

  /**
   * Récupère tous les messages en attente de synchronisation.
   */
  async getPendingMessages(chatId = null) {
    try {
      let all = [];
      const idb = await this.getDB();
      if (idb) {
        all = await idb.getAll(STORE_MESSAGES);
      } else {
        all = Array.from(this.memFallback.entries())
          .filter(([k]) => k.startsWith('outbox_msg_'))
          .map(([, v]) => v);
      }
      const pending = all.filter(m => m.status === 'pending');
      if (chatId) {
        return pending.filter(m => String(m.chatId) === String(chatId));
      }
      return pending;
    } catch (e) {
      logger.warn('[OutboxService] Échec getPendingMessages:', e);
      return [];
    }
  }

  /**
   * Supprime un message de l'outbox après synchronisation confirmée.
   */
  async removePendingMessage(id) {
    try {
      this.memFallback.delete(`outbox_msg_${id}`);
      const idb = await this.getDB();
      if (idb) {
        await idb.delete(STORE_MESSAGES, id);
      }
    } catch (e) {
      logger.warn('[OutboxService] Échec suppression pending message:', e);
    }
  }

  /**
   * Synchronise un message unitaire vers Firestore.
   */
  async syncSingleMessage(record) {
    if (!db || !record.chatId) return false;
    try {
      const chatId = String(record.chatId);
      const tempId = record.id || record.temporaryId;
      const myUid = record.senderUid || record.senderId || 'me';
      const myName = record.senderName || 'Moi';
      const preview = record.text || (record.type === 'audio' ? `🎵 ${record.fileName || 'Fichier audio'}` : 'Message');

      // 1. Mise à jour des métadonnées du document parent
      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(chatDocRef, {
        id: chatId,
        lastMessage: preview,
        lastSenderName: myName,
        unreadCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Écriture du message dans la sous-collection Firestore
      const msgData = {
        ...record,
        temporaryId: tempId,
        senderUid: myUid,
        senderName: myName,
        read: false,
        status: 'sent',
        createdAt: serverTimestamp(),
      };
      delete msgData.id;
      delete msgData.retryCount;

      const docRef = await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);

      // 3. Purge immédiate de l'Outbox locale
      await this.removePendingMessage(tempId);

      // 4. Notification par événement pour réconciliation en direct dans les composants
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('troco:outbox_message_synced', {
          detail: {
            tempId,
            realId: docRef.id,
            chatId,
            syncedRecord: { ...record, id: docRef.id, temporaryId: tempId, status: 'sent' },
          },
        }));
      }

      return { success: true, realId: docRef.id };
    } catch (err) {
      logger.warn('[OutboxService] Erreur synchronisation message Firestore:', err);
      return false;
    }
  }

  /**
   * Vide l'outbox des messages en attente et les envoie sur le réseau.
   */
  async flushMessagesOutbox(onMessageSynced = null) {
    if (this.isSyncingMessages || !db) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    this.isSyncingMessages = true;

    try {
      const pending = await this.getPendingMessages();

      for (const item of pending) {
        const result = await this.syncSingleMessage(item);
        if (result && result.success) {
          if (typeof onMessageSynced === 'function') {
            onMessageSynced(item, result.realId);
          }
        } else {
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount > 10) item.status = 'failed';
          const idb = await this.getDB();
          if (idb) {
            await idb.put(STORE_MESSAGES, item);
          }
        }
      }
    } catch (e) {
      logger.warn('[OutboxService] Erreur globale lors du flushMessagesOutbox:', e);
    } finally {
      this.isSyncingMessages = false;
    }
  }

  // =========================================================================
  // GESTION DE L'OUTBOX FINANCIÈRE (TRANSACTIONS CRITIQUES)
  // =========================================================================

  /**
   * Enregistrement d'une transaction dans l'Outbox avant/pendant l'émission
   */
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
      const idb = await this.getDB();
      if (idb) {
        await idb.put(STORE_TRANSACTIONS, record);
      } else {
        this.memFallback.set(`tx_${idempotencyKey}`, record);
      }
    } catch (e) {
      logger.warn('[OutboxService] Échec écriture locale IndexedDB transaction:', e);
      this.memFallback.set(`tx_${idempotencyKey}`, record);
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncSingleTransaction(record);
    }

    return idempotencyKey;
  }

  /**
   * Synchronisation d'une transaction unitaire vers Firestore
   */
  async syncSingleTransaction(record) {
    if (!db) return false;
    try {
      const txRef = doc(collection(db, 'transactions'), record.idempotencyKey);
      await setDoc(txRef, {
        ...record,
        status: 'completed',
        syncedAt: serverTimestamp(),
      }, { merge: true });

      await this.removeRecord(STORE_TRANSACTIONS, record.idempotencyKey);
      return true;
    } catch (err) {
      logger.warn('[OutboxService] Erreur de sync transaction (restera en file locale) :', err);
      return false;
    }
  }

  /**
   * Vidange des transactions en attente
   */
  async flushTransactionsOutbox() {
    if (this.isSyncing || !db) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    this.isSyncing = true;

    try {
      const idb = await this.getDB();
      let allPending = [];
      if (idb) {
        const all = await idb.getAll(STORE_TRANSACTIONS);
        allPending = all.filter(t => t.status === 'pending' || t.status === 'failed');
      } else {
        allPending = Array.from(this.memFallback.entries())
          .filter(([k]) => k.startsWith('tx_'))
          .map(([, v]) => v)
          .filter(t => t.status === 'pending' || t.status === 'failed');
      }

      for (const item of allPending) {
        const success = await this.syncSingleTransaction(item);
        if (!success) {
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount > 10) item.status = 'failed';
          if (idb) {
            await idb.put(STORE_TRANSACTIONS, item);
          }
        }
      }
    } catch (e) {
      logger.warn('[OutboxService] Erreur globale lors du flushTransactionsOutbox:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Vidange complète de toutes les opérations Outbox (transactions et messages).
   */
  async flushOutbox() {
    await Promise.allSettled([
      this.flushTransactionsOutbox(),
      this.flushMessagesOutbox(),
    ]);
  }

  /**
   * Suppression d'un enregistrement résolu
   */
  async removeRecord(storeName, key) {
    try {
      this.memFallback.delete(key);
      const idb = await this.getDB();
      if (idb) {
        await idb.delete(storeName, key);
      }
    } catch (_) {}
  }
}

export const outboxService = new OutboxService();
export default outboxService;
