import React, { useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Coins, RefreshCw, Scale, Clock, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

/**
 * RefundPolicy.jsx — Politique de Remboursement & Modalités d'Échange P2P
 * Régie par le Code de la consommation français (art. L. 221-18 et suivants),
 * le système contractuel de séquestre (Escrow) et les règles d'équité de Troco.
 */
export default function RefundPolicy({
  onBack,
  onNavigate,
  darkMode = false,
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}
    }
    document.title = 'Politique de Remboursement — Troco';
  }, []);

  const cardStyle = {
    backgroundColor: darkMode ? '#1C1815' : '#FFFFFF',
    borderRadius: '24px',
    border: darkMode ? '1px solid rgba(232, 221, 211, 0.12)' : '1px solid #E8DDD3',
    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(61, 53, 48, 0.05)',
    padding: '32px',
    marginBottom: '24px',
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '18px',
  };

  const iconContainerStyle = {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #C67D5B, #A8644A)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(198, 125, 91, 0.25)',
  };

  return (
    <article
      className="legal-page-container"
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '24px 16px 120px',
        color: darkMode ? '#FAF7F2' : '#3D3530',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      {/* BARRE SUPÉRIEURE DE NAVIGATION */}
      <nav
        aria-label="Navigation politique de remboursement"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="focus:ring-2"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '9999px',
            backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#F5EAE4',
            color: darkMode ? '#FAF7F2' : '#3D3530',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          aria-label="Retour à l'accueil Troco"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Retour à l'accueil</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
          <Scale size={16} color="#C67D5B" aria-hidden="true" />
          <span>Protection Acheteur & Escrow P2P</span>
        </div>
      </nav>

      {/* HEADER DE LA PAGE */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '40px',
          padding: '32px 20px',
          borderRadius: '28px',
          background: darkMode
            ? 'linear-gradient(180deg, rgba(198,125,91,0.12) 0%, rgba(28,24,21,0.6) 100%)'
            : 'linear-gradient(180deg, rgba(198,125,91,0.08) 0%, rgba(250,247,242,0.8) 100%)',
          border: darkMode ? '1px solid rgba(198,125,91,0.2)' : '1px solid #E8DDD3',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(198,125,91,0.15)',
            color: '#C67D5B',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '14px',
          }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          <span>Cadre Économique & Sécurité</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: '800',
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
            color: darkMode ? '#FFFFFF' : '#231E1B',
          }}
        >
          Politique de Remboursement & Deals P2P
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: darkMode ? '#D4C5B5' : '#6B5E54',
            maxWidth: '640px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Règles claires encadrant les achats de jetons, le fonctionnement du séquestre temporaire (Escrow), les annulations d'accords et la résolution équitable des litiges entre membres.
        </p>
        <div style={{ marginTop: '14px', fontSize: '12px', color: darkMode ? '#9A8A7D' : '#8A7A6D' }}>
          Dernière mise à jour réglementaire : <strong>9 septembre 2026</strong>
        </div>
      </header>

      {/* SECTION 1 : LE JETON TROCO ET LE MODÈLE D'ÉCHANGE */}
      <section style={cardStyle} aria-labelledby="section-token-model">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Clock size={22} />
          </div>
          <div>
            <h2 id="section-token-model" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              1. Le Modèle d'Échange & Nature des Jetons Troco
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Règle fondamentale : 1 heure partagée = 1 Jeton Troco
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Troco fonctionne selon une économie circulaire collaborative :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li>
              <strong>Unité de compte universelle :</strong> Le Jeton Troco est une unité interne de mesure du temps partagé. Une heure d'aide, de formation, de cours ou de service rendu donne droit à 1 Jeton Troco, garantissant une parité équitable indépendamment du domaine de compétence.
            </li>
            <li>
              <strong>Pas de monnaie légale :</strong> Les Jetons Troco ne constituent ni des instruments financiers, ni de la monnaie électronique au sens du Code monétaire et financier. Ils sont strictement destinés à l'intermédiation de services entre pairs sur la plateforme.
            </li>
            <li>
              <strong>Offre de bienvenue :</strong> Des jetons de départ peuvent être octroyés gracieusement aux nouveaux inscrits pour encourager la découverte de la communauté. Ces jetons promotionnels ne sont en aucun cas convertibles en monnaie fiduciaire (€).
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 2 : DROIT DE RÉTRACTATION (ACHATS EN EUROS) */}
      <section style={cardStyle} aria-labelledby="section-fiat-withdrawal">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Coins size={22} />
          </div>
          <div>
            <h2 id="section-fiat-withdrawal" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              2. Achats Payants en Euros (€) & Droit de Rétractation Légal
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Articles L. 221-18 et L. 221-28 du Code de la consommation
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Pour les services payants proposés directement par Troco (ex : recharges de packs de jetons, abonnements Pro Entreprise, boosts d'annonces) :
          </p>
          <div
            style={{
              padding: '18px 22px',
              borderRadius: '16px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#F7F3EE',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E8DDD3',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#C67D5B' }}>
              Délai légal de rétractation de 14 jours
            </div>
            <p style={{ margin: 0, fontSize: '13.5px' }}>
              Conformément à l'article L. 221-18 du Code de la consommation, vous disposez d'un délai légal de 14 jours calendaires à compter de la commande pour exercer votre droit de rétractation sans avoir à motiver votre décision ni à payer de pénalités.
            </p>
          </div>

          <div
            style={{
              padding: '18px 22px',
              borderRadius: '16px',
              backgroundColor: darkMode ? 'rgba(217,119,6,0.1)' : 'rgba(217,119,6,0.08)',
              border: '1px solid rgba(217,119,6,0.25)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>Exception légale pour les contenus numériques consommés</span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px' }}>
              En application de l'article L. 221-28 13° du Code de la consommation, le droit de rétractation ne peut être exercé pour la fourniture d'un contenu numérique sans support matériel dont l'exécution a commencé avec votre accord préalable exprès et votre renoncement formel à votre droit de rétractation. Par conséquent, <strong>tout Jeton Troco acheté qui a déjà été utilisé, dépensé ou transféré dans le cadre d'un deal P2P ne peut plus faire l'objet d'un remboursement</strong>. Seuls les jetons encore présents sur le solde de l'utilisateur peuvent être remboursés au prorata de l'achat initial.
            </p>
          </div>

          <p>
            Pour faire valoir votre droit de rétractation pour les jetons non consommés, adressez une demande par courriel à <a href="mailto:support@troco.fr" style={{ color: '#C67D5B' }}>support@troco.fr</a> en indiquant votre identifiant de compte et la référence de paiement Stripe. Le remboursement intervient sous 14 jours par le même moyen de paiement que celui utilisé lors de la transaction d'origine.
          </p>
        </div>
      </section>

      {/* SECTION 3 : SÉQUESTRE ET ANNULATION DE DEALS P2P */}
      <section style={cardStyle} aria-labelledby="section-escrow">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <RefreshCw size={22} />
          </div>
          <div>
            <h2 id="section-escrow" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              3. Séquestre Sécurisé (Escrow) & Annulations de Deals P2P
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Protection automatisée des jetons lors de chaque proposition
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Afin de protéger les deux participants à un échange, Troco intègre un moteur transactionnel avec séquestre contractuel (Escrow) :
          </p>

          <ol style={{ paddingLeft: '22px', margin: '12px 0' }}>
            <li>
              <strong>Proposition de deal :</strong> Lorsque l'utilisateur A propose un deal d'échange à l'utilisateur B, les jetons Troco convenus sont immédiatement débités du solde de A et placés sous séquestre sécurisé. Ils ne sont pas encore crédités sur le compte de B.
            </li>
            <li>
              <strong>Annulation avant la réalisation :</strong> Tant que la prestation n'a pas été exécutée ou confirmée, chaque partie peut annuler le deal. En cas d'annulation, les jetons sous séquestre sont automatiquement et instantanément recrédités sur le solde de l'émetteur (A), à 100% et sans aucun frais.
            </li>
            <li>
              <strong>Finalisation du deal :</strong> Une fois le service accompli (visio, cours, travail rendu ou matériel restitué), les deux parties confirment le succès de la transaction. Les jetons séquestrés sont instantanément libérés au profit du destinataire (B).
            </li>
            <li>
              <strong>Absence injustifiée (No-Show) :</strong> Si une partie ne se présente pas au rendez-vous convenu ou ne fournit aucun livrable sans motif légitime, le deal est clôturé pour défaillance et les jetons sont restitués à la partie ayant formulé la demande.
            </li>
          </ol>
        </div>
      </section>

      {/* SECTION 4 : GESTION DES LITIGES P2P */}
      <section style={cardStyle} aria-labelledby="section-disputes">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <Scale size={22} />
          </div>
          <div>
            <h2 id="section-disputes" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              4. Procédure de Résolution des Litiges P2P & Médiation
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Protocole équitable en cas de désaccord sur une prestation ou un prêt
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            En cas de désaccord entre membres concernant l'exécution d'un échange (service non conforme, retard majeur, dégradation de matériel) :
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#FAF7F2',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#C67D5B',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <strong>Phase Amiable Directe :</strong> Les deux utilisateurs échangent via la messagerie privée sécurisée de Troco pour trouver une issue favorable (report, ajustement du livrable ou annulation concertée).
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#FAF7F2',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#C67D5B',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <strong>Saisine de la Modération Troco :</strong> Si aucun accord n'est trouvé après 48 heures, l'une des parties clique sur « Signaler un litige » depuis la conversation ou écrit à <a href="mailto:litiges@troco.fr" style={{ color: '#C67D5B' }}>litiges@troco.fr</a> en transmettant les captures ou justificatifs utiles.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#FAF7F2',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#C67D5B',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <strong>Arbitrage & Restitution :</strong> Les équipes de modération analysent objectivement les historiques contractuels, les journaux d'activité et statuent sous 72 heures ouvrées. Si la réclamation est légitime, les jetons sous séquestre sont recrédités sur le solde de la partie lésée.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 : CAUTIONS DE MATÉRIEL */}
      <section style={cardStyle} aria-labelledby="section-deposit">
        <div style={sectionHeaderStyle}>
          <div style={iconContainerStyle} aria-hidden="true">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h2 id="section-deposit" style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: darkMode ? '#FFFFFF' : '#231E1B' }}>
              5. Empreintes Bancaires de Caution pour le Prêt de Matériel
            </h2>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: darkMode ? '#B9A89B' : '#7D6E63' }}>
              Garanties pour le prêt d'outillage, matériel audiovisuel et équipements
            </p>
          </div>
        </div>

        <div className="prose" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
          <p>
            Lorsqu'un deal concerne le prêt d'un objet de valeur, le propriétaire peut solliciter une pré-autorisation de caution bancaire :
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '12px 0' }}>
            <li>
              <strong>Aucun débit immédiat :</strong> La caution est une simple empreinte bancaire (blocage temporaire du plafond sans encaissement).
            </li>
            <li>
              <strong>Restitution sans réserve :</strong> Dès que le matériel est restitué conforme à l'état initial constaté conjointement, l'empreinte de caution est immédiatement et intégralement levée.
            </li>
            <li>
              <strong>Retenue pour dégradation :</strong> En cas de dommage avéré ou de non-restitution dans les délais convenus, un constat contradictoire avec photographies doit être adressé à Troco sous 24h. Aucun prélèvement ne peut être effectué unilatéralement sans validation par l'équipe de médiation.
            </li>
          </ul>
        </div>
      </section>
    </article>
  );
}
