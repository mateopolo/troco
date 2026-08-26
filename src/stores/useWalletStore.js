import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useWalletStore = create(
  persist(
    (set, get) => ({
      euroBalance: 128.00,
      trocoTokens: 12,
      isTrocoPlus: false,
      subscriptionPlan: null,
      subscriptionStartDate: null,
      subscriptionRenewalDate: null,
      transactions: [],
      topUpCelebration: null,
      isPaymentModalOpen: false,
      paymentModalConfig: { mode: 'pack-tokens', payload: null },
      isTransactionsModalOpen: false,

      setEuroBalance: (euroBalance) => set({ euroBalance: Number(Number(euroBalance).toFixed(2)) }),
      setTrocoTokens: (trocoTokens) => set({ trocoTokens: Number(trocoTokens) }),
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

      creditBalance: (euroDelta = 0, tokensDelta = 0) => set((state) => ({
        euroBalance: Number(Math.max(0, state.euroBalance + Number(euroDelta)).toFixed(2)),
        trocoTokens: Math.max(0, state.trocoTokens + Number(tokensDelta)),
      })),

      debitBalance: (euroDelta = 0, tokensDelta = 0) => set((state) => ({
        euroBalance: Number(Math.max(0, state.euroBalance - Number(euroDelta)).toFixed(2)),
        trocoTokens: Math.max(0, state.trocoTokens - Number(tokensDelta)),
      })),
    }),
    {
      name: 'troco_wallet_store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
