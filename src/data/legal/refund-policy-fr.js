const refundPolicyFr = {
  badge: "Cadre Économique & Sécurité",
  title: "Politique de Remboursement & Deals P2P",
  subtitle: "Règles claires encadrant les achats de jetons, le fonctionnement du séquestre temporaire (Escrow), les annulations d'accords et la résolution équitable des litiges entre membres.",
  lastUpdated: "9 septembre 2026",
  sections: [
    {
      id: "section-token-model",
      title: "1. Le Modèle d'Échange & Nature des Jetons Troco",
      subtitle: "Règle fondamentale : 1 heure partagée = 1 Jeton Troco",
      body: `
        <p>Troco fonctionne selon une économie circulaire collaborative :</p>
        <ul>
          <li><strong>Unité de compte universelle :</strong> Le Jeton Troco est une unité interne de mesure du temps partagé. Une heure d'aide, de formation, de cours ou de service rendu donne droit à 1 Jeton Troco, garantissant une parité équitable indépendamment du domaine de compétence.</li>
          <li><strong>Pas de monnaie légale :</strong> Les Jetons Troco ne constituent ni des instruments financiers, ni de la monnaie électronique au sens du Code monétaire et financier. Ils sont strictement destinés à l'intermédiation de services entre pairs sur la plateforme.</li>
          <li><strong>Offre de bienvenue :</strong> Des jetons de départ peuvent être octroyés gracieusement aux nouveaux inscrits pour encourager la découverte de la communauté. Ces jetons promotionnels ne sont en aucun cas convertibles en monnaie fiduciaire (€).</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. Achats Payants en Euros (€) & Droit de Rétractation Légal",
      subtitle: "Articles L. 221-18 et L. 221-28 du Code de la consommation",
      body: `
        <p>Pour les services payants proposés directement par Troco (ex : recharges de packs de jetons, abonnements Pro Entreprise, boosts d'annonces) :</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Délai légal de rétractation de 14 jours</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            Conformément à l'article L. 221-18 du Code de la consommation, vous disposez d'un délai légal de 14 jours calendaires à compter de la commande pour exercer votre droit de rétractation sans avoir à motiver votre décision ni à payer de pénalités.
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Exception légale pour les contenus numériques consommés</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            En application de l'article L. 221-28 13° du Code de la consommation, le droit de rétractation ne peut être exercé pour la fourniture d'un contenu numérique sans support matériel dont l'exécution a commencé avec votre accord préalable exprès. Par conséquent, <strong>tout Jeton Troco acheté qui a déjà été utilisé, dépensé ou transféré dans le cadre d'un deal P2P ne peut plus faire l'objet d'un remboursement</strong>. Seuls les jetons encore présents sur le solde peuvent être remboursés au prorata.
          </p>
        </div>
        <p>Pour faire valoir votre droit de rétractation, adressez votre demande à <a href="mailto:support@troco.fr">support@troco.fr</a> avec votre identifiant et la référence Stripe. Le remboursement intervient sous 14 jours.</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. Séquestre Sécurisé (Escrow) & Annulations de Deals P2P",
      subtitle: "Protection automatisée des jetons lors de chaque proposition",
      body: `
        <p>Afin de protéger les deux participants à un échange, Troco intègre un moteur transactionnel avec séquestre contractuel (Escrow) :</p>
        <ol>
          <li><strong>Proposition de deal :</strong> Lorsque l'utilisateur A propose un deal à B, les jetons Troco convenus sont immédiatement débités du solde de A et placés sous séquestre sécurisé. Ils ne sont pas encore crédités chez B.</li>
          <li><strong>Annulation avant la réalisation :</strong> Tant que la prestation n'a pas été exécutée ou confirmée, chaque partie peut annuler le deal. Les jetons sous séquestre sont instantanément recrédités à 100% sur le solde de l'émetteur (A), sans frais.</li>
          <li><strong>Finalisation du deal :</strong> Une fois le service accompli, les deux parties confirment le succès de la transaction. Les jetons séquestrés sont libérés au profit de B.</li>
          <li><strong>Absence injustifiée (No-Show) :</strong> Si une partie ne se présente pas au rendez-vous convenu sans motif légitime, le deal est clôturé pour défaillance et les jetons sont restitués à l'émetteur.</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. Procédure de Résolution des Litiges P2P & Médiation",
      subtitle: "Protocole équitable en cas de désaccord sur une prestation ou un prêt",
      body: `
        <p>En cas de désaccord entre membres concernant l'exécution d'un échange (service non conforme, retard majeur, dégradation de matériel) :</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>Phase Amiable Directe :</strong> Les deux utilisateurs échangent via la messagerie privée sécurisée de Troco pour trouver une issue favorable.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>Saisine de la Modération Troco :</strong> Si aucun accord n'est trouvé après 48 heures, l'une des parties clique sur « Signaler un litige » ou écrit à <a href="mailto:litiges@troco.fr">litiges@troco.fr</a> avec les justificatifs utiles.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>Arbitrage & Restitution :</strong> Les équipes de modération analysent objectivement les historiques contractuels et statuent sous 72 heures ouvrées. Si la réclamation est légitime, les jetons sous séquestre sont recrédités à la partie lésée.</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. Empreintes Bancaires de Caution pour le Prêt de Matériel",
      subtitle: "Garanties pour le prêt d'outillage, matériel audiovisuel et équipements",
      body: `
        <p>Lorsqu'un deal concerne le prêt d'un objet de valeur, le propriétaire peut solliciter une pré-autorisation de caution bancaire :</p>
        <ul>
          <li><strong>Aucun débit immédiat :</strong> La caution est une simple empreinte bancaire (blocage temporaire du plafond sans encaissement).</li>
          <li><strong>Restitution sans réserve :</strong> Dès que le matériel est restitué conforme à l'état initial, l'empreinte de caution est immédiatement et intégralement levée.</li>
          <li><strong>Retenue pour dégradation :</strong> En cas de dommage avéré ou de non-restitution, un constat contradictoire avec photographies doit être adressé à Troco sous 24h. Aucun prélèvement ne peut être effectué unilatéralement sans validation préalable de la médiation.</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyFr;
