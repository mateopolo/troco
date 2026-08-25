import { create } from 'zustand';

export const useWalletStore = create((set, get) => ({
  euroBalance: 0.0,
  trocoTokens: 10,
  isTrocoPlus: false,
  trocoPlusPlan: null,
  kycVerified: false,
  transactions: [],
  topUpCelebration: null,

  setEuroBalance: (euroBalance) => set({ euroBalance: Number(Number(euroBalance).toFixed(2)) }),
  setTrocoTokens: (trocoTokens) => set({ trocoTokens: Number(trocoTokens) }),
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),
  setKycVerified: (kycVerified) => set({ kycVerified: Boolean(kycVerified) }),
  setTrocoPlus: (isTrocoPlus, plan = null) => set({ isTrocoPlus, trocoPlusPlan: plan }),
  setTopUpCelebration: (topUpCelebration) => set({ topUpCelebration }),

  creditBalance: (euroDelta = 0, tokensDelta = 0) => set((state) => ({
    euroBalance: Number(Math.max(0, state.euroBalance + Number(euroDelta)).toFixed(2)),
    trocoTokens: Math.max(0, state.trocoTokens + Number(tokensDelta)),
  })),

  debitBalance: (euroDelta = 0, tokensDelta = 0) => set((state) => ({
    euroBalance: Number(Math.max(0, state.euroBalance - Number(euroDelta)).toFixed(2)),
    trocoTokens: Math.max(0, state.trocoTokens - Number(tokensDelta)),
  })),
}));
