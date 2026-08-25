import React, { useState } from 'react';
import { X, Users, Sparkles, Plus, Check, Coins } from 'lucide-react';

const SUGGESTED_MEMBERS = [
  { name: 'Marie D.', role: 'Architecture & Design', avatar: 'M' },
  { name: 'Lucas M.', role: 'Dev Full-Stack', avatar: 'L' },
  { name: 'Sophie H.', role: 'Coordination & Événementiel', avatar: 'S' },
  { name: 'Ji-Yeon P.', role: 'Design Graphique & UI', avatar: 'J' },
  { name: 'Alex K.', role: 'Menuiserie & Bricolage', avatar: 'A' },
  { name: 'Elena V.', role: 'Traduction & Rédaction', avatar: 'E' },
];

export default function CreateProjectGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  profile,
  currentLang = 'FR',
}) {
  const [projectTitle, setProjectTitle] = useState('');
  const [projectCategory, setProjectCategory] = useState('Projet Collaboratif');
  const [description, setDescription] = useState('');
  const [rewardPool, setRewardPool] = useState('15');
  const [selectedMembers, setSelectedMembers] = useState(['Marie D.', 'Lucas M.']);
  const [customMemberInput, setCustomMemberInput] = useState('');
  const [rewardStrategy, setRewardStrategy] = useState('task'); // 'task' | 'hourly' | 'fixed'

  if (!isOpen) return null;

  const toggleMember = (memberName) => {
    setSelectedMembers(prev =>
      prev.includes(memberName)
        ? prev.filter(m => m !== memberName)
        : [...prev, memberName]
    );
  };

  const handleAddCustomMember = () => {
    const trimmed = customMemberInput.trim();
    if (!trimmed || selectedMembers.includes(trimmed)) return;
    setSelectedMembers(prev => [...prev, trimmed]);
    setCustomMemberInput('');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const title = projectTitle.trim() || 'Nouveau Projet Collaboratif';
    const myName = profile?.name || 'Moi';
    const allParticipants = Array.from(new Set([myName, ...selectedMembers]));

    onCreateGroup({
      projectTitle: title,
      category: projectCategory,
      description: description.trim(),
      rewardPool: parseFloat(rewardPool) || 0,
      rewardStrategy,
      participants: allParticipants,
      members: allParticipants.map(name => ({
        name,
        role: name === myName ? 'Initiateur / Leader' : 'Contributeur Projet',
        tokensEarned: 0,
      })),
    });

    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 10000030,
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-modal)',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
            <Users size={20} color="var(--accent-primary)" />
            <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '19px', fontWeight: '700', color: 'var(--text-main)' }}>
              {currentLang === 'FR' ? 'Créer un Hub de Projet' : 'Create Project Hub'}
            </h3>
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

        {/* BODY */}
        <form onSubmit={handleCreate} style={{
          padding: '20px 22px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* TITRE DU PROJET */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Nom du Projet ou de la Mission *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 🚀 Rénovation Tiers-Lieu, 🎨 Refonte Logo & Web..."
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* CATÉGORIE DU PROJET */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Catégorie / Thématique
            </label>
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: '700',
                outline: 'none',
              }}
            >
              <option value="Projet Collaboratif">🤝 Projet Collaboratif Général</option>
              <option value="Atelier & Chantier Solidaire">🛠️ Atelier & Chantier Solidaire</option>
              <option value="Création Numérique & Web">💻 Création Numérique & Web</option>
              <option value="Design & Identité Visuelle">🎨 Design & Identité Visuelle</option>
              <option value="Événementiel & Culture">🎭 Événementiel & Culture</option>
              <option value="Écologie & Jardin Partagé">🌱 Écologie & Jardin Partagé</option>
            </select>
          </div>

          {/* OBJECTIF / DESCRIPTION */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Objectif du projet (Optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Décris brièvement les livrables et la dynamique collective..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '12px',
                resize: 'none',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* RÉSERVE DE JETONS TROCO & MODALITÉ DE RÉTRIBUTION */}
          <div style={{
            padding: '14px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                <Coins size={15} />
                Réserve Globale de Jetons Troco
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={rewardPool}
                  onChange={(e) => setRewardPool(e.target.value)}
                  style={{
                    width: '64px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: '800',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Jetons</span>
              </div>
            </div>

            {/* TYPE DE RÉTRIBUTION PAR DÉFAUT */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Modalité de répartition privilégiée :
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { key: 'task', label: '📌 Par tâche' },
                  { key: 'hourly', label: '⏱️ Par heure' },
                  { key: 'fixed', label: '💼 Au forfait' },
                ].map(strat => (
                  <button
                    key={strat.key}
                    type="button"
                    onClick={() => setRewardStrategy(strat.key)}
                    className="premium-button"
                    style={{
                      padding: '7px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: rewardStrategy === strat.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                      color: rewardStrategy === strat.key ? '#FFFFFF' : 'var(--text-main)',
                    }}
                  >
                    {strat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SÉLECTION DES MEMBRES */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                Membres de l'équipe ({selectedMembers.length + 1})
              </label>
              <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: '700' }}>
                Vous êtes inclus (Leader)
              </span>
            </div>

            {/* SUGGESTIONS DE CONTACTS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {SUGGESTED_MEMBERS.map(mem => {
                const isSelected = selectedMembers.includes(mem.name);
                return (
                  <button
                    key={mem.name}
                    type="button"
                    onClick={() => toggleMember(mem.name)}
                    className="premium-button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 11px',
                      borderRadius: '999px',
                      border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: isSelected ? '800' : '600',
                      cursor: 'pointer',
                    }}
                  >
                    {isSelected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                    {mem.name}
                  </button>
                );
              })}
            </div>

            {/* AJOUTER UN MEMBRE SUR-MESURE */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Ajouter un pseudo ou prénom..."
                value={customMemberInput}
                onChange={(e) => setCustomMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomMember();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomMember}
                className="premium-button"
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-color)',
          }}>
            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                borderRadius: '12px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="premium-button"
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFFFFF',
                borderRadius: '12px',
                padding: '9px 20px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              <Sparkles size={14} /> Créer le Hub de Projet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
