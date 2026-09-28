const legalNoticeEs = {
  badge: "Información Obligatoria",
  title: "Aviso Legal",
  subtitle: "Total transparencia sobre el editor, proveedores técnicos y condiciones regulatorias de la plataforma colaborativa Troco.",
  lastUpdated: "9 de septiembre de 2026",
  sections: [
    {
      id: "section-editor",
      title: "1. Editor de la Plataforma",
      subtitle: "Identificación legal conforme al artículo 6-III de la ley francesa LCEN",
      body: `
        <p>El sitio web y la aplicación accesible en <strong>troco.fr</strong> (en adelante «la Plataforma Troco») son editados y administrados por:</p>
        <ul>
          <li><strong>Director de la publicación y Editor:</strong> Mateo</li>
          <li><strong>Cualidad:</strong> Fundador y operador de la plataforma colaborativa Troco</li>
          <li><strong>Dirección de correo electrónico:</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> o <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>Actividad:</strong> Plataforma de intermediación técnica entre particulares para el intercambio de habilidades, conocimientos y préstamo de equipamiento basado en el banco de tiempo.</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. Proveedores de Alojamiento Técnico",
      subtitle: "Infraestructuras en la nube para la distribución y almacenamiento seguro de datos",
      body: `
        <p>Para garantizar una alta disponibilidad, seguridad en las transacciones y replicación en tiempo real, Troco recurre a proveedores líderes mundiales:</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Alojamiento de Datos y Base Firestore</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited<br />
              Gordon House, Barrow Street, Dublín 4, Irlanda<br />
              Centros de datos: Unión Europea (región europe-west)<br />
              Sitio oficial: <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">Alojamiento Web y CDN Edge</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              440 N Barranca Ave #4133<br />
              Covina, CA 91723, Estados Unidos<br />
              Contacto: <a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              Infraestructura global con nodos Edge europeos
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. Estatuto de Intermediario Técnico (LCEN y DSA)",
      subtitle: "Régimen de responsabilidad del alojador de contenidos generados por usuarios",
      body: `
        <p>De conformidad con el artículo 6-I-2 de la Ley LCEN y el Reglamento Europeo (UE) 2022/2065 (Digital Services Act - DSA):</p>
        <ul>
          <li><strong>Alojamiento de contenidos P2P:</strong> Troco actúa exclusivamente como intermediario técnico alojando anuncios, perfiles, valoraciones y mensajes publicados por sus miembros. Troco no realiza un control a priori general de los contenidos.</li>
          <li><strong>Ausencia de obligación general de supervisión:</strong> Troco no está sujeto a una obligación general de supervisar los datos almacenados ni de buscar activamente hechos ilícitos.</li>
          <li><strong>Notificación y retirada diligente:</strong> Cualquier usuario que detecte contenido abusivo, ilícito o fraudulento puede denunciarlo de inmediato mediante el botón «Denunciar», a través del formulario DSA siguiente o escribiendo a <a href="mailto:abuse@troco.fr">abuse@troco.fr</a>.</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. Propiedad Intelectual y Derechos Reservados",
      subtitle: "Protección de marcas, interfaces, algoritmos y elementos gráficos",
      body: `
        <p>Todos los elementos que componen la aplicación Troco (en particular la marca verbal y gráfica Troco, diseño, logos, iconos, textos, bases de datos y código fuente) están protegidos por las leyes de propiedad intelectual.</p>
        <p>Cualquier reproducción o uso no autorizado sin consentimiento previo expreso por escrito queda estrictamente prohibido.</p>
      `
    },
    {
      id: "section-contact",
      title: "5. Contacto y Punto de Contacto DSA",
      subtitle: "Canales de comunicación dedicados para usuarios y autoridades",
      body: `
        <p>Para consultas, notificaciones de seguridad o comunicaciones oficiales:</p>
        <ul>
          <li><strong>Soporte al usuario general:</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>Moderación y abusos (DSA Art. 11 y 12):</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>Punto de contacto para autoridades públicas (DSA Art. 11):</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a> (Idiomas: francés, inglés)</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeEs;
