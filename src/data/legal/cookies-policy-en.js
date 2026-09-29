const cookiesPolicyEn = {
  "badge": "Privacy & Trackers",
  "title": "Cookie & Tracker Policy",
  "subtitle": "Complete transparency regarding the use of cookies, local storage (localStorage), and similar technologies on the Troco platform.",
  "lastUpdated": "September 9, 2026",
  "manageButton": "Manage cookie preferences",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. What is a Cookie or Tracker?",
      "subtitle": "Legal definition under Article 5(3) of the ePrivacy Directive",
      "body": "\n          <p>A tracker or cookie is information stored or read on a user's terminal (computer, smartphone, tablet) while browsing an online service. It allows the site to remember your actions, display preferences, and active sessions for a set duration.</p>\n          <p>On Troco, we prioritize <strong>secure browser local storage (localStorage)</strong> to avoid unnecessary network data transfers and protect your privacy.</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. Comprehensive Inventory of Trackers & Local Storage",
      "subtitle": "Transparency regarding local storage keys and their exact purpose",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">Key / Identifier</th>\n                  <th style=\"padding:10px 12px;\">Type & Purpose</th>\n                  <th style=\"padding:10px 12px;\">Necessity</th>\n                  <th style=\"padding:10px 12px;\">Duration</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">Stores acceptance or refusal of optional cookies</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Strictly necessary</td>\n                  <td style=\"padding:10px 12px;\">6 months</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">Maintains secure user session (Firebase Auth)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Strictly necessary</td>\n                  <td style=\"padding:10px 12px;\">Active session</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">Active interface language preference (FR, EN, ES, IT, DE, JA, ZH)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Functional</td>\n                  <td style=\"padding:10px 12px;\">12 months</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_dark_mode</td>\n                  <td style=\"padding:10px 12px;\">Selected display theme (dark or light mode)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Functional</td>\n                  <td style=\"padding:10px 12px;\">12 months</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">Anonymized audience measurement and browsing performance</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">Optional (Consent)</td>\n                  <td style=\"padding:10px 12px;\">13 months</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. How to Manage or Revoke Your Consent?",
      "subtitle": "Guaranteed freedom of choice at any time without degradation of core service",
      "body": "\n          <p>Under CNIL and GDPR guidelines, <strong>refusing non-essential trackers is as simple as accepting them</strong>.</p>\n          <p>You can reopen the consent banner and update your preferences at any time by clicking the button below or via the link in the footer.</p>\n        "
    }
  ]
};

export default cookiesPolicyEn;
