import React from 'react';
import { FileText, ShieldCheck, Flame, Image as ImageIcon, Edit3, CheckCircle2 } from 'lucide-react';

export const generateInvoiceRef = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRK-${yyyy}${mm}-${rand}`;
};

export const calculateListingInvoice = ({
  isUrgent = false,
  photoCount = 0,
  isEditing = false,
  isEditingContentChanged = false,
}) => {
  const items = [];

  if (isUrgent) {
    items.push({
      id: 'urgent',
      label: 'Option Urgence & Boost visibilité (7 jours)',
      desc: 'Mise en avant prioritaire en tête de feed avec badge flamme',
      amount: 1.99,
      icon: 'flame',
    });
  }

  if (photoCount > 4) {
    items.push({
      id: 'photos',
      label: `Pack Photos Supplémentaires (${photoCount} photos)`,
      desc: 'Capacité étendue jusqu’à 8 photos HD',
      amount: 1.99,
      icon: 'image',
    });
  }

  if (isEditing && isEditingContentChanged) {
    items.push({
      id: 'edit',
      label: 'Frais de modification de contenu de l’annonce',
      desc: 'Réévaluation et mise à jour de la publication',
      amount: 1.99,
      icon: 'edit',
    });
  }

  const totalTTC = items.reduce((acc, item) => acc + item.amount, 0);
  const totalHT = totalTTC > 0 ? Number((totalTTC / 1.20).toFixed(2)) : 0;
  const totalTVA = totalTTC > 0 ? Number((totalTTC - totalHT).toFixed(2)) : 0;

  return {
    items,
    totalHT,
    totalTVA,
    totalTTC: Number(totalTTC.toFixed(2)),
  };
};

export default function InvoiceCalculator({
  isUrgent = false,
  photoCount = 0,
  isEditing = false,
  isEditingContentChanged = false,
  darkMode = false,
  t = (k) => k,
  currentLang = 'FR',
}) {
  const invoice = calculateListingInvoice({
    isUrgent,
    photoCount,
    isEditing,
    isEditingContentChanged,
  });

  const { items, totalHT, totalTVA, totalTTC } = invoice;

  return (
    <div style={{
      borderRadius: '20px',
      padding: '18px',
      backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.75)' : '#F8FAFC',
      border: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* HEADER FACTURE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color={darkMode ? '#60A5FA' : '#04265A'} />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A' }}>
            {currentLang === 'FR' ? 'Récapitulatif & Devis de publication' : 'Publication Quote & Summary'}
          </h4>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: '700',
          color: darkMode ? '#94A3B8' : '#64748B',
          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : '#EDF2F7',
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
          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FFFFFF' : '#111827' }}>
                {isEditing ? 'Mise à jour standard de l’annonce' : 'Publication d’annonce standard (4 photos incluses)'}
              </div>
              <div style={{ fontSize: '10px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                Diffusion illimitée sur la plateforme Troco
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#10B981' }}>
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
              backgroundColor: darkMode ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
              border: darkMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #FDE68A',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item.icon === 'flame' && <Flame size={16} color="#F59E0B" />}
              {item.icon === 'image' && <ImageIcon size={16} color="#3B82F6" />}
              {item.icon === 'edit' && <Edit3 size={16} color="#8B5CF6" />}
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
        borderTop: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
          <span>Sous-total HT :</span>
          <span>{totalHT.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
          <span>TVA (20 %) :</span>
          <span>{totalTVA.toFixed(2)} €</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: '800',
          color: darkMode ? '#FFFFFF' : '#0F172A',
          marginTop: '4px',
          paddingTop: '6px',
          borderTop: darkMode ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px dashed #CBD5E1',
        }}>
          <span>Total TTC :</span>
          <span style={{ fontSize: '16px', color: totalTTC > 0 ? (darkMode ? '#60A5FA' : '#04265A') : '#10B981' }}>
            {totalTTC > 0 ? `${totalTTC.toFixed(2)} €` : '0,00 € (Gratuit)'}
          </span>
        </div>
      </div>

      {/* NOTE DE SÉCURITÉ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: darkMode ? '#94A3B8' : '#64748B', justifyContent: 'center' }}>
        <ShieldCheck size={13} color="#10B981" /> Facture générée automatiquement et stockée dans votre profil
      </div>
    </div>
  );
}
