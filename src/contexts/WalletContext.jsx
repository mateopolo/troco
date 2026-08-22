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

  // Écoute des transactions de l'utilisateur connecté dans Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const liveTxs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        if (liveTxs.length > 0) {
          setTransactions(liveTxs);
        }
        setLoading(false);
      }, (err) => {
        console.warn('[WalletContext] transactions listener error:', err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('[WalletContext] query initialization error:', e);
      setLoading(false);
    }
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
