import React, { Suspense } from 'react';
import { SkeletonModalFallback } from '../../components/SkeletonLoader';

const PaymentModal = React.lazy(() => import('../../components/PaymentModal'));
const TransactionsHistoryModal = React.lazy(() => import('../../components/TransactionsHistoryModal'));

export function PaymentFeature({
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  paymentModalConfig,
  handlePaymentSuccess,
  playBetclicBalanceSound,
  playApplePaySound,
  isTransactionsModalOpen,
  setIsTransactionsModalOpen,
  userTransactions,
  handleOpenPayment,
  profile,
  darkMode,
}) {
  return (
    <>
      {isPaymentModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement du paiement sécurisé..." />}>
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            darkMode={darkMode}
            currentUser={profile}
            initialMode={paymentModalConfig.mode}
            initialPayload={paymentModalConfig.payload}
            onSuccess={handlePaymentSuccess}
            playBetclicSound={playBetclicBalanceSound}
            playApplePaySound={playApplePaySound}
          />
        </Suspense>
      )}

      {isTransactionsModalOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Chargement de l'historique des transactions..." />}>
          <TransactionsHistoryModal
            isOpen={isTransactionsModalOpen}
            onClose={() => setIsTransactionsModalOpen(false)}
            darkMode={darkMode}
            currentUser={profile}
            transactions={userTransactions}
            onOpenPaymentModal={(mode) => {
              setIsTransactionsModalOpen(false);
              handleOpenPayment(mode);
            }}
          />
        </Suspense>
      )}
    </>
  );
}

export default PaymentFeature;
