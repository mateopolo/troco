import React, { useState, useEffect } from 'react';
import { Sparkles, Dices, Eye, Check, Palette, Glasses } from 'lucide-react';
import { motion } from 'framer-motion';

const SKIN_TONES = [
  { id: 'edb98a', label: 'Claire', color: '#edb98a' },
  { id: 'f8d25c', label: 'Dorée', color: '#f8d25c' },
  { id: 'd08b5b', label: 'Mousse', color: '#d08b5b' },
  { id: 'ae5d29', label: 'Hâlée', color: '#ae5d29' },
  { id: '614335', label: 'Ébène', color: '#614335' },
];

const HAIR_COLORS = [
  { id: '2c1b18', label: 'Noir', color: '#2c1b18' },
  { id: '4a312c', label: 'Brun', color: '#4a312c' },
  { id: '724133', label: 'Châtain', color: '#724133' },
  { id: 'a55728', label: 'Roux', color: '#a55728' },
  { id: 'd6b370', label: 'Blond', color: '#d6b370' },
  { id: 'e8e1e1', label: 'Argent', color: '#e8e1e1' },
];

const HAIR_STYLES = [
  { id: 'shortFlat', label: 'Court Classique' },
  { id: 'shortCurly', label: 'Court Bouclé' },
  { id: 'theCaesar', label: 'Dégradé' },
  { id: 'shavedSides', label: 'Côtés Rasés' },
  { id: 'curly', label: 'Boucles Libres' },
  { id: 'dreads', label: 'Dreadlocks' },
  { id: 'fro', label: 'Afro Volumineux' },
  { id: 'froBand', label: 'Afro & Bandeau' },
  { id: 'bob', label: 'Carré Moderne' },
  { id: 'curvy', label: 'Ondulations' },
  { id: 'straight02', label: 'Lisse Mi-Long' },
  { id: 'longButNotTooLong', label: 'Long Naturel' },
  { id: 'hijab', label: 'Hijab' },
  { id: 'bun', label: 'Chignon Haut' },
];

const INCLUSIVE_PRESETS = [
  { name: 'Fatou', skin: '614335', hair: '2c1b18', top: 'froBand', glasses: true, beard: false },
  { name: 'Liam', skin: 'edb98a', hair: '4a312c', top: 'shortFlat', glasses: true, beard: false },
  { name: 'Mei', skin: 'f8d25c', hair: '2c1b18', top: 'straight02', glasses: false, beard: false },
  { name: 'Carlos', skin: 'ae5d29', hair: '2c1b18', top: 'theCaesar', glasses: false, beard: true },
  { name: 'Amina', skin: '614335', hair: '2c1b18', top: 'dreads', glasses: false, beard: false },
  { name: 'Sophie', skin: 'edb98a', hair: 'd6b370', top: 'bob', glasses: true, beard: false },
  { name: 'Malik', skin: '614335', hair: '2c1b18', top: 'shavedSides', glasses: false, beard: true },
  { name: 'Zainab', skin: 'd08b5b', hair: '2c1b18', top: 'hijab', glasses: false, beard: false },
];

export default function InclusiveAvatarBuilder({ currentAvatar, onSelectAvatar, initialName = 'Membre' }) {
  const [seed, setSeed] = useState(() => initialName.trim().replace(/\s+/g, '') || 'TrocoUser');
  const [skinColor, setSkinColor] = useState('d08b5b');
  const [hairColor, setHairColor] = useState('2c1b18');
  const [top, setTop] = useState('curly');
  const [hasGlasses, setHasGlasses] = useState(false);
  const [hasBeard, setHasBeard] = useState(false);

  const generateUrl = (s, sk, hc, tp, gl, brd) => {
    const accProb = gl ? 100 : 0;
    const beardProb = brd ? 100 : 0;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s)}&skinColor=${sk}&hairColor=${hc}&top=${tp}&accessoriesProbability=${accProb}&facialHairProbability=${beardProb}`;
  };

  const currentGeneratedUrl = generateUrl(seed, skinColor, hairColor, top, hasGlasses, hasBeard);

  useEffect(() => {
    if (onSelectAvatar) {
      onSelectAvatar(currentGeneratedUrl);
    }
  }, [seed, skinColor, hairColor, top, hasGlasses, hasBeard]);

  const handleRandomize = () => {
    const randomSeeds = ['Alex', 'Jordan', 'Maya', 'Kofi', 'Elena', 'Tariq', 'Chloe', 'Noah', 'Sora', 'Camille'];
    const newSeed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)] + Math.floor(Math.random() * 1000);
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomHair = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomTop = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id;
    const randomGlasses = Math.random() > 0.6;
    const randomBeard = Math.random() > 0.7;

    setSeed(newSeed);
    setSkinColor(randomSkin);
    setHairColor(randomHair);
    setTop(randomTop);
    setHasGlasses(randomGlasses);
    setHasBeard(randomBeard);
  };

  const handleApplyPreset = (preset) => {
    setSeed(preset.name);
    setSkinColor(preset.skin);
    setHairColor(preset.hair);
    setTop(preset.top);
    setHasGlasses(preset.glasses);
    setHasBeard(preset.beard);
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-subtle, #F7F5F0)',
      borderRadius: '20px',
      padding: '16px 18px',
      border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* EN-TÊTE DU CONSTRUCTEUR D'AVATARS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            backgroundColor: 'var(--accent-primary, #C67D5B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF'
          }}>
            <Sparkles size={16} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main, #1F2937)' }}>
            Studio d'Avatars Inclusifs & Dynamiques
          </span>
        </div>

        <button
          type="button"
          onClick={handleRandomize}
          className="premium-button"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '10px',
            border: '1px solid var(--accent-primary, #C67D5B)',
            backgroundColor: 'transparent', color: 'var(--accent-primary, #C67D5B)',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer'
          }}
        >
          <Dices size={15} />
          <span>Générer au hasard</span>
        </button>
      </div>

      {/* ZONE D'APERÇU EN DIRECT + PRESETS RAPIDES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{
          width: '76px', height: '76px', borderRadius: '50%',
          overflow: 'hidden', border: '3px solid var(--accent-primary, #C67D5B)',
          boxShadow: '0 4px 14px rgba(198, 125, 91, 0.25)',
          backgroundColor: '#FFFFFF', flexShrink: 0
        }}>
          <img
            src={currentGeneratedUrl}
            alt="Aperçu Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase' }}>
            Inspirations & Modèles Inclusifs
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {INCLUSIVE_PRESETS.map((p) => {
              const pUrl = generateUrl(p.name, p.skin, p.hair, p.top, p.glasses, p.beard);
              const isSelected = p.skin === skinColor && p.top === top && p.hair === hairColor && p.glasses === hasGlasses;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    padding: 0, border: isSelected ? '2.5px solid var(--accent-primary, #C67D5B)' : '1.5px solid transparent',
                    background: '#FFFFFF', cursor: 'pointer',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.15s ease'
                  }}
                  title={p.name}
                >
                  <img src={pUrl} alt={p.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTRÔLES PERSONNALISABLES (TEINTE, COIFFURE, ACCESSOIRES) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        {/* CARNATION / TEINTE DE PEAU */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #6B7280)', display: 'block', marginBottom: '6px' }}>
            Teinte de peau
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {SKIN_TONES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSkinColor(st.id)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: st.color,
                  border: skinColor === st.id ? '2.5px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  transform: skinColor === st.id ? 'scale(1.15)' : 'scale(1)',
                }}
                title={st.label}
              />
            ))}
          </div>
        </div>

        {/* COULEUR DES CHEVEUX */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #6B7280)', display: 'block', marginBottom: '6px' }}>
            Couleur cheveux
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {HAIR_COLORS.map((hc) => (
              <button
                key={hc.id}
                type="button"
                onClick={() => setHairColor(hc.id)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: hc.color,
                  border: hairColor === hc.id ? '2.5px solid var(--accent-primary, #C67D5B)' : '1px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  transform: hairColor === hc.id ? 'scale(1.15)' : 'scale(1)',
                }}
                title={hc.label}
              />
            ))}
          </div>
        </div>

        {/* COIFFURE */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary, #6B7280)', display: 'block', marginBottom: '4px' }}>
            Coupe / Coiffure
          </label>
          <select
            value={top}
            onChange={(e) => setTop(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: '10px',
              border: '1px solid var(--border-color, rgba(0,0,0,0.15))',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              color: 'var(--text-main, #1F2937)',
              fontSize: '12px', fontWeight: '700', outline: 'none'
            }}
          >
            {HAIR_STYLES.map((hs) => (
              <option key={hs.id} value={hs.id}>{hs.label}</option>
            ))}
          </select>
        </div>

        {/* OPTIONS : LUNETTES ET BARBE */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setHasGlasses(prev => !prev)}
            style={{
              flex: 1, padding: '7px 8px', borderRadius: '10px',
              border: hasGlasses ? '1.5px solid var(--accent-primary, #C67D5B)' : '1px solid var(--border-color, rgba(0,0,0,0.15))',
              backgroundColor: hasGlasses ? 'rgba(198, 125, 91, 0.12)' : 'var(--bg-card, #FFFFFF)',
              color: hasGlasses ? 'var(--accent-primary, #C67D5B)' : 'var(--text-secondary, #6B7280)',
              fontSize: '11px', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            }}
          >
            👓 {hasGlasses ? 'Avec Lunettes' : 'Sans Lunettes'}
          </button>

          <button
            type="button"
            onClick={() => setHasBeard(prev => !prev)}
            style={{
              flex: 1, padding: '7px 8px', borderRadius: '10px',
              border: hasBeard ? '1.5px solid var(--accent-primary, #C67D5B)' : '1px solid var(--border-color, rgba(0,0,0,0.15))',
              backgroundColor: hasBeard ? 'rgba(198, 125, 91, 0.12)' : 'var(--bg-card, #FFFFFF)',
              color: hasBeard ? 'var(--accent-primary, #C67D5B)' : 'var(--text-secondary, #6B7280)',
              fontSize: '11px', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            }}
          >
            🧔 {hasBeard ? 'Avec Barbe' : 'Sans Barbe'}
          </button>
        </div>
      </div>
    </div>
  );
}