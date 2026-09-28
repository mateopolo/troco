const refundPolicyEs = {
  badge: "Marco Económico y Seguridad",
  title: "Política de Reembolso y Acuerdos P2P",
  subtitle: "Reglas claras sobre compra de fichas, el depósito en garantía temporal (Escrow), cancelaciones y resolución justa de disputas.",
  lastUpdated: "9 de septiembre de 2026",
  sections: [
    {
      id: "section-token-model",
      title: "1. Modelo de Intercambio y Fichas Troco",
      subtitle: "Regla fundamental: 1 hora compartida = 1 Ficha Troco",
      body: `
        <p>Troco funciona según una economía circular y colaborativa:</p>
        <ul>
          <li><strong>Unidad de cuenta universal:</strong> La Ficha Troco es la medida del tiempo compartido. Una hora de ayuda o formación equivale a 1 Ficha, garantizando equidad entre disciplinas.</li>
          <li><strong>No es dinero de curso legal:</strong> Las Fichas Troco no son instrumentos financieros ni dinero electrónico; se destinan únicamente al intercambio de servicios en la plataforma.</li>
          <li><strong>Fichas de bienvenida:</strong> Las fichas iniciales otorgadas a nuevos usuarios son promocionales y en ningún caso canjeables por dinero en efectivo (€).</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. Compras en Euros (€) y Derecho de Desistimiento",
      subtitle: "Normativa legal de consumo aplicable",
      body: `
        <p>Para compras de servicios de pago realizadas directamente en Troco (packs de fichas, suscripciones, destacados):</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Plazo legal de desistimiento de 14 días</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            Dispones de un plazo de 14 días naturales desde la compra para desistir sin necesidad de justificación ni penalizaciones.
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Excepción legal para contenidos digitales consumidos</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            <strong>Cualquier Ficha Troco comprada que ya haya sido transferida o utilizada en un intercambio no es reembolsable</strong>. Únicamente las fichas no gastadas en el saldo pueden reembolsarse de forma proporcional.
          </p>
        </div>
        <p>Para solicitar el reembolso de fichas no consumidas, escribe a <a href="mailto:support@troco.fr">support@troco.fr</a> indicando tu identificador y la referencia de Stripe.</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. Custodia Segura (Escrow) y Cancelaciones",
      subtitle: "Protección automatizada de fichas en cada propuesta",
      body: `
        <p>Para proteger a ambas partes, Troco integra un sistema de custodia temporal (Escrow):</p>
        <ol>
          <li><strong>Propuesta de acuerdo:</strong> Al proponer un acuerdo, las fichas acordadas se retienen en custodia temporal y no se transfieren de inmediato al receptor.</li>
          <li><strong>Cancelación previa:</strong> Antes de la prestación del servicio, cualquiera de las partes puede cancelar y las fichas se reintegran al 100% al emisor sin comisiones.</li>
          <li><strong>Finalización:</strong> Una vez cumplido el servicio, ambas partes confirman la operación y las fichas retenidas se liberan al receptor.</li>
          <li><strong>Incomparecencia:</strong> Si una parte no acude a la cita acordada sin causa justificada, el acuerdo se anula y las fichas vuelven al solicitante.</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. Resolución de Disputas y Mediación P2P",
      subtitle: "Protocolo justo ante desacuerdos sobre servicios o préstamos",
      body: `
        <p>En caso de divergencia entre usuarios sobre la ejecución de un intercambio:</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>Fase amistosa:</strong> Diálogo directo mediante el chat privado seguro de Troco.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>Mediación de Troco:</strong> Si no hay acuerdo tras 48 horas, pulsa «Reportar disputa» o contacta a <a href="mailto:litiges@troco.fr">litiges@troco.fr</a>.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>Arbitraje:</strong> El equipo de moderación analiza los registros y decide en un plazo de 72 horas laborables restituyendo las fichas si procede.</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. Fianzas y Garantías para Préstamo de Material",
      subtitle: "Garantías para herramientas, equipos audiovisuales y maquinaria",
      body: `
        <p>En préstamos de artículos valiosos, el propietario puede requerir una retención de fianza con tarjeta:</p>
        <ul>
          <li><strong>Sin cobro inmediato:</strong> Es una retención temporal de autorización sin cargo en cuenta.</li>
          <li><strong>Liberación inmediata:</strong> Al devolver el equipo en el estado pactado, la retención se cancela de forma íntegra.</li>
          <li><strong>Daños o retrasos:</strong> En caso de desperfectos, debe notificarse a Troco con fotografías en 24h. Ningún cobro es unilateral sin la validación del equipo de mediación.</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyEs;
