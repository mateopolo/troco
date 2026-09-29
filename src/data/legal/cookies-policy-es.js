const cookiesPolicyEs = {
  "badge": "Privacidad y Rastreadores",
  "title": "Política de Cookies y Rastreadores",
  "subtitle": "Transparencia total sobre el uso de cookies, almacenamiento local (localStorage) y tecnologías similares en la plataforma Troco.",
  "lastUpdated": "9 de septiembre de 2026",
  "manageButton": "Gestionar preferencias de cookies",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. ¿Qué es una Cookie o Rastreador?",
      "subtitle": "Definición legal según el artículo 5-3 de la directiva ePrivacy",
      "body": "\n          <p>Un rastreador o cookie es información almacenada o leída en el terminal del usuario (ordenador, smartphone, tablet) al consultar un servicio web.</p>\n          <p>En Troco, priorizamos el <strong>almacenamiento local seguro del navegador (localStorage)</strong> para evitar transferencias de red innecesarias y preservar su privacidad.</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. Inventario Exhaustivo de Rastreadores y Almacenamiento Local",
      "subtitle": "Transparencia sobre las claves locales y su finalidad exacta",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">Clave / Identificador</th>\n                  <th style=\"padding:10px 12px;\">Tipo y Finalidad</th>\n                  <th style=\"padding:10px 12px;\">Necesidad</th>\n                  <th style=\"padding:10px 12px;\">Duración</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">Guarda la aceptación o rechazo de cookies opcionales</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Estrictamente necesaria</td>\n                  <td style=\"padding:10px 12px;\">6 meses</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">Mantiene la sesión de usuario segura (Firebase Auth)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Estrictamente necesaria</td>\n                  <td style=\"padding:10px 12px;\">Sesión activa</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">Preferencia de idioma activo (FR, EN, ES, IT, DE, JA, ZH)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Funcional</td>\n                  <td style=\"padding:10px 12px;\">12 meses</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_dark_mode</td>\n                  <td style=\"padding:10px 12px;\">Tema visual (modo oscuro o claro)</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">Funcional</td>\n                  <td style=\"padding:10px 12px;\">12 meses</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">Medición anónima de audiencia y rendimiento</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">Opcional (Consentimiento)</td>\n                  <td style=\"padding:10px 12px;\">13 meses</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. ¿Cómo Gestionar o Revocar su Consentimiento?",
      "subtitle": "Libertad de elección garantizada en cualquier momento sin degradación del servicio",
      "body": "\n          <p>Conforme a las directivas del RGPD, <strong>rechazar las cookies no necesarias es tan sencillo como aceptarlas</strong>.</p>\n          <p>Puede volver a abrir el banner de consentimiento y cambiar su decisión en cualquier momento pulsando el botón a continuación o desde el pie de página.</p>\n        "
    }
  ]
};

export default cookiesPolicyEs;
