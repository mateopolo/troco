import React, { useState } from 'react';
import {
  FileText, Coins, ArrowUpRight, ArrowDownLeft,
  X, Printer, ShieldCheck, Search,
  Sparkles, ChevronRight, ArrowLeft
} from 'lucide-react';

export default function TransactionsHistoryModal({
  isOpen,
  onClose,
  darkMode = false,
  currentUser = null,
  transactions = [],
  onOpenPaymentModal = null,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'tokens' | 'cash' | 'boost' | 'deal' | 'caution'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactionForInvoice, setSelectedTransactionForInvoice] = useState(null);

  if (!isOpen) return null;

  // Filtrage des transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery.trim() ||
      (tx.transactionId && tx.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.label && tx.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterType === 'all' ||
      (filterType === 'tokens' && tx.mode === 'pack-tokens') ||
      (filterType === 'cash' && tx.mode === 'topup-cash') ||
      (filterType === 'boost' && tx.mode === 'boost') ||
      (filterType === 'deal' && tx.mode === 'deal') ||
      (filterType === 'caution' && tx.mode === 'caution');

    return matchesSearch && matchesFilter;
  });

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      backgroundColor: 'rgba(61, 53, 48, 0.72)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '740px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: darkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(198,125,91,0.15)' : '0 25px 50px -12px rgba(61, 53, 48, 0.25)',
        border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* HEADER MODALE */}
        <div style={{
          padding: '20px 24px',
          borderBottom: darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid #E8DDD3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #C67D5B, #A8644A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(198,125,91,0.3)',
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em' }}>
                Historique & Factures
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                Reçus conformes, TVA 20% & traçabilité de vos paiements Troco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
              color: darkMode ? '#FAF7F2' : '#3D3530',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* VUE FACTURE DÉTAILLÉE */}
        {selectedTransactionForInvoice ? (
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <button
              onClick={() => setSelectedTransactionForInvoice(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'transparent',
                color: '#C67D5B',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '16px',
                padding: '4px 0',
              }}
            >
              <ArrowLeft size={16} /> Retour à l'historique
            </button>

            <div id="troco-printable-invoice" style={{
              backgroundColor: darkMode ? '#1A1715' : '#FFF',
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(61,53,48,0.05)',
            }}>
              {/* EN-TÊTE FACTURE */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', paddingBottom: '18px', marginBottom: '20px' }}>
                <div>
                  <div className="font-editorial-heading" style={{ fontSize: '26px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    TROCO<span style={{ color: '#C67D5B' }}>.</span>
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '4px', lineHeight: 1.4 }}>
                    Troco SAS • Plateforme d'échange de services<br />
                    75008 Paris, France • SIREN: 912 345 678<br />
                    TVA intracommunautaire : FR89912345678
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6',
                    color: '#3D4A35',
                    marginBottom: '6px',
                  }}>
                    FACTURE ACQUITTÉE
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace' }}>
                    {selectedTransactionForInvoice.transactionId}
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                    {new Date(selectedTransactionForInvoice.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* CLIENT */}
              <div style={{ marginBottom: '20px', fontSize: '12px' }}>
                <div style={{ color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700', marginBottom: '2px' }}>DESTINATAIRE :</div>
                <div style={{ fontWeight: '800', fontSize: '14px' }}>{currentUser?.name || 'Utilisateur Troco'}</div>
                <div style={{ color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{currentUser?.email || 'compte@troco.fr'}</div>
                <div style={{ color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{currentUser?.location || 'France'}</div>
              </div>

              {/* TABLEAU DES LIGNES */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', textAlign: 'left' }}>
                    <th style={{ padding: '10px 0', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700' }}>Montant HT</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700' }}>TVA (20%)</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700' }}>Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid #F5F0E8' }}>
                    <td style={{ padding: '12px 0' }}>
                      <strong>{selectedTransactionForInvoice.label}</strong>
                      <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                        Moyen de paiement : {selectedTransactionForInvoice.paymentMethod} (Réf: {selectedTransactionForInvoice.authRef})
                      </div>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{(selectedTransactionForInvoice.amountHt || (selectedTransactionForInvoice.amountTtc / 1.2)).toFixed(2)} €</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{(selectedTransactionForInvoice.tva || (selectedTransactionForInvoice.amountTtc - (selectedTransactionForInvoice.amountTtc / 1.2))).toFixed(2)} €</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '800', color: '#C67D5B' }}>{selectedTransactionForInvoice.amountTtc.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>

              {/* TOTAUX */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <div style={{ width: '220px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Total HT :</span>
                    <span>{(selectedTransactionForInvoice.amountHt || (selectedTransactionForInvoice.amountTtc / 1.2)).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: darkMode ? '#D4C5B5' : '#6B5E54' }}>TVA (20%) :</span>
                    <span>{(selectedTransactionForInvoice.tva || (selectedTransactionForInvoice.amountTtc - (selectedTransactionForInvoice.amountTtc / 1.2))).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', fontSize: '16px', fontWeight: '900', color: '#7A8F6A' }}>
                    <span>Total TTC Payé :</span>
                    <span>{selectedTransactionForInvoice.amountTtc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* MENTIONS LÉGALES */}
              <div style={{ fontSize: '10px', color: darkMode ? '#9A8E84' : '#6B5E54', borderTop: darkMode ? '1px solid rgba(232,221,211,0.08)' : '1px solid #E8DDD3', paddingTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>
                Facture délivrée électroniquement et archivée conformément à l'article 289 du Code Général des Impôts. Aucun escompte pour paiement anticipé.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={handlePrintInvoice}
                className="premium-button"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(198,125,91,0.25)'
                }}
              >
                <Printer size={16} /> Imprimer / Télécharger (PDF)
              </button>
            </div>
          </div>
        ) : (
          /* VUE LISTE DES TRANSACTIONS */
          <div style={{ padding: '24px', overflowY: 'auto' }}>

            {/* BARRE D'ACTIONS RAPIDES & SOLDES */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
                border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700' }}>Solde Euros (€)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                    {(currentUser?.euroBalance || 0).toFixed(2)} €
                  </div>
                </div>
                {onOpenPaymentModal && (
                  <button
                    onClick={() => onOpenPaymentModal('topup-cash')}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(198,125,91,0.25)'
                    }}
                  >
                    + Recharger
                  </button>
                )}
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(217,119,6,0.15)' : '#FFFBEB',
                border: '1px solid #E8DDD3',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#FDE68A' : '#92400E', fontWeight: '700' }}>Jetons Troco (🪙)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: darkMode ? '#FAF7F2' : '#78350F' }}>
                    {currentUser?.trocoTokens || 0} Jetons
                  </div>
                </div>
                {onOpenPaymentModal && (
                  <button
                    onClick={() => onOpenPaymentModal('pack-tokens')}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(217,119,6,0.25)'
                    }}
                  >
                    + Acheter
                  </button>
                )}
              </div>
            </div>

            {/* RECHERCHE & FILTRES */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} color="#C67D5B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par référence, libellé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '12px',
                    border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                    backgroundColor: darkMode ? '#1A1715' : '#FFF',
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: 'Tout' },
                  { id: 'tokens', label: '🪙 Jetons' },
                  { id: 'cash', label: '💳 Recharges' },
                  { id: 'boost', label: '⚡ Boosts' },
                  { id: 'deal', label: '🤝 Deals' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: filterType === tab.id
                        ? '#C67D5B'
                        : (darkMode ? '#1A1715' : '#F5F0E8'),
                      color: filterType === tab.id ? '#FFF' : (darkMode ? '#D4C5B5' : '#6B5E54'),
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTE DES TRANSACTIONS */}
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                <FileText size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '18px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Aucune transaction trouvée</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Vos recharges et achats apparaîtront ici avec leurs factures téléchargeables.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTransactions.map(tx => {
                  return (
                    <div
                      key={tx.id || tx.transactionId}
                      onClick={() => setSelectedTransactionForInvoice(tx)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                        border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          backgroundColor: tx.mode === 'pack-tokens' ? '#FEF3C7' : tx.mode === 'boost' ? '#FEE2E2' : '#F5EAE4',
                          color: tx.mode === 'pack-tokens' ? '#D97706' : tx.mode === 'boost' ? '#DC2626' : '#C67D5B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {tx.mode === 'pack-tokens' && <Coins size={18} />}
                          {tx.mode === 'topup-cash' && <ArrowDownLeft size={18} />}
                          {tx.mode === 'boost' && <Sparkles size={18} />}
                          {tx.mode === 'deal' && <ArrowUpRight size={18} />}
                          {tx.mode === 'caution' && <ShieldCheck size={18} />}
                        </div>

                        <div>
                          <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '14px' }}>{tx.label}</div>
                          <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace' }}>{tx.transactionId}</span>
                            <span>•</span>
                            <span>{new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '900', fontSize: '15px', color: tx.mode === 'topup-cash' ? '#7A8F6A' : (darkMode ? '#FAF7F2' : '#3D3530') }}>
                            {tx.mode === 'topup-cash' ? '+' : '-'}{tx.amountTtc?.toFixed(2)} €
                          </div>
                          <div style={{ fontSize: '10px', color: '#7A8F6A', fontWeight: '700' }}>
                            Acquitté
                          </div>
                        </div>
                        <ChevronRight size={16} color="#C67D5B" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
