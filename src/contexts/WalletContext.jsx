import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_user_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  // Persistance locale des transactions
  useEffect(() => {
    try {
      localStorage.setItem('troco_user_transactions', JSON.stringify(transactions));
    } catch (_) {}
  }, [transactions]);

  // Écoute des transactions de l'utilisateur connecté dans Firestore avec tri client résilient
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    const handleSnapshot = (snapshot) => {
      const liveTxs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Tri chronologique descendant côté client
      liveTxs.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime());
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime());
        return tB - tA;
      });
      if (liveTxs.length > 0) {
        setTransactions(liveTxs);
      }
      setLoading(false);
    };

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, handleSnapshot, (err) => {
        console.warn('[WalletContext] transactions with orderBy failed, fallback without orderBy:', err);
        try {
          const fallbackQ = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid)
          );
          unsubscribe = onSnapshot(fallbackQ, handleSnapshot, (fallbackErr) => {
            console.error('[WalletContext] fallback query failed:', fallbackErr);
            setLoading(false);
          });
        } catch (_) {
          setLoading(false);
        }
      });
    } catch (e) {
      console.warn('[WalletContext] query initialization error:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const addLocalTransaction = (newTx) => {
    setTransactions(prev => [newTx, ...prev]);
  };

  const value = {
    transactions,
    setTransactions,
    addLocalTransaction,
    loading,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  return context || {};
}
