// ============================================================================
// PRESETS INTELLIGENTS DE COMPÉTENCES, ÉQUIPEMENTS & BIO — TROCO
// ============================================================================

export const TROCO_CATEGORIES = [
  { id: 'all', label: 'Toutes catégories', icon: 'Sparkles', emoji: '✨' },
  { id: 'skills', label: 'Cours & Compétences', icon: 'GraduationCap', emoji: '🎓', desc: 'Langues, soutien scolaire, musique, formations, code' },
  { id: 'diy', label: 'Bricolage, Travaux & Jardin', icon: 'Wrench', emoji: '🛠️', desc: 'Plomberie, électricité, jardinage, peinture, rénovation' },
  { id: 'tech', label: 'Tech, Digital & Bureautique', icon: 'Laptop', emoji: '💻', desc: 'Dev web, dépannage PC/Mac, design, vidéo, SEO, IA' },
  { id: 'tools', label: 'Prêt d’Outillage & Équipements', icon: 'Hammer', emoji: '🔨', desc: 'Perceuses, nettoyeurs haute pression, scies, échafaudages' },
  { id: 'vehicles', label: 'Véhicules & Mobilité', icon: 'Car', emoji: '🚗', desc: 'Utilitaires, citadines, vélos cargos, remorques' },
  { id: 'housing', label: 'Logement, Espaces & Stay Swap', icon: 'Home', emoji: '🏠', desc: 'Échange de maison, studios, box de stockage, bureaux' },
  { id: 'media', label: 'Audiovisuel, Photo & Son', icon: 'Camera', emoji: '📷', desc: 'Caméras 4K, drones, micros studio, instruments' },
  { id: 'services', label: 'Services à la personne & Entraide', icon: 'HeartHandshake', emoji: '🤝', desc: 'Garde d’animaux, déménagement, cuisine, couture' },
  { id: 'wellness', label: 'Santé, Sport & Bien-être', icon: 'Activity', emoji: '🧘', desc: 'Coaching sportif, yoga, pilates, méditation' },
  { id: 'events', label: 'Événements & Matériel de fête', icon: 'PartyPopper', emoji: '🎉', desc: 'Sonorisation, barnums, mobilier, lumières' },
  { id: 'fashion', label: 'Mode, Beauté & Accessoires', icon: 'Scissors', emoji: '✂️', desc: 'Coiffure, retouches, stylisme, confection' },
  { id: 'other', label: 'Autre / Domaine personnalisé', icon: 'PlusCircle', emoji: '✨', desc: 'Rubrique sur-mesure pour tout besoin spécifique' },
];

export const SKILL_CATEGORIES = [
  {
    id: 'languages',
    label: '🌍 Langues & Enseignement',
    skills: [
      'Professeur d’Anglais (Tous niveaux)',
      'Espagnol conversationnel',
      'Italien débutant & voyage',
      'Français Langue Étrangère (FLE)',
      'Allemand professionnel',
      'Japonais & Calligraphie',
      'Chinois Mandarin',
      'Soutien scolaire Mathématiques',
      'Histoire-Géographie',
      'Philosophie & Méthodologie',
      'Physique-Chimie',
      'Aide aux devoirs primaire/collège',
    ],
  },
  {
    id: 'tech_dev',
    label: '💻 Tech, Code & Digital',
    skills: [
      'Développement Web (React, Next.js)',
      'Scripts Python & Automatisation',
      'Création de site WordPress / Shopify',
      'Design UI/UX sur Figma',
      'Montage Vidéo (Premiere, CapCut, DaVinci)',
      'SEO & Référencement Google',
      'Réparation Informatique & Mac/PC',
      'Bases de données & SQL',
      'Création Graphique & Logos (Photoshop)',
      'Formation aux outils IA (Prompting, ChatGPT)',
    ],
  },
  {
    id: 'diy_home',
    label: '🛠️ Bricolage, Maison & Jardin',
    skills: [
      'Plomberie & Dépannage fuite rapide',
      'Montage de meubles en kit (IKEA)',
      'Peinture intérieure & Finitions',
      'Jardinage, Tonte & Taille de haies',
      'Électricité domestique de base',
      'Pose d’étagères & Fixations murales',
      'Menuiserie & Travail du bois',
      'Rénovation & Ponçage parquet',
      'Déménagement & Bras solides',
    ],
  },
  {
    id: 'music_arts',
    label: '🎵 Musique, Audio & Arts',
    skills: [
      'Production musicale (Ableton, FL Studio)',
      'Cours de Guitare (Acoustique / Électrique)',
      'Cours de Piano & Solfège',
      'Chant & Technique vocale',
      'Mixage & Mastering audio studio',
      'Batterie & Percussions',
      'Basse & Rythmique',
      'Dessin & Illustration digitale',
      'Photographie portrait & studio',
    ],
  },
  {
    id: 'sports_lifestyle',
    label: '🧘 Sport, Bien-être & Services',
    skills: [
      'Coaching Sportif & Remise en forme',
      'Yoga & Méditation guidée',
      'Pilates & Posture',
      'Garde d’animaux (Chiens, Chats)',
      'Cuisine traditionnelle & Pâtisserie',
      'Couture & Retouches vêtements',
      'Conseil en organisation & Rangement',
      'Mécanique auto & Révision basique',
    ],
  },
];

export const EQUIPMENT_CATEGORIES = [
  {
    id: 'vehicles',
    label: '🚗 Véhicules & Mobilité',
    items: [
      'Voiture citadine (Prêt courte durée)',
      'Camionnette / Utilitaire déménagement',
      'Vélo de ville VTC avec cadenas',
      'Vélo cargo électrique familial',
      'Trottinette électrique puissante',
      'Remorque bagagère 500kg',
      'Porte-vélos sur attelage',
      'Coffre de toit de voyage',
    ],
  },
  {
    id: 'housing',
    label: '🏠 Logement & Espaces',
    items: [
      'Logement entier (Stay Swap vacances)',
      'Studio citadin central (Échange)',
      'Espace de stockage / Box sécurisé',
      'Studio de répétition insonorisé',
      'Studio photo équipé avec fonds',
      'Jardin pour événement ou barbecue',
      'Bureau / Poste de coworking calme',
    ],
  },
  {
    id: 'tech_audiovisual',
    label: '💻 Tech, Bureautique & Audiovisuel',
    items: [
      'MacBook Pro 14" / Ordinateur portable',
      'PC Portable Windows Performant',
      'Vidéoprojecteur Full HD / 4K cinéma',
      'Écran 27 pouces 4K USB-C',
      'Caméra 4K & Objectifs professionnels',
      'Microphone Studio (Shure SM7B / USB)',
      'Casque audio monitoring studio',
      'Drone vidéo 4K stabilisé (DJI)',
      'Kit éclairage LED & Softbox studio',
      'Tablette graphique iPad Pro + Stylet',
    ],
  },
  {
    id: 'tools_garden',
    label: '🔨 Outillage, Travaux & Jardin',
    items: [
      'Perceuse à percussion + Forets béton (Bosch)',
      'Visseuse-dévisseuse sans fil',
      'Scie sauteuse & Scie circulaire',
      'Ponceuse excentrique',
      'Nettoyeur haute pression (Kärcher)',
      'Escabeau 5 marches & Échelle télescopique',
      'Tondeuse à gazon & Débroussailleuse',
      'Taille-haie électrique',
      'Boîte à outils complète & Tournevis',
      'Diable & Chariot de déménagement',
    ],
  },
];

export const BIO_SUGGESTIONS = {
  particular: [
    "Passionné par l'économie de partage et le troc local. Toujours ravi de rendre service et d'échanger des compétences utiles.",
    "Curieux et touche-à-tout ! Je propose des coups de main en bricolage et informatique, et je cherche à apprendre de nouvelles langues.",
    "Étudiant dynamique, prêt à donner des cours de soutien scolaire contre du prêt de matériel tech ou des sessions sportives.",
  ],
  professional: [
    "Freelance passionné par mon métier. Disponible pour des missions de conseil, du mentorat et des échanges de compétences B2B.",
    "Artisan qualifié et outillé. Je privilégie les échanges transparents, la courtoisie et le travail de haute qualité.",
    "Formateur et coach indépendant. Ravi de partager mon expertise avec la communauté Troco en visio ou en présentiel.",
  ],
  company: [
    "Association / Entreprise engagée dans l'économie circulaire et collaborative. Ouverte aux partenariats et aux échanges locaux.",
    "Atelier créatif et espace partagé. Nous mettons à disposition nos équipements contre des services et du savoir-faire.",
  ],
};

export const ACCOUNT_TYPES = [
  {
    id: 'particular',
    label: 'Particulier',
    badge: '👤 Compte Particulier',
    desc: 'Échangez des services du quotidien, prêtez votre matériel et troquez vos compétences sans intermédiaire financier.',
    icon: 'User',
    color: '#04265A',
  },
  {
    id: 'professional',
    label: 'Professionnel / Freelance',
    badge: '💼 Compte Pro / Freelance',
    desc: 'Proposez vos expertises, cours spécialisés ou prestations techniques contre des Jetons Troco ou compensation hybride.',
    icon: 'Briefcase',
    color: '#D97706',
  },
  {
    id: 'company',
    label: 'Entreprise & Association',
    badge: '🏢 Organisation / Asso',
    desc: 'Partagez des locaux, organisez des échanges de matériel ou proposez des services mutualisés au sein du réseau.',
    icon: 'Building2',
    color: '#10B981',
  },
];

// Collection inclusive et diversifiée d'avatars haute définition — Toutes ethnicités, teintes de peau, cheveux (Unsplash)
export const DIVERSE_AVATARS = [
  // Femmes — Teintes claires à foncées
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', // Femme brune souriante
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80', // Femme asiatique
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', // Femme blonde tech
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', // Femme rousse dynamique
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', // Femme brune élégante
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80', // Femme afro naturelle
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', // Femme afro pro
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80', // Femme peau dorée
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=300&q=80', // Femme nordique claire
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=300&q=80', // Femme latine joyeuse
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=300&q=80', // Femme cheveux bouclés
  'https://images.unsplash.com/photo-1614898522651-a5e2bcef4e4e?auto=format&fit=crop&w=300&q=80', // Femme tresses africaines
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80', // Femme indienne douce
  'https://images.unsplash.com/photo-1464863979621-258859e62245?auto=format&fit=crop&w=300&q=80', // Femme cheveux longs
  'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=300&q=80', // Femme asiat. cheveux raides
  'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=300&q=80', // Femme courte frange
  'https://images.unsplash.com/photo-1595152452543-e5fc28ebc2b8?auto=format&fit=crop&w=300&q=80', // Femme peau ébène élégante
  'https://images.unsplash.com/photo-1601412436967-49900e38d53a?auto=format&fit=crop&w=300&q=80', // Femme voilée hijab
  // Hommes — Toutes teintes
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', // Homme souriant pro
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', // Homme barbe jeune
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80', // Homme métis moderne
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80', // Homme créatif lunettes
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', // Homme charismatique
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', // Homme mature pro
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80', // Homme exécutif
  'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&w=300&q=80', // Homme afro souriant
  'https://images.unsplash.com/photo-1618701030732-d7da9c8f9b74?auto=format&fit=crop&w=300&q=80', // Homme asiatique urbain
  'https://images.unsplash.com/photo-1571800955791-53394e9e6d97?auto=format&fit=crop&w=300&q=80', // Homme indien pro
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80', // Homme costume décontracté
  'https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?auto=format&fit=crop&w=300&q=80', // Homme barbu moyen-orient
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80', // Homme afro décontracté
  'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?auto=format&fit=crop&w=300&q=80', // Homme cheveux longs
  'https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=300&q=80', // Homme sourire solaire
  // Avatars numériques & Ados
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80', // Avatar moderne 3D/Tech
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=300&q=80', // Avatar 3D épuré
];
