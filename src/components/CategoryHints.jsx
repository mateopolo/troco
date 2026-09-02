import React from 'react';
import {
  Sparkles,
  Shirt,
  Car,
  Laptop,
  Hammer,
  Home,
  GraduationCap,
  Camera,
  HeartHandshake,
  Activity,
  PartyPopper,
  Users,
  Info,
  Tag,
  Plus
} from 'lucide-react';

const CATEGORY_HINTS_CONFIG = {
  'mode': {
    icon: Shirt,
    title: 'Conseil Mode & Dressing',
    badge: 'Vêtements & Accessoires',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.10)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    hint: 'Pensez à photographier l’étiquette (taille, marque, composition en % coton/laine) et à signaler clairement les éventuels défauts (coutures, boutons).',
    suggestedTags: ['Taille M', 'État Neuf', 'Vintage', '100% Coton', 'Unisexe'],
  },
  'vehicules': {
    icon: Car,
    title: 'Conseil Auto, Moto & Mobilité',
    badge: 'Véhicules',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.10)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    hint: 'Indiquez le kilométrage exact, l’année de mise en circulation, l’état des pneus et photographiez le tableau de bord avec les voyants allumés au contact.',
    suggestedTags: ['Kilométrage', 'Contrôle Technique OK', 'Essence', 'Première Main'],
  },
  'tech': {
    icon: Laptop,
    title: 'Conseil Tech, Code & Digital',
    badge: 'Freelance & Tech',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.10)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    hint: 'Précisez votre stack technique (React, Node, Python...), votre portfolio ou démo github, et votre tarif horaire ou estimation en Jetons Troco.',
    suggestedTags: ['React', 'Node.js', 'Fullstack', 'Télétravail', 'API Rest'],
  },
  'bricolage': {
    icon: Hammer,
    title: 'Conseil Bricolage & Outillage',
    badge: 'Travaux & Matériel',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    hint: 'Mentionnez la marque, la puissance (V/W), l’état des batteries ou des lames, et si les accessoires ou le coffret de transport sont fournis.',
    suggestedTags: ['Batterie 18V', 'Pro', 'Coffret inclus', 'Usage facile'],
  },
  'logement': {
    icon: Home,
    title: 'Conseil Logement & Stay Swap',
    badge: 'Espaces & Séjours',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    hint: 'Précisez la surface en m², l’étage/ascenseur, les commodités (Wifi Fibre, machine à laver) et la période exacte de disponibilité.',
    suggestedTags: ['Wifi Fibre', 'Meublé', 'Balcon', 'Centre-ville', 'Calme'],
  },
  'cours': {
    icon: GraduationCap,
    title: 'Conseil Cours & Compétences',
    badge: 'Formation & Coaching',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.10)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    hint: 'Détaillez votre niveau d’expertise ou diplôme, le public cible (débutant à confirmé) et si le cours se déroule en présentiel ou en visio interactive.',
    suggestedTags: ['Tous niveaux', 'Visio', 'Débutant', 'Supports fournis'],
  },
  'photo': {
    icon: Camera,
    title: 'Conseil Photo, Vidéo & Son',
    badge: 'Audiovisuel',
    color: '#d946ef',
    bgColor: 'rgba(217, 70, 239, 0.10)',
    borderColor: 'rgba(217, 70, 239, 0.35)',
    hint: 'Indiquez la référence exacte du boîtier ou de l’optique, le nombre de déclenchements au compteur, et les câbles ou cartes mémoire inclus.',
    suggestedTags: ['4K 60fps', 'Objectif inclus', 'Batterie supplémentaire', 'Trépied'],
  },
  'services': {
    icon: HeartHandshake,
    title: 'Conseil Services & Entraide',
    badge: 'Services de proximité',
    color: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.10)',
    borderColor: 'rgba(234, 88, 12, 0.35)',
    hint: 'Indiquez votre rayon kilométrique d’intervention, vos créneaux de disponibilité (semaine/weekend) et si vous venez avec votre matériel.',
    suggestedTags: ['Ponctuel', 'Régulier', 'Véhiculé', 'Matériel inclus'],
  },
  'sport': {
    icon: Activity,
    title: 'Conseil Sport & Bien-être',
    badge: 'Forme & Santé',
    color: '#14b8a6',
    bgColor: 'rgba(20, 184, 166, 0.10)',
    borderColor: 'rgba(20, 184, 166, 0.35)',
    hint: 'Mentionnez l’intensité de la séance, la tenue ou tapis recommandé, et le lieu d’entraînement (parc, domicile ou salle).',
    suggestedTags: ['Coaching', 'Extérieur', 'Remise en forme', 'Personnalisé'],
  },
  'events': {
    icon: PartyPopper,
    title: 'Conseil Événements & Fêtes',
    badge: 'Matériel Festif',
    color: '#e11d48',
    bgColor: 'rgba(225, 29, 72, 0.10)',
    borderColor: 'rgba(225, 29, 72, 0.35)',
    hint: 'Précisez la puissance sonore (Watts), le nombre de personnes recommandé, les conditions de caution et d’installation.',
    suggestedTags: ['Pack Soirée', 'Sonorisation', 'Jeux de lumière', 'Caution requise'],
  },
  'collaborative_project': {
    icon: Users,
    title: 'Conseil Projet Collaboratif',
    badge: 'Équipe & Co-création',
    color: '#c67d5b',
    bgColor: 'rgba(198, 125, 91, 0.12)',
    borderColor: 'rgba(198, 125, 91, 0.40)',
    hint: 'Décrivez précisément les compétences recherchées dans l’équipe, le calendrier estimé et l’organisation collective (Tableau blanc, Discord).',
    suggestedTags: ['Co-création', 'Équipe', 'Multi-talents', 'Troco Projet'],
  },
  'default': {
    icon: Sparkles,
    title: 'Astuce pour booster votre annonce',
    badge: 'Recommandation',
    color: 'var(--accent-primary)',
    bgColor: 'rgba(198, 125, 91, 0.08)',
    borderColor: 'var(--border-color)',
    hint: 'Des photos lumineuses et nettes sous plusieurs angles ainsi qu’une description détaillée multiplient par 3 vos propositions d’échange !',
    suggestedTags: ['Troco Vérifié', 'Disponible', 'Échange Rapide'],
  }
};

function resolveCategoryKey(category = '', isCollaborative = false) {
  if (isCollaborative) return 'collaborative_project';
  const c = String(category).toLowerCase();
  if (c.includes('mode') || c.includes('vêtement') || c.includes('vetement') || c.includes('dressing') || c.includes('beauté') || c.includes('beaute')) return 'mode';
  if (c.includes('véhicule') || c.includes('vehicule') || c.includes('auto') || c.includes('moto') || c.includes('mobilité') || c.includes('mobilite')) return 'vehicules';
  if (c.includes('tech') || c.includes('digital') || c.includes('code') || c.includes('informatique') || c.includes('bureautique')) return 'tech';
  if (c.includes('bricolage') || c.includes('travaux') || c.includes('jardin') || c.includes('outillage')) return 'bricolage';
  if (c.includes('logement') || c.includes('espace') || c.includes('stay') || c.includes('swap') || c.includes('chambre')) return 'logement';
  if (c.includes('cours') || c.includes('langue') || c.includes('compétence') || c.includes('competence') || c.includes('formation')) return 'cours';
  if (c.includes('audiovisuel') || c.includes('photo') || c.includes('son') || c.includes('vidéo') || c.includes('video')) return 'photo';
  if (c.includes('service') || c.includes('entraide') || c.includes('personne')) return 'services';
  if (c.includes('santé') || c.includes('sante') || c.includes('sport') || c.includes('bien-être') || c.includes('bien-etre')) return 'sport';
  if (c.includes('événement') || c.includes('evenement') || c.includes('fête') || c.includes('fete')) return 'events';
  return 'default';
}

export default function CategoryHints({
  category = '',
  customCategoryName = '',
  isCollaborative = false,
  existingTags = [],
  onAddTag = null,
}) {
  const resolvedKey = resolveCategoryKey(customCategoryName || category, isCollaborative);
  const hintData = CATEGORY_HINTS_CONFIG[resolvedKey] || CATEGORY_HINTS_CONFIG.default;
  const IconComponent = hintData.icon;

  return (
    <div
      className="category-hints-card"
      style={{
        marginTop: '10px',
        padding: '12px 14px',
        borderRadius: '14px',
        backgroundColor: hintData.bgColor,
        border: `1.5px solid ${hintData.borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        animation: 'fadeSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Header with Icon and Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: hintData.color,
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${hintData.borderColor}`,
            }}
          >
            <IconComponent size={15} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '800',
              color: 'var(--text-main)',
              letterSpacing: '-0.2px',
            }}
          >
            {hintData.title}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: '700',
            color: hintData.color,
            backgroundColor: 'var(--bg-card)',
            padding: '2px 8px',
            borderRadius: '999px',
            border: `1px solid ${hintData.borderColor}`,
          }}
        >
          {hintData.badge}
        </span>
      </div>

      {/* Hint Description */}
      <p
        style={{
          margin: 0,
          fontSize: '11.5px',
          lineHeight: '1.45',
          color: 'var(--text-secondary)',
          fontWeight: '500',
        }}
      >
        💡 {hintData.hint}
      </p>

      {/* Suggested Tags (Clickable to Add) */}
      {hintData.suggestedTags && hintData.suggestedTags.length > 0 && onAddTag && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            Tags recommandés :
          </span>
          {hintData.suggestedTags.map((tag) => {
            const isAlreadyAdded = existingTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => !isAlreadyAdded && onAddTag(tag)}
                disabled={isAlreadyAdded}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  border: isAlreadyAdded ? '1px solid var(--border-color)' : `1px dashed ${hintData.color}`,
                  backgroundColor: isAlreadyAdded ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  color: isAlreadyAdded ? 'var(--text-secondary)' : hintData.color,
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: isAlreadyAdded ? 'default' : 'pointer',
                  opacity: isAlreadyAdded ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
                title={isAlreadyAdded ? 'Déjà ajouté' : `Ajouter le tag "${tag}"`}
              >
                {!isAlreadyAdded && <Plus size={10} strokeWidth={2.5} />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
