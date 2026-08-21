// ============================================================================
// PRESETS INTELLIGENTS DE COMPÉTENCES, ÉQUIPEMENTS & BIO — TROCO
// ============================================================================

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
