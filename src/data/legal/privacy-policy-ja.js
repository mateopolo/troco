const privacyPolicyJa = {
  "badge": "個人情報保護方針",
  "title": "プライバシーポリシー",
  "subtitle": "収集されるデータ、処理の目的、Firebaseでの保管期間、およびGDPR/個人情報保護法に基づく権利の行使方法についてご案内します。",
  "lastUpdated": "2026年9月9日",
  "sections": [
    {
      "id": "section-controller",
      "title": "1. データ管理者およびデータ保護責任者（DPO）",
      "subtitle": "GDPR第4条第7項に基づく法的管理者の表示",
      "body": "\n          <p>Trocoプラットフォームにおける個人データの管理者は以下の通りです：</p>\n          <ul>\n            <li><strong>法的管理者：</strong> Mateo</li>\n            <li><strong>役職：</strong> Troco創設者兼運営責任者</li>\n            <li><strong>プライバシー・DPO連絡先：</strong> <a href=\"mailto:privacy@troco.fr\">privacy@troco.fr</a> または <a href=\"mailto:dpo@troco.fr\">dpo@troco.fr</a></li>\n            <li><strong>事業所在地：</strong> フランス（欧州連合）</li>\n          </ul>\n        "
    },
    {
      "id": "section-firebase-data",
      "title": "2. Google Firebase上で収集・保管されるデータ",
      "subtitle": "Firestore、Auth、Cloud Storageコレクションの網羅的マッピング",
      "body": "\n          <p>Trocoは欧州連合内（<code>europe-west</code>リージョン）のGoogle Firebaseクラウド基盤を使用し、必要最小限のデータのみを収集します：</p>\n          <div style=\"display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin:16px 0;\">\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">🔐 認証データ（Firebase Auth）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">確認済みメールアドレス、一意識別子（<code>uid</code>）、アカウント作成日、最終ログイン日時。</p>\n            </div>\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">👤 公開プロフィール（<code>users</code>コレクション）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">ユーザー名、アイコン画像、自己紹介、提供スキル、評価スコア、おおよその地域範囲（常時GPS追跡は行いません）。</p>\n            </div>\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">📦 出品＆交換（<code>listings</code>コレクション）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">出品タイトル、詳細説明、写真、Trocoトークン価格、設定されたデポジット保証金。</p>\n            </div>\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">💬 安全なメッセージ（<code>chats</code>コレクション）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">交換相手との非公開チャット履歴、既読状態、受け渡し日程の提案。</p>\n            </div>\n          </div>\n          <p style=\"font-size:13px; color:#8A7A6D;\"><strong>決済情報に関する注記：</strong> Trocoはクレジットカード番号を一切保持しません。決済はPCI-DSSレベル1認証を受けたStripe Payments Europeにより直接処理されます。</p>\n        "
    },
    {
      "id": "section-retention",
      "title": "3. データの保管期間",
      "subtitle": "データ最小化および保管制限の原則（GDPR第5条第1項(e)）",
      "body": "\n          <p>データは収集目的に応じて厳格に比例した期間のみ保管されます：</p>\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">データ分類</th>\n                  <th style=\"padding:10px 12px;\">保管期間</th>\n                  <th style=\"padding:10px 12px;\">期限到来時の措置</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-weight:600;\">アクティブユーザーアカウント</td>\n                  <td style=\"padding:10px 12px;\">アカウント有効期間中</td>\n                  <td style=\"padding:10px 12px;\">削除要求時または24ヶ月の休眠後に削除</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-weight:600;\">終了または削除された出品</td>\n                  <td style=\"padding:10px 12px;\">一時ゴミ箱に30日間</td>\n                  <td style=\"padding:10px 12px;\">完全かつ復元不可能な消去</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-weight:600;\">非公開チャットメッセージ</td>\n                  <td style=\"padding:10px 12px;\">該当アカウント存続期間</td>\n                  <td style=\"padding:10px 12px;\">一方のアカウント削除時に完全削除</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-weight:600;\">会計記録およびStripe請求書</td>\n                  <td style=\"padding:10px 12px;\">10年間（法定保管義務）</td>\n                  <td style=\"padding:10px 12px;\">アクセス制限された安全な法定アーカイブ</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-legal-bases",
      "title": "4. 処理の法的根拠（GDPR第6条）",
      "subtitle": "すべてのデータ処理に対する明確な法的根拠",
      "body": "\n          <p>すべてのデータ収集は以下の明確な法的根拠に基づいています：</p>\n          <ul>\n            <li><strong>契約の履行（第6条第1項(b)）：</strong> アカウント作成、出品公開、ユーザー間マッチング、トークン管理。</li>\n            <li><strong>明示的な同意（第6条第1項(a)）：</strong> オプションの分析Cookie、プッシュ通知、近隣アラート。</li>\n            <li><strong>法的義務の遵守（第6条第1項(c)）：</strong> 請求書の保管、不正行為の防止。</li>\n            <li><strong>正当な利益（第6条第1項(f)）：</strong> プラットフォームの技術的セキュリティ維持と不正アカウント検知。</li>\n          </ul>\n        "
    },
    {
      "id": "section-user-rights",
      "title": "5. お客様の権利および自主管理ツール",
      "subtitle": "GDPR第15条〜第22条に定められた各種権利",
      "body": "\n          <p>お客様はご自身の個人データに関して以下の権利を有しています：</p>\n          <ul>\n            <li><strong>アクセスおよび訂正の権利（第15条・第16条）：</strong> プロフィール設定からいつでも編集可能。</li>\n            <li><strong>データポータビリティの権利（第20条）：</strong> プライバシーセンターからワンクリックで全データをJSON形式でダウンロード可能。</li>\n            <li><strong>消去の権利（「忘れられる権利」、第17条）：</strong> 理由の提示なくいつでもアカウントと出品を自己削除可能。</li>\n            <li><strong>異議申立および制限の権利（第18条・第21条）：</strong> Cookieや通知の設定をいつでも変更可能。</li>\n            <li><strong>監督機関への不服申立：</strong> 監督官庁（フランスCNILなど）への申立を行う権利を有します。</li>\n          </ul>\n        "
    }
  ]
};

export default privacyPolicyJa;
