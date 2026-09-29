import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Global singleton map to prevent N+1 Firestore listeners for the same UID
// Structure: Map<string, { subscribers: Set<Function>, unsubscribe: Function|null, data: { isOnline: boolean, lastSeen: any }, refCount: number, timerId: any }>
const presenceRegistry = new Map();

const OFFLINE_THRESHOLD_MS = 60000; // 60 seconds

function checkIsOnline(presenceData) {
  if (!presenceData) return false;
  if (presenceData.online === false) return false;
  if (presenceData.online === true) {
    const lastSeenMs = presenceData.lastSeenMs || (presenceData.lastSeen?.toMillis ? presenceData.lastSeen.toMillis() : null);
    if (lastSeenMs && (Date.now() - lastSeenMs > OFFLINE_THRESHOLD_MS)) {
      return false;
    }
    return true;
  }
  return false;
}

function subscribeToUid(uid) {
  const normUid = String(uid).trim();
  let entry = presenceRegistry.get(normUid);

  if (!entry) {
    entry = {
      subscribers: new Set(),
      unsubscribe: null,
      data: { isOnline: false, lastSeen: null },
      refCount: 0,
      timerId: null,
    };
    presenceRegistry.set(normUid, entry);

    if (db) {
      try {
        const docRef = doc(db, 'presence', normUid);
        entry.unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            const rawData = snapshot.data();
            const isOnline = checkIsOnline(rawData);
            const lastSeen = rawData?.lastSeenMs || (rawData?.lastSeen?.toMillis ? rawData.lastSeen.toMillis() : null) || null;
            entry.data = { isOnline, lastSeen };
            entry.subscribers.forEach((cb) => cb(entry.data));
          },
          (err) => {
            // Silently handle read errors
            console.debug('[useUserPresence] Listener error for', normUid, err);
          }
        );
      } catch (e) {
        console.debug('[useUserPresence] Subscription failed for', normUid, e);
      }
    }

    // Periodic check to flip isOnline to false if heartbeat expired
    entry.timerId = setInterval(() => {
      if (entry.data.isOnline && entry.data.lastSeen && (Date.now() - entry.data.lastSeen > OFFLINE_THRESHOLD_MS)) {
        entry.data = { ...entry.data, isOnline: false };
        entry.subscribers.forEach((cb) => cb(entry.data));
      }
    }, 15000);
  }

  entry.refCount += 1;
  return entry;
}

function unsubscribeFromUid(uid, callback) {
  const normUid = String(uid).trim();
  const entry = presenceRegistry.get(normUid);
  if (!entry) return;

  entry.subscribers.delete(callback);
  entry.refCount -= 1;

  if (entry.refCount <= 0) {
    if (entry.timerId) clearInterval(entry.timerId);
    if (typeof entry.unsubscribe === 'function') {
      entry.unsubscribe();
    }
    presenceRegistry.delete(normUid);
  }
}

/**
 * useUserPresence(uid)
 * Shared hook returning real-time presence without N+1 duplication.
 *
 * @param {string|null|undefined} uid - User UID to monitor
 * @returns {{ isOnline: boolean, lastSeen: number|null }}
 */
export function useUserPresence(uid) {
  const [presence, setPresence] = useState(() => {
    if (!uid) return { isOnline: false, lastSeen: null };
    const normUid = String(uid).trim();
    const existing = presenceRegistry.get(normUid);
    return existing ? existing.data : { isOnline: false, lastSeen: null };
  });

  useEffect(() => {
    if (!uid) {
      setPresence({ isOnline: false, lastSeen: null });
      return;
    }

    const normUid = String(uid).trim();
    const entry = subscribeToUid(normUid);

    const onUpdate = (data) => {
      setPresence(data);
    };

    entry.subscribers.add(onUpdate);
    // Initial sync
    setPresence(entry.data);

    return () => {
      unsubscribeFromUid(normUid, onUpdate);
    };
  }, [uid]);

  return presence;
}

export default useUserPresence;
