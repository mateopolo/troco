import React from 'react';
import { FileText, CheckCircle2, ShieldCheck, Flame, Image as ImageIcon, Edit3 } from 'lucide-react';

/**
 * Calculateur de devis et facture automatisé pour la publication et le boost d'annonces Troco.
 */
export function calculateListingInvoice({
  isUrgent = false,
  extraPhotosCount = 0,
  isEditing = false,
}) {
  const items = [];

  // Pack photos au-delà de 4 photos gratuites (+1,99€)
  if (extraPhotosCount > 0) {
    items.push({
      id: 'extra_photos',
      label: `Pack Photos Supplémentaires (+${extraPhotosCount} photo${extraPhotosCount > 1 ? 's' : ''})`,
      desc: 'Hébergement haute résolution & visibilité renforcée',
      amount: 1.99,
      icon: 'image',
    });
  }

  // Option annonce urgente / boost (+1,99€)
  if (isUrgent) {
    items.push({
      id: 'urgent_boost',
      label: 'Mise en avant Urgente (Flamme 🔥)',
      desc: 'Badge prioritaire & remontée en tête du fil pendant 7 jours',
      amount: 1.99,
      icon: 'flame',
    });
  }

  const totalTTC = items.reduce((sum, item) => sum + item.amount, 0);
  const totalHT = Number((totalTTC / 1.20).toFixed(2));
  const totalTVA = Number((totalTTC - totalHT).toFixed(2));

  return {
    items,
    totalHT,
    totalTVA,
    totalTTC: Number(totalTTC.toFixed(2)),
    hasPaidOptions: items.length > 0,
  };
}

export function generateInvoiceRef() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRC-${y}${m}${d}-${rand}`;
}

export default function InvoiceCalculator({
  isUrgent = false,
  extraPhotosCount = 0,
  isEditing = false,
  darkMode = false,
  currentLang = 'FR',
}) {
  const invoice = calculateListingInvoice({ isUrgent, extraPhotosCount, isEditing });
  const { items, totalHT, totalTVA, totalTTC } = invoice;

  return (
    <div style={{
      borderRadius: '20px',
      padding: '18px',
      backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
      border: darkMode ? '1px solid rgba(232, 221, 211, 0.15)' : '1px solid #E8DDD3',
      boxShadow: darkMode ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(61, 53, 48, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* HEADER FACTURE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#C67D5B" />
          <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            {currentLang === 'FR' ? 'Récapitulatif & Devis de publication' : 'Publication Quote & Summary'}
          </h4>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: '700',
          color: darkMode ? '#D4C5B5' : '#6B5E54',
          backgroundColor: darkMode ? 'rgba(232, 221, 211, 0.1)' : '#F5EAE4',
          padding: '3px 8px',
          borderRadius: '8px',
        }}>
          TVA 20%
        </span>
      </div>

      {/* LIGNES D'OPTIONS SÉLECTIONNÉES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Ligne publication de base (toujours gratuite) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: '12px',
          backgroundColor: darkMode ? '#231E1B' : '#FFF',
          border: darkMode ? '1px solid rgba(232, 221, 211, 0.08)' : '1px solid #E8DDD3',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#7A8F6A" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                {isEditing ? 'Mise à jour standard de l’annonce' : 'Publication d’annonce standard (4 photos incluses)'}
              </div>
              <div style={{ fontSize: '10px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                Diffusion illimitée sur la plateforme Troco
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#7A8F6A' }}>
            0,00 €
          </span>
        </div>

        {/* Options payantes activées */}
        {items.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: darkMode ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
              border: darkMode ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid #FDE68A',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item.icon === 'flame' && <Flame size={16} color="#D97706" />}
              {item.icon === 'image' && <ImageIcon size={16} color="#C67D5B" />}
              {item.icon === 'edit' && <Edit3 size={16} color="#C67D5B" />}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FDE68A' : '#92400E' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '10px', color: darkMode ? '#FCD34D' : '#B45309' }}>
                  {item.desc}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#D97706' }}>
              {item.amount.toFixed(2)} €
            </span>
          </div>
        ))}
      </div>

      {/* TABLEAU TOTAL HT / TVA / TOTAL TTC */}
      <div style={{
        marginTop: '6px',
        paddingTop: '12px',
        borderTop: darkMode ? '1px solid rgba(232, 221, 211, 0.1)' : '1px solid #E8DDD3',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
          <span>Sous-total HT :</span>
          <span>{totalHT.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
          <span>TVA (20 %) :</span>
          <span>{totalTVA.toFixed(2)} €</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: '800',
          color: darkMode ? '#FAF7F2' : '#3D3530',
          marginTop: '4px',
          paddingTop: '6px',
          borderTop: darkMode ? '1px dashed rgba(232, 221, 211, 0.15)' : '1px dashed #D4C5B5',
        }}>
          <span>Total TTC :</span>
          <span style={{ fontSize: '16px', color: totalTTC > 0 ? '#C67D5B' : '#7A8F6A' }}>
            {totalTTC > 0 ? `${totalTTC.toFixed(2)} €` : '0,00 € (Gratuit)'}
          </span>
        </div>
      </div>

      {/* NOTE DE SÉCURITÉ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: darkMode ? '#D4C5B5' : '#6B5E54', justifyContent: 'center' }}>
        <ShieldCheck size={13} color="#7A8F6A" /> Facture générée automatiquement et stockée dans votre profil
      </div>
    </div>
  );
}
