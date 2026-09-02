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
    color: '#C67D5B',
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
    color: '#A8644A',
  },
];

// Collection inclusive et diversifiée d'avatars haute définition — Toutes ethnicités, teintes de peau, cheveux et accessoires (DiceBear Avataaars)
export const DIVERSE_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatou&skinColor=614335&top=froBand&hairColor=2c1b18&accessoriesProbability=100',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&skinColor=edb98a&top=shortFlat&hairColor=4a312c&accessoriesProbability=100',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mei&skinColor=f8d25c&top=straight02&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&skinColor=ae5d29&top=theCaesar&facialHairProbability=100&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina&skinColor=614335&top=dreads&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie&skinColor=edb98a&top=bob&hairColor=d6b370&accessoriesProbability=100',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Malik&skinColor=614335&top=shavedSides&facialHairProbability=100&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zainab&skinColor=d08b5b&top=hijab&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&skinColor=edb98a&top=curly&hairColor=a55728',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Kavita&skinColor=ae5d29&top=longButNotTooLong&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Antoine&skinColor=edb98a&top=theCaesarAndSidePart&hairColor=b58143',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Kenji&skinColor=f8d25c&top=shortCurly&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Nia&skinColor=614335&top=bigHair&hairColor=2c1b18',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&skinColor=edb98a&top=sides&hairColor=4a312c&facialHairProbability=100',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&skinColor=d08b5b&top=curvy&hairColor=724133',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Tariq&skinColor=ae5d29&top=shortWaved&hairColor=2c1b18&accessoriesProbability=100',
];
