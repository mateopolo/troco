import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';

const SPONSORED_PARTNERS = [
  {
    id: 'sponsor-brico-1',
    sponsorName: 'Atelier & Outillage Pro',
    badge: '🌟 Partenaire Certifié',
    category: 'Bricolage & Équipement',
    title: 'Location & Prêt d\'outillage électroportatif pro',
    description: 'Bénéficiez de 15% de réduction et de la caution offerte sur tout l\'outillage haut de gamme certifié pour les membres Troco.',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
    perk: '-15% Code TROCO15',
    ctaText: 'Découvrir le matériel',
    author: 'Atelier Pro Partenaire',
    rating: '4.95',
    reviewsCount: 128
  },
  {
    id: 'sponsor-cowork-2',
    sponsorName: 'Espace Coworking Stillpoint',
    badge: '✨ Tiers-Lieu Partenaire',
    category: 'Espaces & Bureaux',
    title: 'Journée d\'essai offerte en espace de travail partagé',
    description: 'Accédez à des salles de réunion insonorisées, connexion fibre 1Gb/s et café de spécialité offert pour vos sessions de troc.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    perk: '1 Journée Offerte',
    ctaText: 'Réserver un pass',
    author: 'Stillpoint Hub',
    rating: '4.98',
    reviewsCount: 84
  },
  {
    id: 'sponsor-audio-3',
    sponsorName: 'Studio Podcast & Création',
    badge: '🎙️ Studio Partenaire',
    category: 'Audiovisuel & Musique',
    title: 'Studio d\'enregistrement & montage vidéo disponible',
    description: 'Matériel Shure SM7B, caméras 4K et cabine traitée acoustiquement pour vos interviews et créations de contenu.',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
    perk: 'Troco Plus : -25%',
    ctaText: 'Voir les disponibilités',
    author: 'Studio TrocoLab',
    rating: '4.92',
    reviewsCount: 62
  },
  {
    id: 'sponsor-mentor-4',
    sponsorName: 'Académie Freelance & Mentorat',
    badge: '🚀 Formation Partenaire',
    category: 'Mentorat & Conseil',
    title: 'Audit de portfolio & stratégie de compétences',
    description: 'Faites relire votre profil par des experts pour maximiser vos échanges de compétences et collaborations sur la plateforme.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    perk: 'Audit Express Offert',
    ctaText: 'Demander un audit',
    author: 'Mentorat Club',
    rating: '5.0',
    reviewsCount: 210
  }
];

export default function SponsoredFeedCard({ index = 0, darkMode = false, onOpenNotification = null }) {
  const partner = SPONSORED_PARTNERS[index % SPONSORED_PARTNERS.length];

  const handleAction = (e) => {
    e.stopPropagation();
    if (onOpenNotification) {
      onOpenNotification(`🏷️ Offre Partenaire "${partner.sponsorName}" activée ! Utilisez le code ${partner.perk} lors de votre échange.`);
    } else {
      alert(`🏷️ Offre Partenaire "${partner.sponsorName}" activée ! Code : ${partner.perk}`);
    }
  };

  return (
    <div
      className="feed-card-item sponsored-card premium-card"
      onClick={handleAction}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1.5px solid var(--accent-primary)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease',
        boxSizing: 'border-box'
      }}
    >
      {/* BANDEAU SUPÉRIEUR SPONSOR */}
      <div style={{
        position: 'relative',
        height: '180px',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-subtle)'
      }}>
        <img
          src={partner.image}
          alt={partner.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)'
        }} />

        {/* BADGES HAUT */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '800',
            backgroundColor: 'var(--bg-glass)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid var(--accent-primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            {partner.badge}
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: '6px',
            backdropFilter: 'blur(6px)'
          }}>
            Sponsorisé
          </span>
        </div>

        {/* TAG AVANTAGE BAS DE PHOTO */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '800',
            padding: '3px 9px',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-accent)'
          }}>
            🎁 {partner.perk}
          </span>
        </div>
      </div>

      {/* CONTENU DE LA CARTE */}
      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '11px',
            color: 'var(--accent-primary)',
            fontWeight: '700'
          }}>
            <span>{partner.sponsorName}</span>
            <span>★ {partner.rating} ({partner.reviewsCount})</span>
          </div>

          <h4 style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            fontWeight: '800',
            color: 'var(--text-main)',
            lineHeight: 1.3
          }}>
            {partner.title}
          </h4>

          <p style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {partner.description}
          </p>
        </div>

        {/* BOUTON D'ACTION */}
        <button
          type="button"
          onClick={handleAction}
          className="premium-button"
          style={{
            border: 'none',
            borderRadius: '12px',
            padding: '9px 14px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-accent)',
            width: '100%',
            boxSizing: 'border-box',
            marginTop: '4px'
          }}
        >
          <Sparkles size={13} />
          <span>{partner.ctaText}</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
