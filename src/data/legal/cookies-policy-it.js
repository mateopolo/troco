const cookiesPolicyIt = {
  "badge": "Privacy e Tracciatori",
  "title": "Informativa sui Cookie e Tracciatori",
  "subtitle": "Massima trasparenza sull'uso di cookie, memoria locale (localStorage) e tecnologie simili su Troco.",
  "lastUpdated": "9 settembre 2026",
  "manageButton": "Gestisci preferenze cookie",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. Che cos'è un Cookie o Tracciatore?",
      "subtitle": "Definizione legale ai sensi dell'articolo 5-3 della direttiva ePrivacy",
      "body": "\n          <p>Un tracciatore o cookie è un'informazione memorizzata o letta sul dispositivo dell'utente durante la navigazione su un servizio online.</p>\n          <p>Su Troco diamo priorità alla <strong>memoria locale sicura del browser (localStorage)</strong> per limitare i trasferimenti di rete non necessari e proteggere la tua privacy.</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. Inventario Esaustivo dei Tracciatori e Storage Locale",
      "subtitle": "Trasparenza sulle chiavi memorizzate e la loro precisa finalità",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">Chiave / Identificatore</th>\n                  <th style=\"padding:10px 12px;\">Tipo e Finalità</th>\n                  <th style=\"padding:10px 12px;\">Necessità</th>\n                  <th style=\"padding:10px 12px;\">Durata</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">Salva il consenso o rifiuto dei cookie opzionali</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Strettamente necessario</td>\n                  <td style=\"padding:10px 12px;\">6 mesi</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">Mantiene la sessione utente sicura (Firebase Auth)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Strettamente necessario</td>\n                  <td style=\"padding:10px 12px;\">Sessione attiva</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">Lingua attiva dell'interfaccia (FR, EN, ES, IT, DE, JA, ZH)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Funzionale</td>\n                  <td style=\"padding:10px 12px;\">12 mesi</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_dark_mode</td>\n                  <td style=\"padding:10px 12px;\">Tema visivo (modalità scura o chiara)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Funzionale</td>\n                  <td style=\"padding:10px 12px;\">12 mesi</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">Misurazione anonima dell'audience e prestazioni</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">Opzionale (Consenso)</td>\n                  <td style=\"padding:10px 12px;\">13 mesi</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. Come Gestire o Revocare il Consenso?",
      "subtitle": "Libertà di scelta garantita in qualsiasi momento senza limitazioni del servizio",
      "body": "\n          <p>In conformità al GDPR, <strong>rifiutare i tracciatori non necessari è semplice quanto accettarli</strong>.</p>\n          <p>Puoi riaprire il banner di consenso e modificare le tue scelte in qualsiasi istante cliccando sul pulsante sottostante o tramite il link nel piè di pagina.</p>\n        "
    }
  ]
};

export default cookiesPolicyIt;
