import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { playBetclicBalanceSound, playApplePaySound } from '../utils/audioService';
import { detectGeoCurrency } from '../services/pricingService';
import { hapticSuccess } from '../utils/haptics';

export const useWalletStore = create(
  persist(
    (set, get) => ({
      euroBalance: 128.00,
      balance: 128.00,
      walletBalanceFiat: 128.00,
      trocoTokens: 12,
      isTrocoPlus: false,
      subscriptionPlan: null,
      subscriptionStartDate: null,
      subscriptionRenewalDate: null,
      kycVerified: false,
      transactions: [],
      topUpCelebration: null,
      isPaymentModalOpen: false,
      paymentModalConfig: { mode: 'pack-tokens', payload: null },
      isTransactionsModalOpen: false,

      // 🚨 PHASE 58 : VERROUILLAGE GÉO-IP IMMUABLE DE LA DEVISE
      currency: 'EUR',
      currencySymbol: '€',
      countryCode: 'FR',
      isCurrencyLocked: true,

      initializeGeoCurrency: async () => {
        try {
          const geoInfo = await detectGeoCurrency();
          if (geoInfo && geoInfo.currency) {
            set({
              currency: geoInfo.currency,
              currencySymbol: geoInfo.currencySymbol || '€',
              countryCode: geoInfo.countryCode || 'FR',
              isCurrencyLocked: true,
            });
          }
        } catch (_) {}
      },

      setEuroBalance: (euroBalance) => {
        const val = Number(Number(euroBalance).toFixed(2));
        set({ euroBalance: val, balance: val, walletBalanceFiat: val });
      },
      setBalance: (balance) => {
        const val = Number(Number(balance).toFixed(2));
        set({ euroBalance: val, balance: val, walletBalanceFiat: val });
      },
      setTrocoTokens: (trocoTokens) => set({ trocoTokens: Number(trocoTokens) }),
      setKycVerified: (kycVerified) => set({ kycVerified: Boolean(kycVerified) }),
      setTrocoPlus: (isTrocoPlus, planKey = null) => set({ isTrocoPlus: Boolean(isTrocoPlus), subscriptionPlan: planKey || null }),
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),

      setSubscription: ({ isTrocoPlus, planKey, startDate, renewalDate }) => set({
        isTrocoPlus: Boolean(isTrocoPlus),
        subscriptionPlan: planKey || null,
        subscriptionStartDate: startDate || new Date().toISOString(),
        subscriptionRenewalDate: renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),

      setTopUpCelebration: (celebration) => set({ topUpCelebration: celebration }),
      clearTopUpCelebration: () => set({ topUpCelebration: null }),

      setIsPaymentModalOpen: (isOpen) => set({ isPaymentModalOpen: isOpen }),
      setPaymentModalConfig: (config) => set({ paymentModalConfig: config }),
      openPayment: (mode, payload = null) => set({
        isPaymentModalOpen: true,
        paymentModalConfig: { mode, payload },
      }),
      closePayment: () => set({ isPaymentModalOpen: false }),

      setIsTransactionsModalOpen: (isOpen) => set({ isTransactionsModalOpen: isOpen }),

      creditBalance: (euroDelta = 0, tokensDelta = 0) => set((state) => {
        const newEuros = Number(Math.max(0, state.euroBalance + Number(euroDelta)).toFixed(2));
        const newTokens = Math.max(0, state.trocoTokens + Number(tokensDelta));
        return {
          euroBalance: newEuros,
          balance: newEuros,
          walletBalanceFiat: newEuros,
          trocoTokens: newTokens,
        };
      }),

      debitBalance: (euroDelta = 0, tokensDelta = 0) => set((state) => {
        const newEuros = Number(Math.max(0, state.euroBalance - Number(euroDelta)).toFixed(2));
        const newTokens = Math.max(0, state.trocoTokens - Number(tokensDelta));
        return {
          euroBalance: newEuros,
          balance: newEuros,
          walletBalanceFiat: newEuros,
          trocoTokens: newTokens,
        };
      }),

      // Listener temps réel du solde utilisateur Firestore avec détection d'incrément, haptique et alerte sonore
      subscribeToUserBalance: (uid) => {
        if (!uid || !db) return () => {};
        const userDocRef = doc(db, 'users', String(uid));
        let prevTokens = null;
        let prevEuros = null;

        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (!docSnap.exists()) return;
          const data = docSnap.data() || {};
          const rawTokens = data.trocoTokens ?? data.tokens;
          const rawEuros = data.walletBalanceFiat ?? data.euroBalance ?? data.balance;

          const newTokens = rawTokens !== undefined && rawTokens !== null ? Number(rawTokens) : null;
          const newEuros = rawEuros !== undefined && rawEuros !== null ? Number(Number(rawEuros).toFixed(2)) : null;

          if (prevTokens !== null && newTokens !== null && newTokens > prevTokens) {
            const gained = newTokens - prevTokens;
            hapticSuccess();
            playBetclicBalanceSound();
            set({
              topUpCelebration: {
                title: `+${gained} Jeton${gained > 1 ? 's' : ''} Troco reçus ! 🪙`,
                subtitle: `Nouveau solde : ${newTokens} Jetons Troco`,
              },
            });
            setTimeout(() => {
              if (get().topUpCelebration?.title?.includes('Jeton')) {
                set({ topUpCelebration: null });
              }
            }, 4500);
          } else if (prevEuros !== null && newEuros !== null && newEuros > prevEuros) {
            const gained = (newEuros - prevEuros).toFixed(2);
            hapticSuccess();
            playApplePaySound();
            set({
              topUpCelebration: {
                title: `+${gained} € reçus sur votre solde ! 💳`,
                subtitle: `Nouveau solde : ${newEuros.toFixed(2)} €`,
              },
            });
            setTimeout(() => {
              if (get().topUpCelebration?.title?.includes('€')) {
                set({ topUpCelebration: null });
              }
            }, 4500);
          }

          if (newTokens !== null) prevTokens = newTokens;
          if (newEuros !== null) prevEuros = newEuros;

          set({
            ...(newTokens !== null ? { trocoTokens: newTokens } : {}),
            ...(newEuros !== null ? { euroBalance: newEuros, balance: newEuros, walletBalanceFiat: newEuros } : {}),
            kycVerified: Boolean(data.kycVerified),
            isTrocoPlus: Boolean(data.isTrocoPlus),
            subscriptionPlan: data.trocoPlusPlan || null,
          });
        }, (err) => {
          console.warn('[useWalletStore] onSnapshot balance error:', err);
        });

        return unsubscribe;
      },
    }),
    {
      name: 'troco_wallet_store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
