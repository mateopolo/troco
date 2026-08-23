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
      zIndex: 5000,
      backgroundColor: 'var(--overlay-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '28px',
        width: '100%',
        maxWidth: '740px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* HEADER MODALE */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: 'var(--shadow-accent)',
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '-0.01em' }}>
                Historique & Factures
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Reçus conformes, TVA 20% & traçabilité de vos paiements Troco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-subtle)',
              color: 'var(--text-main)',
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
                color: 'var(--accent-primary)',
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
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: 'var(--shadow-card)',
            }}>
              {/* EN-TÊTE FACTURE */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '20px' }}>
                <div>
                  <div className="font-editorial-heading" style={{ fontSize: '26px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    TROCO<span style={{ color: 'var(--accent-primary)' }}>.</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
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
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-success)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '6px',
                  }}>
                    FACTURE ACQUITTÉE
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace' }}>
                    {selectedTransactionForInvoice.transactionId}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {new Date(selectedTransactionForInvoice.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* CLIENT */}
              <div style={{ marginBottom: '20px', fontSize: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '2px' }}>DESTINATAIRE :</div>
                <div style={{ fontWeight: '800', fontSize: '14px' }}>{currentUser?.name || 'Utilisateur Troco'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{currentUser?.email || 'compte@troco.fr'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{currentUser?.location || 'France'}</div>
              </div>

              {/* TABLEAU DES LIGNES */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 0', color: 'var(--text-secondary)', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '700' }}>Montant HT</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '700' }}>TVA (20%)</th>
                    <th style={{ padding: '10px 0', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '700' }}>Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 0' }}>
                      <strong>{selectedTransactionForInvoice.label}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Moyen de paiement : {selectedTransactionForInvoice.paymentMethod} (Réf: {selectedTransactionForInvoice.authRef})
                      </div>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{(selectedTransactionForInvoice.amountHt || (selectedTransactionForInvoice.amountTtc / 1.2)).toFixed(2)} €</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{(selectedTransactionForInvoice.tva || (selectedTransactionForInvoice.amountTtc - (selectedTransactionForInvoice.amountTtc / 1.2))).toFixed(2)} €</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '800', color: 'var(--accent-primary)' }}>{selectedTransactionForInvoice.amountTtc.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>

              {/* TOTAUX */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <div style={{ width: '220px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total HT :</span>
                    <span>{(selectedTransactionForInvoice.amountHt || (selectedTransactionForInvoice.amountTtc / 1.2)).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>TVA (20%) :</span>
                    <span>{(selectedTransactionForInvoice.tva || (selectedTransactionForInvoice.amountTtc - (selectedTransactionForInvoice.amountTtc / 1.2))).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '16px', fontWeight: '900', color: 'var(--accent-success)' }}>
                    <span>Total TTC Payé :</span>
                    <span>{selectedTransactionForInvoice.amountTtc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* MENTIONS LÉGALES */}
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>
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
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-accent)'
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
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>Solde Euros (€)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>
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
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-accent)'
                    }}
                  >
                    + Recharger
                  </button>
                )}
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-warning)', fontWeight: '700' }}>Jetons Troco (🪙)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>
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
                      background: 'linear-gradient(135deg, var(--accent-warning) 0%, var(--accent-warning) 100%)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-accent)'
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
                <Search size={16} color="var(--accent-primary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par référence, libellé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
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
                        ? 'var(--accent-primary)'
                        : 'var(--bg-subtle)',
                      color: filterType === tab.id ? '#FFF' : 'var(--text-secondary)',
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
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <FileText size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '18px', color: 'var(--text-main)' }}>Aucune transaction trouvée</div>
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
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
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
                          backgroundColor: 'var(--bg-card)',
                          color: tx.mode === 'pack-tokens' ? 'var(--accent-warning)' : tx.mode === 'boost' ? 'var(--accent-danger)' : 'var(--accent-primary)',
                          border: '1px solid var(--border-color)',
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
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace' }}>{tx.transactionId}</span>
                            <span>•</span>
                            <span>{new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '900', fontSize: '15px', color: tx.mode === 'topup-cash' ? 'var(--accent-success)' : 'var(--text-main)' }}>
                            {tx.mode === 'topup-cash' ? '+' : '-'}{tx.amountTtc?.toFixed(2)} €
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--accent-success)', fontWeight: '700' }}>
                            Acquitté
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--accent-primary)" />
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

