const legalNoticeFr = {
  badge: "Informations Obligatoires",
  title: "Mentions Légales",
  subtitle: "Transparence absolue sur l'éditeur, les hébergeurs techniques et les conditions réglementaires d'exploitation de la plateforme collaborative Troco.",
  lastUpdated: "9 septembre 2026",
  sections: [
    {
      id: "section-editor",
      title: "1. Éditeur de la Plateforme",
      subtitle: "Identification légale au titre de l'article 6-III de la loi LCEN n° 2004-575",
      body: `
        <p>Le site internet et l'application web accessible à l'adresse <strong>troco.fr</strong> (ci-après désignés « la Plateforme Troco ») sont édités et administrés par :</p>
        <ul>
          <li><strong>Directeur de la publication et Éditeur :</strong> Mateo</li>
          <li><strong>Qualité :</strong> Fondateur et exploitant de la plateforme collaborative Troco</li>
          <li><strong>Adresse de correspondance électronique :</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> ou <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>Activité :</strong> Plateforme d'intermédiation technique entre particuliers pour l'échange de compétences, le partage de savoir-faire et le prêt d'équipements sur le modèle du temps partagé.</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. Prestataires d'Hébergement",
      subtitle: "Infrastructures de diffusion et de stockage des données dans le cloud",
      body: `
        <p>Pour assurer une haute disponibilité, la sécurité des transactions et la réplication des flux temps réel, la plateforme Troco fait appel à des prestataires de classe mondiale :</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Hébergement des Données & Base Firestore</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited<br />
              Gordon House, Barrow Street, Dublin 4, Irlande<br />
              Datacenters : Union Européenne (zone europe-west)<br />
              Site officiel : <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Hébergement Web & CDN Edge</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              440 N Barranca Ave #4133<br />
              Covina, CA 91723, États-Unis<br />
              Contact : <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              Infrastructure globale avec nœuds Edge européens
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. Statut d'Intermédiaire Technique (LCEN & DSA)",
      subtitle: "Régime de responsabilité de l'hébergeur de contenus créés par les utilisateurs",
      body: `
        <p>Conformément à l'article 6-I-2 de la Loi pour la Confiance dans l'Économie Numérique (LCEN n° 2004-575 du 21 juin 2004) et aux dispositions du Règlement Européen (UE) 2022/2065 relatif aux services numériques (Digital Services Act - DSA) :</p>
        <ul>
          <li><strong>Hébergement de contenus P2P :</strong> Troco agit exclusivement comme intermédiaire technique hébergeant des annonces, profils, évaluations et messages publiés par ses membres utilisateurs. Troco n'exerce pas de contrôle a priori général sur les contenus publiés.</li>
          <li><strong>Absence d'obligation générale de surveillance :</strong> Troco n'est pas soumis à une obligation générale de surveiller les informations stockées, ni à une obligation générale de rechercher des faits indiquant des activités illicites.</li>
          <li><strong>Notification et retrait rapide des contenus illicites :</strong> Tout utilisateur constatant un contenu abusif, illégal ou frauduleux peut le signaler immédiatement via le bouton « Signaler » intégré à chaque annonce ou profil, en utilisant le formulaire de signalement ci-dessous, ou en contactant <a href="mailto:abuse@troco.fr">abuse@troco.fr</a>. Dès lors que Troco acquiert la connaissance effective d'un contenu manifestement illicite, celui-ci est retiré avec diligence.</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. Propriété Intellectuelle & Droits Réservés",
      subtitle: "Protection des marques, interfaces, algorithmes et éléments graphiques",
      body: `
        <p>L'ensemble des éléments constituant l'application Troco (notamment la marque verbale et figurative Troco, les chartes graphiques, maquettes, logos, icônes, animations, textes éditoriaux, bases de données, architectures logicielles et codes sources) relèvent de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle (articles L. 111-1 et suivants du Code de la propriété intellectuelle).</p>
        <p>Toute reproduction, représentation, diffusion, extraction ou modification totale ou partielle de ces éléments sans l'accord écrit exprès et préalable de l'éditeur est formellement prohibée et engage la responsabilité civile et pénale de son auteur.</p>
      `
    },
    {
      id: "section-contact",
      title: "5. Contact & Point de Contact DSA",
      subtitle: "Canaux d'échange dédiés aux utilisateurs et aux autorités publiques",
      body: `
        <p>Pour toute demande d'information, signalement de sécurité ou communication officielle :</p>
        <ul>
          <li><strong>Support utilisateur général :</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>Signalement abus / Modération (DSA Art. 11 & 12) :</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>Point de contact autorités publiques (DSA Art. 11) :</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a> (Langues acceptées : Français, Anglais)</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeFr;
