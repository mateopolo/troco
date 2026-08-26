import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Clock, Coins, Euro, ArrowRight } from 'lucide-react';

export default function CounterOfferModal({
  isOpen,
  onClose,
  onSubmit,
  initialTerms = null,
  isEditing = false,
  partnerName = 'Interlocuteur',
  listingTitle = '',
  darkMode = false,
}) {
  const [trocoTokens, setTrocoTokens] = useState('1');
  const [euroAmount, setEuroAmount] = useState('');
  const [durationType, setDurationType] = useState('hourly');
  const [durationValue, setDurationValue] = useState('1');
  const [conditions, setConditions] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialTerms) {
        setTrocoTokens(initialTerms.trocoTokens !== undefined ? String(initialTerms.trocoTokens) : '1');
        setEuroAmount(initialTerms.euroAmount !== undefined && initialTerms.euroAmount > 0 ? String(initialTerms.euroAmount) : '');
        setDurationType(initialTerms.durationType || 'hourly');
        setDurationValue(initialTerms.durationValue ? String(initialTerms.durationValue) : '1');
        setConditions(initialTerms.conditions || '');
      } else {
        setTrocoTokens('1');
        setEuroAmount('');
        setDurationType('hourly');
        setDurationValue('1');
        setConditions(listingTitle ? `Proposition pour : ${listingTitle}` : '1h d\'échange contre 1 Jeton Troco.');
      }
    }
  }, [isOpen, initialTerms, listingTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const tTokens = Number(trocoTokens) || 0;
    const euros = Number(euroAmount) || 0;
    const dVal = durationValue ? String(durationValue) : '1';
    const finalConditions = conditions.trim() || `${dVal}h d'échange pour ${tTokens > 0 ? `${tTokens} Jeton(s)` : ''} ${euros > 0 ? `${euros}€` : ''}`.trim() || 'Échange convenu.';

    onSubmit({
      trocoTokens: tTokens,
      euroAmount: euros,
      durationType,
      durationValue: dVal,
      conditions: finalConditions
    });
  };

  const modalElement = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 16px max(80px, env(safe-area-inset-bottom, 24px)) 16px',
        zIndex: 2000000,
        animation: 'fadeIn 0.2s ease-out both',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
          boxSizing: 'border-box',
        }}
      >
        {/* EN-TÊTE MODALE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-accent)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>
                {isEditing ? 'Modifier ma proposition' : 'Proposer un Deal'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Échange avec <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>{partnerName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none', background: 'var(--bg-subtle)',
              width: '34px', height: '34px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-main)', cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* DURÉE DE L'ÉCHANGE */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              <Clock size={14} color="var(--accent-primary)" />
              <span>Durée estimée de la prestation</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { type: 'hourly', label: '1h', val: '1' },
                { type: 'hourly', label: '2h', val: '2' },
                { type: 'daily', label: '1 Jour', val: '1' },
                { type: 'fixed', label: 'Forfait', val: '1' }
              ].map((item, idx) => {
                const isSel = durationType === item.type && (item.type === 'fixed' || durationValue === item.val);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDurationType(item.type);
                      setDurationValue(item.val);
                    }}
                    style={{
                      border: isSel ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSel ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      borderRadius: '12px',
                      padding: '8px 4px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RÉTRIBUTION : JETONS TROCO */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins size={14} color="var(--accent-warning)" /> Jetons Troco proposés
              </span>
              <span style={{ fontSize: '11px', color: 'var(--accent-warning)', fontWeight: '700' }}>{trocoTokens || 0} Jeton(s)</span>
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['0', '1', '2', '3', '5'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTrocoTokens(num)}
                  style={{
                    flex: 1,
                    border: trocoTokens === num ? '2px solid var(--accent-warning)' : '1px solid var(--border-color)',
                    backgroundColor: trocoTokens === num ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    color: trocoTokens === num ? 'var(--accent-warning)' : 'var(--text-secondary)',
                    borderRadius: '12px',
                    padding: '8px 0',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {num === '0' ? '0' : `🪙 ${num}`}
                </button>
              ))}
            </div>
          </div>

          {/* COMPLÉMENT FINANCIER EN EUROS (OPTIONNEL) */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Euro size={14} color="var(--accent-primary)" /> Complément en Euros (€)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700' }}>Optionnel</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="Ex : 25"
                value={euroAmount}
                onChange={(e) => setEuroAmount(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  borderRadius: '14px',
                  padding: '10px 38px 10px 14px',
                  fontSize: '14px',
                  fontWeight: '700',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--accent-primary)' }}>€</span>
            </div>
          </div>

          {/* CONDITIONS & TERMES DU DEAL */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              Conditions et détails de l'accord
            </label>
            <textarea
              rows={3}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Ex: Cours de violon de 1h en visio ce samedi à 14h. Partitions incluses."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                lineHeight: 1.5,
                fontWeight: '600',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* RÉSUMÉ VISUEL DU DEAL */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
            padding: '10px 14px', borderRadius: '14px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Récapitulatif :</span>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-card)', padding: '3px 8px', borderRadius: '999px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
              ⏱️ {durationType === 'hourly' ? `${durationValue}h` : durationType === 'daily' ? `${durationValue}j` : 'Forfait'}
            </span>
            {Number(trocoTokens) > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-card)', padding: '3px 8px', borderRadius: '999px', color: 'var(--accent-warning)', border: '1px solid var(--border-color)' }}>
                🪙 {trocoTokens} Jeton(s)
              </span>
            )}
            {Number(euroAmount) > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-card)', padding: '3px 8px', borderRadius: '999px', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                💶 {euroAmount}€
              </span>
            )}
            {Number(trocoTokens) === 0 && Number(euroAmount) === 0 && (
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--bg-card)', padding: '3px 8px', borderRadius: '999px', color: 'var(--accent-success)', border: '1px solid var(--border-color)' }}>
                🤝 Troc direct
              </span>
            )}
          </div>

          {/* BOUTONS D'ACTION */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                flex: 1,
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="premium-button"
              style={{
                flex: 2,
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFF',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-accent)'
              }}
            >
              <span>{isEditing ? 'Mettre à jour' : 'Envoyer la proposition'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}


