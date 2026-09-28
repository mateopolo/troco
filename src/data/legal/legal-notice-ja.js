const legalNoticeJa = {
  badge: "法的義務情報",
  title: "法的通知（免責事項・運営者情報）",
  subtitle: "Troco共同プラットフォームの運営者、技術ホスティング事業者、および規制条件に関する完全な透明性。",
  lastUpdated: "2026年9月9日",
  sections: [
    {
      id: "section-editor",
      title: "1. プラットフォーム運営者",
      subtitle: "仏LCEN法第6条に基づく法的身元表示",
      body: `
        <p><strong>troco.fr</strong> でアクセス可能なウェブサイトおよびアプリ（以下「Trocoプラットフォーム」）は、以下によって運営・管理されています：</p>
        <ul>
          <li><strong>発行責任者・運営者：</strong> Mateo</li>
          <li><strong>役職：</strong> Troco協働プラットフォーム創設者兼運営責任者</li>
          <li><strong>電子メール連絡先：</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> または <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>事業内容：</strong> 時間共有モデルに基づく個人間のスキル交換、知識共有、機器貸出のための技術的仲介プラットフォーム。</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. 技術ホスティング事業者",
      subtitle: "クラウド配信基盤および安全なデータ保管環境",
      body: `
        <p>高可用性、取引セキュリティ、リアルタイム同期を確保するため、Trocoは世界トップ水準のクラウド基盤を採用しています：</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">データ保管＆Firestoreデータベース</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited（アイルランド・ダブリン）<br />
              データセンター：欧州連合（europe-westリージョン）<br />
              公式サイト：<a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">ウェブホスティング＆Edge CDN</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              米国カリフォルニア州コビーナ<br />
              連絡先：<a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              欧州エッジノードを備えたグローバル配信基盤
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. 技術仲介者の位置付け（LCEN法＆欧州DSA）",
      subtitle: "ユーザー投稿コンテンツに対するホスティング事業者の責任範囲",
      body: `
        <p>欧州デジタルサービス法（DSA）およびフランスLCEN法の規定に基づき：</p>
        <ul>
          <li><strong>P2Pコンテンツのホスティング：</strong> Trocoはユーザーが投稿した出品、プロフィール、メッセージを保管・仲介する技術提供者であり、事前の網羅的検閲は行いません。</li>
          <li><strong>一般的監視義務の不存在：</strong> 保存された情報を能動的に常時監視する一般的義務を負いません。</li>
          <li><strong>違法コンテンツの通報と迅速な削除：</strong> 違法・不正なコンテンツを発見した場合、各出品の「通報」ボタン、下記のDSAフォーム、または <a href="mailto:abuse@troco.fr">abuse@troco.fr</a> へ通知できます。 Trocoは違法性を認識次第、迅速に対処します。</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. 知的財産権および著作権",
      subtitle: "商標、UIデザイン、アルゴリズム、グラフィック資産の保護",
      body: `
        <p>Trocoプラットフォームを構成するすべての要素（商標、UIデザイン、ロゴ、アイコン、ソースコード等）は知的財産法により保護されています。</p>
        <p>事前の書面による同意のない無断複製、改変、配布は法律で禁じられています。</p>
      `
    },
    {
      id: "section-contact",
      title: "5. お問い合わせ窓口＆DSA連絡窓口",
      subtitle: "ユーザーおよび公的機関向けの専用連絡チャネル",
      body: `
        <p>情報請求、安全に関する通報、または公的連絡先：</p>
        <ul>
          <li><strong>一般ユーザーサポート：</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>不正・不適切通報（DSA第11条・12条）：</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>公的機関向け連絡先（DSA第11条）：</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a>（対応言語：フランス語、英語）</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeJa;
