# 🚀 Cahier des Charges & Contexte Technique : Troco International (v2.0)

## 🎯 1. Vision Globale du Produit & Statut Actuel
Troco est une application web progressive (PWA) internationale de nouvelle génération dédiée à l'économie collaborative, au troc de compétences, aux prêts de matériel géolocalisés et au swap de logements. L'application dispose d'un design system fluide (clair/sombre), d'un moteur de traduction i18n intégral (7 langues : FR, EN, ES, IT, DE, JA, ZH) et d'une architecture de deals sécurisée.

---

## 🌍 2. Spécifications Internationales & i18n (Règle Absolue)
- **Zéro texte en dur :** Tous les éléments d'interface (slogan du logo, catégories, boutons, filtres, libellés de devises/jetons) doivent impérativement s'adapter dynamiquement à la langue d'affichage active.
- **Architecture de traduction des annonces :** Chaque annonce embarque ses propres traductions et sa langue d'origine dans un objet `translations`. L'interface affiche par défaut la traduction dans la langue active de l'utilisateur.
- **Bouton "Voir l'original" / "Show original" :** Présent sur chaque annonce et message de chat, il permet de basculer instantanément vers la version native (avec support des scripts non-latins comme le chinois ou le japonais).

---

## 🔒 3. Géolocalisation & Geoprivacy (Sécurité des Données)
- **Flutage des coordonnées GPS :** Les positions géographiques des utilisateurs et des annonces subissent une troncature de sécurité (précision ramenée à ~1 km) afin de préserver la vie privée des membres.
- **Mode Infini & Rayon variable :** L'utilisateur peut filtrer ses recherches par rayon kilométrique local (ex: 5 à 100 km) ou basculer en "Mode Infini" pour explorer des annonces mondiales (Tokyo, New York, Berlin, Paris, etc.).

---

## 🤝 4. Logique de Deal & Négociation Intégrée
- **Contrat de deal multimodale :** Chaque conversation gère des conditions d'échange flexibles (Jetons Troco, Paiement en Euros, Troc direct ou Formule Hybride).
- **Règles de validation :** Un utilisateur ne peut pas accepter sa propre contre-proposition. L'acceptation d'un deal payant déclenche un tunnel de paiement sécurisé simulé (Apple Pay, Carte, Virement).
- **Isolation des chats :** Chaque discussion est strictement liée à son annonce d'origine (`listingId + 1000`), garantissant des historiques de messages totalement étanches.

---

## 🤖 5. Instructions Strictes pour l'IDE (Workflow IA)
- **Développement incrémental :** Ne réécris jamais les fichiers en entier si une modification ciblée suffit. Préserve la structure modulaire.
- **Stabilité des composants :** Ne supprime aucune fonctionnalité validée (lecteur vidéo/photo en carrelage, synthétiseurs Web Audio pour les sons de caisse, cartes interactives Leaflet).
- **Objectif de performance :** Code propre, sans fuite de mémoire sur les flux vidéo WebRTC/MediaStream, et optimisé pour le rendu mobile PWA.