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
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '740px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: darkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(96,165,250,0.15)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
        color: darkMode ? '#F8FAFC' : '#0F172A',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* HEADER MODALE */}
        <div style={{
          padding: '20px 24px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #04265A, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Historique & Factures
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                Reçus conformes, TVA 20% & traçabilité de vos paiements Troco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: darkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
              color: darkMode ? '#94A3B8' : '#64748B',
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
                color: darkMode ? '#60A5FA' : '#04265A',
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
              backgroundColor: darkMode ? '#0F172A' : '#FFF',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
            }}>
              {/* EN-TÊTE FACTURE */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', paddingBottom: '18px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#04265A', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    TROCO<span style={{ color: '#3B82F6' }}>.</span>
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
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
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    marginBottom: '6px',
                  }}>
                    FACTURE ACQUITTÉE
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace' }}>
                    {selectedTransactionForInvoice.transactionId}
                  </div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                    {new Date(selectedTransactionForInvoice.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* CLIENT */}
              <div style={{ marginBottom: '20px', fontSize: '12px' }}>
                <div style={{ color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700', marginBottom: '2px' }}>DESTINATAIRE :</div>
                <div style={{ fontWeight: '800', fontSize: '14px' }}>{currentUser?.name || 'Utilisateur Troco'}</div>
                <div style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>{currentUser?.email || 'compte@troco.fr'}</div>
                <div style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>{currentUser?.location || 'France'}</div>
              </div>

              {/* TABLEAU DES LIGNES */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 0', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700' }}>Montant HT</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700' }}>TVA (20%)</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700' }}>Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 0' }}>
                      <strong>{selectedTransactionForInvoice.label}</strong>
                      <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                        Moyen de paiement : {selectedTransactionForInvoice.paymentMethod} (Réf: {selectedTransactionForInvoice.authRef})
                      </div>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{(selectedTransactionForInvoice.amountHt || (selectedTransactionForInvoice.amountTtc / 1.2)).toFixed(2)} €</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{(selectedTransactionForInvoice.tva || (selectedTransactionForInvoice.amountTtc - (selectedTransactionForInvoice.amountTtc / 1.2))).toFixed(2)} €</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '800' }}>{selectedTransactionForInvoice.amountTtc.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>

              {/* TOTAUX */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <div style={{ width: '220px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>Total HT :</span>
                    <span>{(selectedTransactionForInvoice.amountHt || (selectedTransactionForInvoice.amountTtc / 1.2)).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: darkMode ? '#94A3B8' : '#64748B' }}>TVA (20%) :</span>
                    <span>{(selectedTransactionForInvoice.tva || (selectedTransactionForInvoice.amountTtc - (selectedTransactionForInvoice.amountTtc / 1.2))).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', fontSize: '16px', fontWeight: '900', color: '#10B981' }}>
                    <span>Total TTC Payé :</span>
                    <span>{selectedTransactionForInvoice.amountTtc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* MENTIONS LÉGALES */}
              <div style={{ fontSize: '10px', color: darkMode ? '#64748B' : '#94A3B8', borderTop: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9', paddingTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>
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
                  backgroundColor: '#04265A',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
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
                backgroundColor: darkMode ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
                border: darkMode ? '1px solid rgba(59,130,246,0.25)' : '1px solid #DBEAFE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#93C5FD' : '#1E40AF', fontWeight: '700' }}>Solde Euros (€)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: darkMode ? '#FFF' : '#04265A' }}>
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
                      backgroundColor: '#04265A',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    + Recharger
                  </button>
                )}
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
                border: darkMode ? '1px solid rgba(245,158,11,0.25)' : '1px solid #FDE68A',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: darkMode ? '#FCD34D' : '#92400E', fontWeight: '700' }}>Jetons Troco (🪙)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: darkMode ? '#FFF' : '#78350F' }}>
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
                      backgroundColor: '#D97706',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
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
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par référence, libellé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '12px',
                    border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #D1D5DB',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#FFF',
                    color: darkMode ? '#FFF' : '#0F172A',
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
                        ? (darkMode ? '#3B82F6' : '#04265A')
                        : (darkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                      color: filterType === tab.id ? '#FFF' : (darkMode ? '#94A3B8' : '#64748B'),
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
              <div style={{ textAlign: 'center', padding: '40px 20px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                <FileText size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontWeight: '700', fontSize: '15px', color: darkMode ? '#FFF' : '#0F172A' }}>Aucune transaction trouvée</div>
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
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? 'rgba(59,130,246,0.1)' : '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          backgroundColor: tx.mode === 'pack-tokens' ? '#FEF3C7' : tx.mode === 'boost' ? '#FEE2E2' : '#EFF6FF',
                          color: tx.mode === 'pack-tokens' ? '#D97706' : tx.mode === 'boost' ? '#DC2626' : '#2563EB',
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
                          <div style={{ fontWeight: '800', fontSize: '13px' }}>{tx.label}</div>
                          <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace' }}>{tx.transactionId}</span>
                            <span>•</span>
                            <span>{new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '900', fontSize: '15px', color: tx.mode === 'topup-cash' ? '#10B981' : (darkMode ? '#F8FAFC' : '#0F172A') }}>
                            {tx.mode === 'topup-cash' ? '+' : '-'}{tx.amountTtc?.toFixed(2)} €
                          </div>
                          <div style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>
                            Acquitté
                          </div>
                        </div>
                        <ChevronRight size={16} color={darkMode ? '#64748B' : '#94A3B8'} />
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
