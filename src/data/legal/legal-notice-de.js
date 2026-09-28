const legalNoticeDe = {
  badge: "Pflichtangaben",
  title: "Impressum & Rechtliche Hinweise",
  subtitle: "Vollständige Transparenz bezüglich Herausgeber, Hosting-Dienstleister und Nutzungsbestimmungen der Troco-Plattform.",
  lastUpdated: "9. September 2026",
  sections: [
    {
      id: "section-editor",
      title: "1. Plattformbetreiber & Herausgeber",
      subtitle: "Rechtliche Identifikation gemäß französischem LCEN-Gesetz",
      body: `
        <p>Die Website und Web-App unter <strong>troco.fr</strong> (nachfolgend „Troco-Plattform“) wird herausgegeben und betrieben von:</p>
        <ul>
          <li><strong>Verantwortlicher Herausgeber:</strong> Mateo</li>
          <li><strong>Funktion:</strong> Gründer und Betreiber der kollaborativen Troco-Plattform</li>
          <li><strong>E-Mail-Kontakt:</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> oder <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>Tätigkeit:</strong> Technische Peer-to-Peer-Vermittlungsplattform für den Austausch von Kompetenzen, Zeit und den Verleih von Ausrüstung.</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. Technische Hosting-Dienstleister",
      subtitle: "Cloud-Infrastruktur für Datenverteilung und sichere Speicherung",
      body: `
        <p>Zur Gewährleistung maximaler Verfügbarkeit und Sicherheit nutzt Troco weltweite Cloud-Infrastrukturen:</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Datenspeicherung & Firestore-Datenbank</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited, Dublin 4, Irland<br />
              Rechenzentren: Europäische Union (Region europe-west)<br />
              Website: <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Webhosting & Edge CDN</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              Covina, CA 91723, USA<br />
              Kontakt: <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              Globale Infrastruktur mit europäischen Edge-Knoten
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. Status als technischer Vermittler (LCEN & DSA)",
      subtitle: "Haftungsregime für nutzergenerierte Inhalte (Digital Services Act)",
      body: `
        <p>Gemäß den Bestimmungen der Verordnung (EU) 2022/2065 (Digital Services Act - DSA):</p>
        <ul>
          <li><strong>Host-Provider:</strong> Troco agiert als technischer Vermittler für Inserate und Nutzerprofile ohne generelle Vorabprüfung.</li>
          <li><strong>Keine allgemeine Überwachungspflicht:</strong> Es besteht keine allgemeine Pflicht zur Überwachung gespeicherter Daten.</li>
          <li><strong>Meldung rechtswidriger Inhalte:</strong> Nutzer können rechtswidrige Inhalte über die Schaltfläche „Melden“, das DSA-Formular oder per Mail an <a href="mailto:abuse@troco.fr">abuse@troco.fr</a> melden.</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. Geistiges Eigentum & Urheberrecht",
      subtitle: "Schutz von Marken, Design, Algorithmen und Grafiken",
      body: `
        <p>Alle Elemente der Troco-Plattform (Marken, Designs, Logos, Icons, Quellcode) unterliegen dem Schutz des Urheberrechts und gewerblichen Rechtsschutzes.</p>
        <p>Jede unbefugte Vervielfältigung oder Verbreitung ohne ausdrückliche schriftliche Genehmigung ist untersagt.</p>
      `
    },
    {
      id: "section-contact",
      title: "5. Kontakt & DSA-Kontaktstelle",
      subtitle: "Kommunikationskanäle für Nutzer und Behörden",
      body: `
        <p>Für Anfragen, Sicherheitsmeldungen oder behördliche Mitteilungen:</p>
        <ul>
          <li><strong>Allgemeiner Nutzersupport:</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>Beschwerden & Moderation (DSA Art. 11 & 12):</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>Kontaktstelle für Behörden (DSA Art. 11):</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a> (Sprachen: Französisch, Englisch)</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeDe;
