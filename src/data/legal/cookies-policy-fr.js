const cookiesPolicyFr = {
  "badge": "Respect de la Vie Privée & Traceurs",
  "title": "Politique des Cookies & Traceurs",
  "subtitle": "Transparence totale sur l'utilisation des témoins de connexion, stockage local (localStorage) et technologies similaires sur la plateforme Troco.",
  "lastUpdated": "9 septembre 2026",
  "manageButton": "Réinitialiser & Configurer mes préférences de traceurs",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. Qu'est-ce qu'un Cookie ou Traceur ?",
      "subtitle": "Définition légale au sens de l'article 5-3 de la directive ePrivacy",
      "body": "\n          <p>Un traceur ou cookie est une information déposée ou lue sur le terminal de l'utilisateur (ordinateur, smartphone, tablette) lors de la consultation d'un service en ligne. Il permet au site de mémoriser vos actions, préférences d'affichage et sessions actives pendant une durée déterminée.</p>\n          <p>Sur Troco, nous privilégions le <strong>stockage local sécurisé du navigateur (localStorage)</strong> pour minimiser les échanges de données réseau inutiles et préserver votre confidentialité.</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. Inventaire Exhaustif des Traceurs & Stockages Locaux",
      "subtitle": "Transparence sur les clés locales et leur finalité précise",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">Clé / Identifiant</th>\n                  <th style=\"padding:10px 12px;\">Type & Finalité</th>\n                  <th style=\"padding:10px 12px;\">Nécessité</th>\n                  <th style=\"padding:10px 12px;\">Durée</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">Mémorisation du choix d'acceptation ou refus des cookies</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Strictement nécessaire</td>\n                  <td style=\"padding:10px 12px;\">6 mois (Norme CNIL)</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">Maintien de la session utilisateur sécurisée (Firebase Auth)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Strictement nécessaire</td>\n                  <td style=\"padding:10px 12px;\">Session active</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_theme</td>\n                  <td style=\"padding:10px 12px;\">Thème visuel sélectionné (mode sombre ou clair)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Fonctionnel</td>\n                  <td style=\"padding:10px 12px;\">12 mois</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">Préférence de langue active de l'interface (FR, EN, ES, IT, DE, JA, ZH)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Fonctionnel</td>\n                  <td style=\"padding:10px 12px;\">12 mois</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">Mesure d'audience anonymisée et performance de navigation</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">Optionnel (Consentement)</td>\n                  <td style=\"padding:10px 12px;\">6 mois</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. Comment Gérer ou Révoquer votre Consentement ?",
      "subtitle": "Liberté de choix garantie à tout instant sans dégradation du service principal",
      "body": "\n          <p>Conformément aux directives de la CNIL et du RGPD, <strong>le refus des traceurs non nécessaires est aussi simple que leur acceptation</strong>.</p>\n          <p>Vous pouvez à tout moment rouvrir la bannière de consentement et modifier vos choix en cliquant sur le bouton ci-dessous ou depuis le lien présent dans le pied de page.</p>\n        "
    }
  ]
};

export default cookiesPolicyFr;
