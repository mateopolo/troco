const legalNoticeIt = {
  badge: "Informazioni Obbligatorie",
  title: "Note Legali",
  subtitle: "Trasparenza assoluta sull'editore, i fornitori di hosting e le condizioni normative della piattaforma Troco.",
  lastUpdated: "9 settembre 2026",
  sections: [
    {
      id: "section-editor",
      title: "1. Editore della Piattaforma",
      subtitle: "Identificazione legale ai sensi dell'art. 6-III della legge francese LCEN",
      body: `
        <p>Il sito web e l'applicazione raggiungibile su <strong>troco.fr</strong> (di seguito «la Piattaforma Troco») sono editi e gestiti da:</p>
        <ul>
          <li><strong>Direttore della pubblicazione ed Editore:</strong> Mateo</li>
          <li><strong>Ruolo:</strong> Fondatore e gestore della piattaforma collaborativa Troco</li>
          <li><strong>Indirizzo email di corrispondenza:</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> o <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>Attività:</strong> Piattaforma tecnica di intermediazione tra privati per lo scambio di competenze, tempo e prestito di attrezzature.</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. Fornitori di Hosting Tecnico",
      subtitle: "Infrastrutture cloud per l'archiviazione sicura e la distribuzione dei dati",
      body: `
        <p>Per garantire elevata disponibilità e sicurezza delle transazioni, Troco si affida a infrastrutture globali:</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Database Firestore & Cloud</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited, Dublino 4, Irlanda<br />
              Data center: Unione Europea (regione europe-west)<br />
              Sito: <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Hosting Web & CDN Edge</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              Covina, CA 91723, Stati Uniti<br />
              Contatto: <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              Nodi Edge europei ad alta velocità
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. Ruolo di Intermediario Tecnico (LCEN & DSA)",
      subtitle: "Regime di responsabilità dell'hosting per contenuti generati dagli utenti",
      body: `
        <p>Ai sensi dell'art. 6-I-2 della legge LCEN e del Regolamento UE 2022/2065 (Digital Services Act - DSA):</p>
        <ul>
          <li><strong>Intermediazione P2P:</strong> Troco agisce come fornitore di hosting di annunci e profili senza esercitare controllo preventivo generale.</li>
          <li><strong>Assenza di obbligo di sorveglianza:</strong> Troco non ha l'obbligo generale di monitorare le informazioni memorizzate né di ricercare attivamente fatti illeciti.</li>
          <li><strong>Rimozione tempestiva:</strong> Gli utenti possono segnalare contenuti abusivi tramite il pulsante «Segnala», il modulo DSA o scrivendo a <a href="mailto:abuse@troco.fr">abuse@troco.fr</a>.</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. Proprietà Intellettuale & Diritti Riservati",
      subtitle: "Tutela di marchi, interfacce, algoritmi ed elementi grafici",
      body: `
        <p>Tutti gli elementi dell'applicazione Troco (marchio, design, logo, icone, codice sorgente) sono protetti dalle leggi sulla proprietà intellettuale.</p>
        <p>Qualsiasi riproduzione non autorizzata senza consenso scritto è severamente vietata.</p>
      `
    },
    {
      id: "section-contact",
      title: "5. Contatto & Punto di Contatto DSA",
      subtitle: "Canali dedicati a utenti e autorità pubbliche",
      body: `
        <p>Per richieste, segnalazioni di sicurezza o comunicazioni ufficiali:</p>
        <ul>
          <li><strong>Assistenza utenti:</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>Segnalazioni abusi (DSA Art. 11 & 12):</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>Punto di contatto autorità (DSA Art. 11):</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a> (Lingue: francese, inglese)</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeIt;
