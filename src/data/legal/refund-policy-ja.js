const refundPolicyJa = {
  badge: "経済的枠組みとセキュリティ",
  title: "返金ポリシー＆P2P取引規約",
  subtitle: "トークン購入、一時エスクロー（預託）の仕組み、合意のキャンセル、公平な紛争解決に関する明確なルール。",
  lastUpdated: "2026年9月9日",
  sections: [
    {
      id: "section-token-model",
      title: "1. 交換モデルとTrocoトークンの性質",
      subtitle: "基本理念：共有された時間1時間 ＝ 1 Trocoトークン",
      body: `
        <p>Trocoは協働型の循環型経済に基づいて運営されています：</p>
        <ul>
          <li><strong>普遍的計算単位：</strong> Trocoトークンは共有時間を測る単位です。1時間の支援やレッスンが1トークンとなり、専門分野に関わらず公平性を保ちます。</li>
          <li><strong>法定通貨ではない点：</strong> 電子マネーや金融商品ではなく、本プラットフォーム上でのサービス仲介のみに使用されます。</li>
          <li><strong>ウェルカムボーナス：</strong> 新規登録時に付与される無料トークンはプロモーション用であり、現金（ユーロ等）への換金はできません。</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. 有料購入と法定クーリングオフ権（返金）",
      subtitle: "消費者保護規定とデジタルコンテンツの適用除外",
      body: `
        <p>Trocoが提供する有料サービス（トークンパック、有料プラン、出品ブースト）：</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">14日間の法定クーリングオフ期間</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            注文日から14日以内であれば、理由を述べることなく購入を撤回できます。
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">使用済みデジタルコンテンツに関する例外</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            <strong>取引やDealにおいてすでに使用・譲渡されたTrocoトークンは返金の対象外です</strong>。アカウント残高に未使用のまま残っているトークンのみが按分して返金されます。
          </p>
        </div>
        <p>未使用トークンの返金を希望する場合は、アカウントIDと決済番号を添えて <a href="mailto:support@troco.fr">support@troco.fr</a> までご連絡ください。</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. 安全なエスクロー預託とDealキャンセル",
      subtitle: "取引成立時までの自動トークン保護",
      body: `
        <p>双方の安全のため、Trocoは自動エスクロー（預託）エンジンを導入しています：</p>
        <ol>
          <li><strong>取引提案時：</strong> 合意されたトークンは提案者の残高から引かれ、一時エスクローに保管されます。まだ相手には渡りません。</li>
          <li><strong>完了前のキャンセル：</strong> サービスの実施前であればいつでもキャンセル可能で、トークンは全額手数料なしで提案者に返却されます。</li>
          <li><strong>取引完了：</strong> 双方が完了を確認した時点で、エスクローのトークンが受取人に解放されます。</li>
          <li><strong>無断欠席（No-Show）：</strong> 正当な理由なく欠席した場合は取引が無効となり、トークンは提案者へ戻されます。</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. 紛争解決手続きとTrocoの調停",
      subtitle: "サービスや貸出に関する見解の相違時の公平プロトコル",
      body: `
        <p>取引内容に関してトラブルが生じた場合：</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>直接の友好的対話：</strong> Trocoの暗号化メッセージで双方が解決を試みます。</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>運営への通報・仲裁依頼：</strong> 48時間以内に合意に至らない場合、「紛争を報告」または <a href="mailto:litiges@troco.fr">litiges@troco.fr</a> へ証憑を提出します。</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>客観的裁定：</strong> モデレーションチームが履歴を審査し、72営業時間以内にトークン返還の可否を決定します。</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. 機器貸出時のクレジットカード保証金（仮売上）",
      subtitle: "工具、撮影機材、家電製品の貸出に対する担保",
      body: `
        <p>高額な機器の貸出において、所有者はクレジットカード枠の一時確保（保証金）を設定できます：</p>
        <ul>
          <li><strong>即時引き落としなし：</strong> 限度額の一時的な確保（仮売上枠）であり、即時決済は行われません。</li>
          <li><strong>返却時の即時解除：</strong> 機材が問題なく返却されたことが確認され次第、確保枠は即時解除されます。</li>
          <li><strong>破損等の場合：</strong> 24時間以内に写真付きでTrocoに報告する必要があります。運営の審査なく一方的に引き落とされることはありません。</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyJa;
