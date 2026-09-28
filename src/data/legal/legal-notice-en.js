const legalNoticeEn = {
  badge: "Mandatory Information",
  title: "Legal Notice",
  subtitle: "Full transparency regarding the publisher, hosting providers, and regulatory terms governing the Troco collaborative platform.",
  lastUpdated: "September 9, 2026",
  sections: [
    {
      id: "section-editor",
      title: "1. Platform Publisher",
      subtitle: "Legal identification under Article 6-III of the French LCEN Act No. 2004-575",
      body: `
        <p>The website and web application accessible at <strong>troco.fr</strong> (hereinafter "the Troco Platform") are published and managed by:</p>
        <ul>
          <li><strong>Publication Director and Publisher:</strong> Mateo</li>
          <li><strong>Status:</strong> Founder and operator of the Troco collaborative platform</li>
          <li><strong>Electronic correspondence address:</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> or <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>Activity:</strong> Technical peer-to-peer intermediary platform for skill sharing, knowledge exchange, and equipment lending based on a time-banking model.</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. Technical Hosting Providers",
      subtitle: "Cloud infrastructure for content distribution and secure data storage",
      body: `
        <p>To guarantee high availability, transaction security, and real-time data synchronization, Troco relies on top-tier global hosting infrastructure:</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Data Storage & Firestore Database</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited<br />
              Gordon House, Barrow Street, Dublin 4, Ireland<br />
              Datacenters: European Union (europe-west region)<br />
              Official website: <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Web Hosting & Edge CDN</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              440 N Barranca Ave #4133<br />
              Covina, CA 91723, United States<br />
              Contact: <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              Global infrastructure with European Edge nodes
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. Technical Intermediary Status (LCEN & DSA)",
      subtitle: "Liability regime for hosting user-generated content",
      body: `
        <p>In accordance with Article 6-I-2 of the French LCEN Act and Regulation (EU) 2022/2065 (Digital Services Act - DSA):</p>
        <ul>
          <li><strong>Hosting peer-to-peer content:</strong> Troco acts solely as a technical intermediary hosting listings, user profiles, reviews, and messages published by its members. Troco does not conduct general ex-ante monitoring of user content.</li>
          <li><strong>No general monitoring obligation:</strong> Troco is not subject to any general obligation to monitor stored data or search for facts indicating unlawful activities.</li>
          <li><strong>Notice and take-down mechanism:</strong> Any user identifying abusive, unlawful, or fraudulent content may report it immediately via the "Report" button on listings/profiles, using the DSA report form below, or by writing to <a href="mailto:abuse@troco.fr">abuse@troco.fr</a>. Upon obtaining actual knowledge of manifestly illegal content, Troco acts expeditiously to remove or disable access to it.</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. Intellectual Property & Reserved Rights",
      subtitle: "Protection of trademarks, design systems, algorithms, and graphic assets",
      body: `
        <p>All elements comprising the Troco application (including the Troco word and figurative marks, UI designs, mockups, logos, icons, animations, editorial content, databases, and software source code) are protected under French and international intellectual property laws.</p>
        <p>Any unauthorized reproduction, distribution, extraction, or modification of these elements without prior express written permission is strictly prohibited and subject to civil and criminal liability.</p>
      `
    },
    {
      id: "section-contact",
      title: "5. Contact & DSA Point of Contact",
      subtitle: "Dedicated communication channels for users and public authorities",
      body: `
        <p>For any inquiries, safety concerns, or official notifications:</p>
        <ul>
          <li><strong>General user support:</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>Abuse reports & moderation (DSA Art. 11 & 12):</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>Public authorities single point of contact (DSA Art. 11):</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a> (Languages accepted: French, English)</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeEn;
