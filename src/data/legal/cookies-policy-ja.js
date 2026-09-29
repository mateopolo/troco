const cookiesPolicyJa = {
  "badge": "プライバシーとトラッカー保護",
  "title": "Cookieおよびトラッカーポリシー",
  "subtitle": "TrocoプラットフォームにおけるCookie、ローカルストレージ（localStorage）および関連技術の利用に関する完全な透明性。",
  "lastUpdated": "2026年9月9日",
  "manageButton": "Cookie設定を管理する",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. Cookieおよびトラッカーとは？",
      "subtitle": "欧州ePrivacy指令第5条第3項に基づく法的定義",
      "body": "\n          <p>トラッカーまたはCookieとは、オンラインサービス閲覧時にお客様の端末（PC、スマートフォン、タブレット等）に保存または読み出される情報です。利用者の操作、表示設定、アクティブなセッションを一定期間保持します。</p>\n          <p>Trocoでは、不要なネットワーク通信を削減しプライバシーを保護するため、<strong>ブラウザの安全なローカルストレージ（localStorage）</strong>を優先的に活用しています。</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. トラッカーおよびローカルストレージの網羅的一覧",
      "subtitle": "保管されるキーとその利用目的の完全な透明性",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">キー / 識別子</th>\n                  <th style=\"padding:10px 12px;\">種類と利用目的</th>\n                  <th style=\"padding:10px 12px;\">必要性</th>\n                  <th style=\"padding:10px 12px;\">保持期間</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">Cookie同意または拒否の設定状態の保存</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">必須（不可欠）</td>\n                  <td style=\"padding:10px 12px;\">6ヶ月間</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">安全なユーザーログインセッションの維持（Firebase Auth）</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">必須（不可欠）</td>\n                  <td style=\"padding:10px 12px;\">アクティブセッション中</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">選択中のUI表示言語（FR, EN, ES, IT, DE, JA, ZH）</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">機能的設定</td>\n                  <td style=\"padding:10px 12px;\">12ヶ月間</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_dark_mode</td>\n                  <td style=\"padding:10px 12px;\">画面テーマ設定（ダークモードまたはライトモード）</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">機能的設定</td>\n                  <td style=\"padding:10px 12px;\">12ヶ月間</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">匿名化されたアクセス分析および表示パフォーマンス改善</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">任意（要同意）</td>\n                  <td style=\"padding:10px 12px;\">13ヶ月間</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. 同意の管理および撤回方法",
      "subtitle": "主要サービスの品質を損なうことなくいつでも自由に選択可能",
      "body": "\n          <p>GDPRおよびプライバシー基準に基づき、<strong>不要なトラッカーの拒否は同意と同様に簡単に行えます</strong>。</p>\n          <p>以下のボタンをクリックするか、ページ下部のフッターリンクからいつでもCookie設定パネルを開き、選択内容を変更できます。</p>\n        "
    }
  ]
};

export default cookiesPolicyJa;
