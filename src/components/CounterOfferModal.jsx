import React, { useState, useEffect } from 'react';
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(61, 53, 48, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
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
              background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
              color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(198, 125, 91, 0.3)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                {isEditing ? 'Modifier ma proposition' : 'Proposer un Deal'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '600' }}>
                Échange avec <span style={{ color: '#C67D5B', fontWeight: '800' }}>{partnerName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : '#E8DDD3',
              width: '34px', height: '34px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: darkMode ? '#FFF' : '#3D3530', cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* DURÉE DE L'ÉCHANGE */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '8px' }}>
              <Clock size={14} color="#C67D5B" />
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
                      border: isSel ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                      backgroundColor: isSel ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#F5F0E8'),
                      color: isSel ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
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
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins size={14} color="#F59E0B" /> Jetons Troco proposés
              </span>
              <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '700' }}>{trocoTokens || 0} Jeton(s)</span>
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['0', '1', '2', '3', '5'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTrocoTokens(num)}
                  style={{
                    flex: 1,
                    border: trocoTokens === num ? '2px solid #F59E0B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                    backgroundColor: trocoTokens === num ? (darkMode ? 'rgba(245,158,11,0.25)' : '#FEF3C7') : (darkMode ? '#1A1715' : '#F5F0E8'),
                    color: trocoTokens === num ? (darkMode ? '#FDE68A' : '#B45309') : (darkMode ? '#D4C5B5' : '#6B5E54'),
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
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Euro size={14} color="#C67D5B" /> Complément en Euros (€)
              </span>
              <span style={{ fontSize: '11px', color: '#A8644A', fontWeight: '700' }}>Optionnel</span>
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
                  border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  borderRadius: '14px',
                  padding: '10px 38px 10px 14px',
                  fontSize: '14px',
                  fontWeight: '700',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#C67D5B' }}>€</span>
            </div>
          </div>

          {/* CONDITIONS & TERMES DU DEAL */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '8px' }}>
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
                border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                color: darkMode ? '#FAF7F2' : '#3D3530',
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
            backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
            border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Récapitulatif :</span>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', padding: '3px 8px', borderRadius: '999px', color: darkMode ? '#FAF7F2' : '#3D3530', border: '1px solid #E8DDD3' }}>
              ⏱️ {durationType === 'hourly' ? `${durationValue}h` : durationType === 'daily' ? `${durationValue}j` : 'Forfait'}
            </span>
            {Number(trocoTokens) > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', padding: '3px 8px', borderRadius: '999px', color: '#D97706', border: '1px solid #FDE68A' }}>
                🪙 {trocoTokens} Jeton(s)
              </span>
            )}
            {Number(euroAmount) > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', padding: '3px 8px', borderRadius: '999px', color: '#C67D5B', border: '1px solid #F5EAE4' }}>
                💶 {euroAmount}€
              </span>
            )}
            {Number(trocoTokens) === 0 && Number(euroAmount) === 0 && (
              <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', padding: '3px 8px', borderRadius: '999px', color: '#3D4A35', border: '1px solid #D4DFCE' }}>
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
                border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3',
                borderRadius: '14px',
                padding: '12px',
                backgroundColor: 'transparent',
                color: darkMode ? '#D4C5B5' : '#6B5E54',
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
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 6px 20px rgba(198,125,91,0.35)'
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
}
