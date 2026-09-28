const refundPolicyDe = {
  badge: "Wirtschaftlicher Rahmen & Sicherheit",
  title: "Rückerstattungsrichtlinie & P2P-Deals",
  subtitle: "Klare Regeln für Token-Käufe, das temporäre Treuhandsystem (Escrow), Stornierungen und faire Streitbeilegung.",
  lastUpdated: "9. September 2026",
  sections: [
    {
      id: "section-token-model",
      title: "1. Tauschmodell & Troco-Tokens",
      subtitle: "Grundregel: 1 geteilte Stunde = 1 Troco-Token",
      body: `
        <p>Troco basiert auf einer kollaborativen Kreislaufwirtschaft:</p>
        <ul>
          <li><strong>Universelle Zeiteinheit:</strong> Ein Troco-Token entspricht einer Stunde Hilfestellung, Schulung oder Dienstleistung – fair und unabhängig vom Fachbereich.</li>
          <li><strong>Kein gesetzliches Zahlungsmittel:</strong> Troco-Tokens sind weder E-Geld noch Finanzinstrumente und dienen ausschließlich dem internen Austausch.</li>
          <li><strong>Startguthaben:</strong> Kostenlos erhaltene Willkommens-Tokens können nicht in Euro ausgezahlt werden.</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. Käufe in Euro (€) & Gesetzliches Widerrufsrecht",
      subtitle: "Verbraucherschutzbestimmungen für digitale Inhalte",
      body: `
        <p>Für kostenpflichtige Leistungen von Troco (Token-Packs, Abonnements, Sichtbarkeits-Boosts):</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">14 Tage gesetzliches Widerrufsrecht</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            Sie haben das Recht, binnen 14 Tagen ab Kaufdatum ohne Angabe von Gründen diesen Vertrag zu widerrufen.
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Ausnahme bei konsumierten digitalen Gütern</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            <strong>Bereits in Deals ausgegebene oder transferierte Troco-Tokens sind vom Widerruf ausgeschlossen</strong>. Nur ungenutzte, auf dem Guthaben verbliebene Tokens können anteilig erstattet werden.
          </p>
        </div>
        <p>Für einen Widerruf wenden Sie sich an <a href="mailto:support@troco.fr">support@troco.fr</a> unter Angabe Ihrer User-ID und Stripe-Referenz.</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. Treuhandservice (Escrow) & Deal-Stornierungen",
      subtitle: "Automatisierter Schutz Ihrer Tokens bei jedem Tausch",
      body: `
        <p>Zum Schutz beider Parteien setzt Troco ein automatisiertes Treuhandsystem ein:</p>
        <ol>
          <li><strong>Deal-Vorschlag:</strong> Tokens werden zunächst auf einem Treuhandkonto reserviert und noch nicht an den Partner übertragen.</li>
          <li><strong>Stornierung vor Erfüllung:</strong> Vor Ausführung kann jede Partei den Deal stornieren; die Tokens werden zu 100% gebührenfrei erstattet.</li>
          <li><strong>Abschluss:</strong> Nach Bestätigung beider Seiten werden die Tokens sofort freigegeben.</li>
          <li><strong>Nichterscheinen:</strong> Bei unentschuldigtem Fehlen wird der Deal storniert und Tokens an den Anfragenden zurückgebucht.</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. Streitbeilegung & Moderation",
      subtitle: "Faires Verfahren bei Meinungsverschiedenheiten",
      body: `
        <p>Bei Unstimmigkeiten über eine Leistung oder Leihgabe:</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>Gütliche Einigung:</strong> Direkter Austausch über den gesicherten Troco-Chat.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>Troco-Mediation:</strong> Nach 48 Stunden ohne Einigung melden Sie den Vorfall an <a href="mailto:litiges@troco.fr">litiges@troco.fr</a>.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>Entscheidung:</strong> Das Moderationsteam prüft die Chat- und Transaktionsprotokolle und entscheidet innerhalb von 72 Werktagsstunden.</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. Kautionsvorautorisierung für Ausrüstung",
      subtitle: "Sicherheiten für Werkzeuge, Foto-/Videogeräte und Maschinen",
      body: `
        <p>Beim Verleih wertvoller Gegenstände kann eine Kautionsreservierung per Kreditkarte verlangt werden:</p>
        <ul>
          <li><strong>Keine Sofortabbuchung:</strong> Es handelt sich lediglich um eine temporäre Betragsvormerkung.</li>
          <li><strong>Sofortige Freigabe:</strong> Bei ordnungsgemäßer Rückgabe wird die Reservierung umgehend storniert.</li>
          <li><strong>Schadensfall:</strong> Schäden müssen Troco binnen 24 Stunden mit Fotos gemeldet werden. Eine Belastung erfolgt nie einseitig ohne Prüfung durch Troco.</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyDe;
