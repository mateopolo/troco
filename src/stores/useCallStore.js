import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * État initial des appels WebRTC.
 * CRITIQUE : toutes ces valeurs DOIVENT impérativement revenir à false/null/0
 * à chaque rafraîchissement de la page pour éviter les appels fantômes (écran noir).
 */
const initialCallState = {
  isCallActive: false,
  callRoomId: null,
  isInCall: false,
  activeCall: null,
  callType: null,
  activeCallPip: false,
  callDuration: 0,
  incomingCall: null,
};

/**
 * Nettoyage défensif immédiat au chargement du module
 * pour purger tout état résiduel corrompu par d'anciennes versions de l'app.
 */
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const raw = localStorage.getItem('troco_call_store');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed?.state?.isCallActive ||
        parsed?.state?.callRoomId ||
        parsed?.state?.isInCall ||
        parsed?.state?.activeCall
      ) {
        localStorage.removeItem('troco_call_store');
      }
    }
    // Purge des clés directes obsolètes
    ['troco_active_call', 'troco_call_state', 'troco_call_room_id'].forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch (_) {}
}

export const useCallStore = create(
  persist(
    (set, get) => ({
      ...initialCallState,

      setIsCallActive: (isCallActive) => set({ isCallActive: Boolean(isCallActive) }),
      setCallRoomId: (callRoomId) => set({ callRoomId: callRoomId || null }),
      setIsInCall: (isInCall) => set({ isInCall: Boolean(isInCall) }),
      setActiveCall: (activeCall) => set({ activeCall: activeCall || null }),
      setCallType: (callType) => set({ callType: callType || null }),
      setActiveCallPip: (activeCallPip) => set({ activeCallPip: Boolean(activeCallPip) }),
      setCallDuration: (callDuration) => set({ callDuration: Number(callDuration) || 0 }),
      setIncomingCall: (incomingCall) => set({ incomingCall: incomingCall || null }),

      resetCallState: () => set({ ...initialCallState }),
    }),
    {
      name: 'troco_call_store',
      storage: createJSONStorage(() => localStorage),
      /**
       * CRITIQUE ARCHITECTURE REACT & PWA :
       * DÉSACTIVE STRICTEMENT l'enregistrement des variables éphémères d'appel
       * (isCallActive, callRoomId, isInCall, activeCall, incomingCall, activeCallPip, callDuration).
       * Ces données doivent IMPÉRATIVEMENT revenir à false/null à chaque rafraîchissement de la page.
       */
      partialize: (state) => ({
        // Aucune variable d'état d'appel n'est persistée dans le localStorage.
      }),
    }
  )
);
