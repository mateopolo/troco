import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Coins, Sparkles, Plus, Award } from 'lucide-react';

export default function ProjectRewardsModal({
  isOpen,
  onClose,
  activeChat,
  onProposeReward,
  profile,
  currentLang = 'FR',
}) {
  const [beneficiary, setBeneficiary] = useState('');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardType, setRewardType] = useState('task'); // 'task' | 'hourly' | 'fixed'
  const [hoursCount, setHoursCount] = useState('3');
  const [hourlyRate, setHourlyRate] = useState('1');
  const [fixedAmount, setFixedAmount] = useState('5');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen || !activeChat) return null;

  const members = activeChat.members || (activeChat.participants || []).map(p => ({
    name: p,
    role: 'Contributeur',
    tokensEarned: 0,
  }));

  const rewardPool = Number(activeChat.rewardPool) || 15;
  const existingAllocations = activeChat.rewardAllocations || [];
  const totalAllocated = existingAllocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remainingPool = Math.max(0, rewardPool - totalAllocated);

  const calculateAmount = () => {
    if (rewardType === 'hourly') {
      return (parseFloat(hoursCount) || 0) * (parseFloat(hourlyRate) || 1);
    }
    return parseFloat(fixedAmount) || 0;
  };

  const handleSendProposal = (e) => {
    e.preventDefault();
    const amount = calculateAmount();
    if (!beneficiary || amount <= 0) return;

    if (typeof onProposeReward === 'function') {
      onProposeReward({
        id: `reward-${Date.now()}`,
        beneficiary,
        title: rewardTitle.trim() || (rewardType === 'hourly' ? `Prestation horaire (${hoursCount}h)` : 'Rétribution de tâche'),
        type: rewardType,
        hours: rewardType === 'hourly' ? parseFloat(hoursCount) : null,
        amount,
        status: 'pending',
        proposedBy: profile?.name || 'Initiateur',
        createdAt: new Date(),
      });
    }

    setShowAddForm(false);
    setRewardTitle('');
    onClose?.();
  };

  if (!isOpen || !activeChat) return null;
  if (typeof document === 'undefined') return null;

  const modalElement = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm touch-none"
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
        zIndex: 999999,
        animation: 'fadeIn 0.25s ease',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-modal)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: 'min(calc(100dvh - 100px), 740px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={20} color="var(--accent-primary)" />
            <div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
                {activeChat.projectTitle || activeChat.user || 'Hub de Collaboration'}
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                Gestion de l'équipe et rétribution en jetons Troco
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-subtle)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* STATS DE LA CAGNOTTE */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
          }}>
            <div style={{
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block' }}>RÉSERVE TOTALE</span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-primary)' }}>{rewardPool} 💎</span>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block' }}>ATTRIBUÉS</span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>{totalAllocated} 💎</span>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block' }}>DISPONIBLES</span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-success)' }}>{remainingPool} 💎</span>
            </div>
          </div>

          {/* LISTE DES MEMBRES */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                Membres du Collectif ({members.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(prev => !prev)}
                className="premium-button"
                style={{
                  border: 'none',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--accent-primary)',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {showAddForm ? <X size={12} /> : <Plus size={12} />} {showAddForm ? 'Fermer' : 'Nouvelle rétribution'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {members.map((mem, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '13px',
                    }}>
                      {mem.name ? mem.name[0] : 'M'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {mem.name} {mem.name === profile?.name && '(Vous)'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        {mem.role || 'Contributeur'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--accent-primary)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}>
                      {mem.tokensEarned || 0} Jetons reçus
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORMULAIRE D'ATTRIBUTION DE JETONS */}
          {showAddForm && (
            <form onSubmit={handleSendProposal} style={{
              padding: '16px',
              borderRadius: '18px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid var(--accent-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                <Award size={16} /> Proposer une Rétribution en Jetons
              </div>

              {/* BÉNÉFICIAIRE */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Membre Bénéficiaire
                </label>
                <select
                  value={beneficiary || members[0]?.name || ''}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: '700',
                    outline: 'none',
                  }}
                >
                  {members.map((m, i) => (
                    <option key={i} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* MOTIF / MISSION */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Intitulé de la mission ou tâche
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rédaction cahier des charges, Animation 3h atelier..."
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* MODE DE CALCUL */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Mode de calcul
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {[
                    { key: 'task', label: '📌 Par tâche' },
                    { key: 'hourly', label: '⏱️ Par heure' },
                    { key: 'fixed', label: '💼 Au forfait' },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRewardType(item.key)}
                      className="premium-button"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        border: '1px solid var(--border-color)',
                        backgroundColor: rewardType === item.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                        color: rewardType === item.key ? '#FFFFFF' : 'var(--text-main)',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CHAMPS SELON MODE */}
              {rewardType === 'hourly' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      Nombre d'heures
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={hoursCount}
                      onChange={(e) => setHoursCount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      Jetons / heure
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                    Montant de la rétribution (Jetons Troco)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* TOTAL & SOUMISSION */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Total proposé : <span style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>{calculateAmount()} Jetons</span>
                </div>
                <button
                  type="submit"
                  className="premium-button"
                  style={{
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Sparkles size={13} /> Proposer au Groupe
                </button>
              </div>
            </form>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '14px 22px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
        }}>
          <button
            type="button"
            onClick={onClose}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}

