const refundPolicyEn = {
  badge: "Economic Framework & Security",
  title: "Refund Policy & P2P Swaps",
  subtitle: "Clear rules governing token purchases, the temporary escrow mechanism, agreement cancellations, and fair dispute resolution between members.",
  lastUpdated: "September 9, 2026",
  sections: [
    {
      id: "section-token-model",
      title: "1. The Exchange Model & Nature of Troco Tokens",
      subtitle: "Fundamental rule: 1 hour shared = 1 Troco Token",
      body: `
        <p>Troco operates on a collaborative circular economy:</p>
        <ul>
          <li><strong>Universal accounting unit:</strong> The Troco Token is an internal measurement unit of shared time. One hour of assistance, training, coaching, or service renders 1 Troco Token, ensuring fair parity across all skill domains.</li>
          <li><strong>Not legal tender:</strong> Troco Tokens do not constitute financial instruments or electronic money. They are strictly dedicated to facilitating peer-to-peer services on the platform.</li>
          <li><strong>Welcome bonus:</strong> Complimentary starting tokens may be granted to new members to encourage community discovery. These promotional tokens cannot be converted into fiat currency (€).</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. Paid Purchases in Euros (€) & Legal Right of Withdrawal",
      subtitle: "Articles L. 221-18 and L. 221-28 of the French Consumer Code",
      body: `
        <p>For paid services provided directly by Troco (e.g., token packs, Pro subscriptions, listing boosts):</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">14-day legal right of withdrawal</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            In accordance with applicable consumer law, you have a statutory period of 14 calendar days from the purchase date to exercise your right of withdrawal without giving any reason or paying penalties.
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">Legal exception for consumed digital content</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            The right of withdrawal cannot be exercised for digital content whose execution has begun with your express prior consent and formal waiver. Consequently, <strong>any purchased Troco Token that has already been spent, used, or transferred in a P2P deal is non-refundable</strong>. Only unspent tokens remaining on your balance may be refunded pro rata.
          </p>
        </div>
        <p>To exercise your right of withdrawal for unspent tokens, email <a href="mailto:support@troco.fr">support@troco.fr</a> with your user ID and Stripe payment reference. Refunds are processed within 14 days.</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. Secure Escrow & P2P Deal Cancellations",
      subtitle: "Automated token protection during every trade proposal",
      body: `
        <p>To protect both parties in an exchange, Troco incorporates a transactional engine with contractual escrow:</p>
        <ol>
          <li><strong>Deal proposal:</strong> When User A proposes a deal to User B, the agreed Troco tokens are immediately deducted from A's balance and placed into secure escrow. They are not yet credited to B.</li>
          <li><strong>Cancellation before completion:</strong> As long as the service has not been performed or confirmed, either party may cancel the deal. Escrowed tokens are instantly refunded 100% to User A's balance with zero fees.</li>
          <li><strong>Deal completion:</strong> Once the service is successfully provided, both parties confirm completion. The escrowed tokens are immediately released to User B.</li>
          <li><strong>No-Show:</strong> If a party fails to attend the scheduled meeting without legitimate cause, the deal is closed for default and tokens are restored to the requester.</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. P2P Dispute Resolution Procedure & Mediation",
      subtitle: "Fair protocol in case of disagreement over a service or equipment loan",
      body: `
        <p>In case of disagreement between members regarding a swap (non-conforming service, major delay, equipment damage):</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>Direct Amicable Phase:</strong> Both users communicate via Troco's secure in-app messaging to find an agreeable resolution.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>Referral to Troco Mediation:</strong> If no agreement is reached after 48 hours, either party may click "Report a dispute" or email <a href="mailto:litiges@troco.fr">litiges@troco.fr</a> with supporting evidence.</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>Arbitration & Restitution:</strong> The moderation team impartially reviews deal logs and issues a decision within 72 business hours. Valid claims result in escrowed tokens being returned to the aggrieved party.</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. Security Deposit Pre-Authorizations for Equipment",
      subtitle: "Guarantees for tool lending, audiovisual gear, and appliances",
      body: `
        <p>When a deal involves lending valuable equipment, the owner may request a credit card deposit pre-authorization:</p>
        <ul>
          <li><strong>No immediate charge:</strong> The deposit is a simple hold on funds (pre-authorization hold without actual debit).</li>
          <li><strong>Full release upon return:</strong> Once the equipment is returned in its initial mutually agreed state, the deposit hold is immediately released.</li>
          <li><strong>Withholding for damage:</strong> In the event of proven damage or failure to return the item, photographic evidence must be submitted to Troco within 24 hours. No deduction can be made unilaterally without mediation team review.</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyEn;
