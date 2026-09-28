const refundPolicyIt = {
  badge: "Quadro Economico e Sicurezza",
  title: "Politica di Rimborso & Scambi P2P",
  subtitle: "Regole trasparenti su acquisto gettoni, deposito a garanzia (Escrow), cancellazioni e risoluzione equa delle controversie.",
  lastUpdated: "9 settembre 2026",
  sections: [
    {
      id: "section-token-model",
      title: "1. Modello di Scambio & Natura dei Gettoni Troco",
      subtitle: "Regola fondamentale: 1 ora condivisa = 1 Gettone Troco",
      body: `
        <p>Troco si basa su un'economia circolare e collaborativa:</p>
        <ul>
          <li><strong>Unità di misura universale:</strong> Il Gettone Troco misura il tempo condiviso. Un'ora di aiuto o formazione dà diritto a 1 Gettone, garantendo parità tra tutte le abilità.</li>
          <li><strong>Non costituisce valuta legale:</strong> I Gettoni Troco non sono moneta elettronica né strumenti finanziari; sono utilizzabili unicamente all'interno della piattaforma.</li>
          <li><strong>Gettoni promozionali:</strong> I gettoni di benvenuto offerti all'iscrizione non sono in nessun caso convertibili in denaro contante (€).</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. Acquisti in Euro (€) & Diritto di Recesso",
      subtitle: "Disposizioni normative a tutela dei consumatori",
      body: `
        <p>Per i servizi a pagamento acquistati direttamente da Troco (ricariche gettoni, abbonamenti, boost visibilità):</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Termine legale di recesso di 14 giorni</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            Hai a disposizione 14 giorni di calendario dalla data dell'ordine per esercitare il diritto di recesso senza dover fornire motivazioni né corrispondere penali.
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Eccezione legale per contenuti digitali consumati</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            <strong>Qualsiasi Gettone Troco acquistato e già utilizzato o trasferito in un deal P2P non può essere rimborsato</strong>. Possono essere rimborsati pro quota solo i gettoni non ancora spesi e presenti sul saldo.
          </p>
        </div>
        <p>Per richiedere il rimborso dei gettoni non consumati, scrivi a <a href="mailto:support@troco.fr">support@troco.fr</a> indicando il tuo ID utente e l'ID di pagamento Stripe.</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. Deposito a Garanzia (Escrow) & Cancellazioni",
      subtitle: "Protezione automatizzata dei gettoni per ogni proposta",
      body: `
        <p>Per tutelare entrambi i partecipanti, Troco adotta un sistema di deposito a garanzia temporaneo (Escrow):</p>
        <ol>
          <li><strong>Proposta deal:</strong> All'invio della proposta i gettoni vengono bloccati in garanzia e non ancora accreditati alla controparte.</li>
          <li><strong>Cancellazione prima dell'esecuzione:</strong> Ciascuna parte può annullare il deal prima dello svolgimento; i gettoni vengono restituiti al 100% senza spese.</li>
          <li><strong>Conferma:</strong> A prestazione conclusa, la conferma reciproca sblocca immediatamente i gettoni verso il fornitore del servizio.</li>
          <li><strong>Mancata presenza:</strong> In caso di assenza ingiustificata all'appuntamento, il deal viene annullato e i gettoni tornano al richiedente.</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. Risoluzione Controversie & Mediazione Troco",
      subtitle: "Procedura equa in caso di disaccordo sul servizio o prestito",
      body: `
        <p>In caso di disaccordo sull'esecuzione di uno scambio:</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>Fase amichevole diretta:</strong> Comunicazione tramite chat protetta Troco per trovare una soluzione condivisa.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>Richiesta mediazione:</strong> Dopo 48 ore senza intesa, clicca su «Segnala controversia» o scrivi a <a href="mailto:litiges@troco.fr">litiges@troco.fr</a>.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>Arbitrato imparziale:</strong> Il team di moderazione esamina le prove e decide entro 72 ore lavorative riaccreditando i gettoni se dovuto.</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. Pre-Autorizzazione di Cauzione per Attrezzature",
      subtitle: "Garanzie per il prestito di utensili, apparecchiature e strumenti",
      body: `
        <p>Per il prestito di beni di valore il proprietario può richiedere una pre-autorizzazione di cauzione su carta:</p>
        <ul>
          <li><strong>Nessun addebito immediato:</strong> Si tratta di un semplice blocco temporaneo del massimale senza incasso.</li>
          <li><strong>Sblocco immediato:</strong> Alla riconsegna dell'oggetto integro, il blocco decade tempestivamente.</li>
          <li><strong>Danni o mancata resa:</strong> Eventuali anomalie vanno segnalate a Troco con foto entro 24 ore; nessun addebito è applicabile senza previa convalida della mediazione.</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyIt;
