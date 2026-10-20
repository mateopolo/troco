import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * Tarification standard Troco pour les appels visio et audio :
 * 1 heure de partage / visio = 1 Jeton Troco (60 minutes = 1 token).
 * Au prorata par minute ou par tranche minimale d'heure commencée.
 */
export const DEFAULT_HOURLY_RATE_TOKENS = 1;
export const DEFAULT_MIN_SETTLEMENT_SECONDS = 5;

/**
 * Formate une durée en secondes sous forme lisible :
 * - HH:MM:SS si >= 3600s
 * - MM:SS si < 3600s
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatCallTimer = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calcule le coût d'un appel en jetons Troco :
 * - Règle de base : 1 heure = 1 Jeton Troco.
 * - Minimum 1 jeton dès qu'une session a eu lieu, puis par tranches horaires (ou au prorata).
 *
 * @param {number} durationSeconds - Durée de l'appel en secondes
 * @param {number} hourlyRate - Taux horaire en jetons (défaut: 1)
 * @returns {number}
 */
export const calculateCallCost = (durationSeconds = 0, hourlyRate = DEFAULT_HOURLY_RATE_TOKENS) => {
  const s = Math.max(0, Math.floor(Number(durationSeconds) || 0));
  if (s <= 0) return 0;
  // Tranche minimale de 1 jeton (1h = 1 jeton), puis calcul arrondi au supérieur par heure
  const hours = Math.ceil(s / 3600);
  return Math.max(1, hours * hourlyRate);
};

/**
 * useCallTimer - Hook personnalisé encapsulant la gestion du chronomètre d'appel WebRTC :
 * - Déclenchement automatique dès que l'appel devient actif (non-ringing)
 * - Incrémentation seconde par seconde du temps écoulé
 * - Calcul dynamique de la tarification (callCost en Jetons Troco)
 * - Mémorisation de la durée finale pour la modale de bilan visio (VisioSettlementModal)
 * - Déclenchement conditionnel de la modale de règlement si durée > 5 secondes
 * - Réinitialisation propre à la fin de l'appel et fermeture du mode PiP
 *
 * @param {Object} options
 * @param {Object} options.callState - État de l'appel ({ active: boolean, ringing: boolean })
 * @param {Function} [options.setIsCallPip] - Setter pour désactiver le Picture-in-Picture à la fin de l'appel
 * @param {number} [options.minSettlementDuration=5] - Durée minimale en secondes pour ouvrir le bilan
 * @param {number} [options.hourlyRate=1] - Tarif en jetons par heure
 * @param {Function} [options.onCallEnd] - Callback optionnel notifié à l'arrêt avec la durée finale
 */
export const useCallTimer = ({
  callState = {},
  setIsCallPip = null,
  minSettlementDuration = DEFAULT_MIN_SETTLEMENT_SECONDS,
  hourlyRate = DEFAULT_HOURLY_RATE_TOKENS,
  onCallEnd = null,
} = {}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [settlementCallDuration, setSettlementCallDuration] = useState(0);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  const prevActiveRef = useRef(false);
  const durationRef = useRef(0);

  // Synchronisation continue de la référence de durée pour éviter tout stale closure
  useEffect(() => {
    durationRef.current = callDuration;
  }, [callDuration]);

  // Chronomètre de Deal en temps réel pendant l'appel actif
  useEffect(() => {
    let intervalId = null;
    const isCallActive = Boolean(callState?.active && !callState?.ringing);

    if (isCallActive) {
      intervalId = setInterval(() => {
        setCallDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
      prevActiveRef.current = true;
    } else {
      const finalDuration = durationRef.current;
      // Si l'appel vient de se terminer et a duré plus que le seuil minimum (5s)
      if (prevActiveRef.current && finalDuration > minSettlementDuration) {
        setSettlementCallDuration(finalDuration);
        setIsSettlementModalOpen(true);
        if (typeof onCallEnd === 'function') {
          try {
            onCallEnd(finalDuration);
          } catch (_) {}
        }
      }
      prevActiveRef.current = false;
      setCallDuration(0);
      durationRef.current = 0;
      if (typeof setIsCallPip === 'function') {
        setIsCallPip(false);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [callState?.active, callState?.ringing, minSettlementDuration, setIsCallPip, onCallEnd]);

  // Coût en jetons calculé pour la durée actuelle ou la durée de bilan
  const callCost = useMemo(() => {
    const effectiveSeconds = settlementCallDuration || callDuration;
    return calculateCallCost(effectiveSeconds, hourlyRate);
  }, [settlementCallDuration, callDuration, hourlyRate]);

  // Durée formatée
  const formattedCallDuration = useMemo(() => {
    return formatCallTimer(callDuration);
  }, [callDuration]);

  const formattedSettlementDuration = useMemo(() => {
    return formatCallTimer(settlementCallDuration);
  }, [settlementCallDuration]);

  const resetTimer = useCallback(() => {
    setCallDuration(0);
    durationRef.current = 0;
    setSettlementCallDuration(0);
    setIsSettlementModalOpen(false);
  }, []);

  const openSettlementModal = useCallback((customDuration = null) => {
    if (typeof customDuration === 'number') {
      setSettlementCallDuration(customDuration);
    }
    setIsSettlementModalOpen(true);
  }, []);

  const closeSettlementModal = useCallback(() => {
    setIsSettlementModalOpen(false);
  }, []);

  return {
    callDuration,
    setCallDuration,
    settlementCallDuration,
    setSettlementCallDuration,
    isSettlementModalOpen,
    setIsSettlementModalOpen,
    callCost,
    formatCallTimer,
    formattedCallDuration,
    formattedSettlementDuration,
    resetTimer,
    openSettlementModal,
    closeSettlementModal,
  };
};

export default useCallTimer;
