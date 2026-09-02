import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
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
  if (!isPaymentModalOpen && !isTransactionsModalOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[999999] pointer-events-none">
      {isPaymentModalOpen && (
        <div className="pointer-events-auto">
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
        </div>
      )}

      {isTransactionsModalOpen && (
        <div className="pointer-events-auto">
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
        </div>
      )}
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}

export default PaymentFeature;
