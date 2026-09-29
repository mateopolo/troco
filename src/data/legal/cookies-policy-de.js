const cookiesPolicyDe = {
  "badge": "Datenschutz & Tracker",
  "title": "Cookie- & Tracker-Richtlinie",
  "subtitle": "Vollständige Transparenz über den Einsatz von Cookies, lokalem Speicher (localStorage) und ähnlichen Technologien auf Troco.",
  "lastUpdated": "9. September 2026",
  "manageButton": "Cookie-Einstellungen verwalten",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. Was ist ein Cookie oder Tracker?",
      "subtitle": "Rechtliche Definition gemäß Art. 5 Abs. 3 der ePrivacy-Richtlinie",
      "body": "\n          <p>Ein Tracker oder Cookie ist eine Datei oder Information, die beim Besuch eines Online-Dienstes auf dem Endgerät des Nutzers gespeichert oder ausgelesen wird.</p>\n          <p>Auf Troco setzen wir bevorzugt auf den <strong>sicheren lokalen Browser-Speicher (localStorage)</strong>, um unnötigen Netzwerk-Datenverkehr zu vermeiden und Ihre Privatsphäre zu schützen.</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. Vollständiges Verzeichnis der Tracker und lokalen Speicher",
      "subtitle": "Transparenz über Schlüssel und ihren genauen Zweck",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">Schlüssel / Kennung</th>\n                  <th style=\"padding:10px 12px;\">Typ & Zweck</th>\n                  <th style=\"padding:10px 12px;\">Notwendigkeit</th>\n                  <th style=\"padding:10px 12px;\">Dauer</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">Speichert Zustimmung oder Ablehnung optionaler Cookies</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Unbedingt erforderlich</td>\n                  <td style=\"padding:10px 12px;\">6 Monate</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">Erhält die sichere Benutzersitzung aufrecht (Firebase Auth)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Unbedingt erforderlich</td>\n                  <td style=\"padding:10px 12px;\">Aktive Sitzung</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">Aktive Spracheinstellung (FR, EN, ES, IT, DE, JA, ZH)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Funktional</td>\n                  <td style=\"padding:10px 12px;\">12 Monate</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_dark_mode</td>\n                  <td style=\"padding:10px 12px;\">Gewähltes Design (Dunkel- oder Hellmodus)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Funktional</td>\n                  <td style=\"padding:10px 12px;\">12 Monate</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">Anonymisierte Reichweitenmessung und Performance</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">Optional (Einwilligung)</td>\n                  <td style=\"padding:10px 12px;\">13 Monate</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. Wie können Sie Ihre Einwilligung verwalten oder widerrufen?",
      "subtitle": "Jederzeit garantierte Wahlfreiheit ohne Beeinträchtigung des Hauptdienstes",
      "body": "\n          <p>Gemäß DSGVO ist die <strong>Ablehnung nicht notwendiger Tracker genauso einfach wie deren Annahme</strong>.</p>\n          <p>Sie können das Cookie-Banner jederzeit erneut aufrufen und Ihre Einstellungen anpassen, indem Sie auf die folgende Schaltfläche klicken oder den Link in der Fußzeile nutzen.</p>\n        "
    }
  ]
};

export default cookiesPolicyDe;
