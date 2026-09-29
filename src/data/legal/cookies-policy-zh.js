const cookiesPolicyZh = {
  "badge": "隐私与追踪器规范",
  "title": "Cookie与追踪器政策",
  "subtitle": "全面透明说明Troco平台上Cookie、本地存储（localStorage）及同类技术的使用规则。",
  "lastUpdated": "2026年9月9日",
  "manageButton": "管理Cookie偏好设置",
  "sections": [
    {
      "id": "section-definition",
      "title": "1. 什么是Cookie或追踪器？",
      "subtitle": "《电子隐私指令》第5条第3款规定的法律定义",
      "body": "\n          <p>追踪器或Cookie是在用户访问在线服务时在其终端设备（电脑、智能手机、平板等）上存储或读取的信息，用于在一定期限内记录操作偏好与活跃会话。</p>\n          <p>在Troco，我们优先采用<strong>浏览器安全本地存储（localStorage）</strong>，最大程度减少不必要的数据传输，保护您的隐私。</p>\n        "
    },
    {
      "id": "section-table",
      "title": "2. 追踪器与本地存储的完整清单",
      "subtitle": "明确公开所有存储键名及其精准用途",
      "body": "\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">存储键名 / 标识</th>\n                  <th style=\"padding:10px 12px;\">类型与用途</th>\n                  <th style=\"padding:10px 12px;\">必要级别</th>\n                  <th style=\"padding:10px 12px;\">有效期</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_cookie_consent</td>\n                  <td style=\"padding:10px 12px;\">记录对可选Cookie的接受或拒绝决定</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">绝对必需</td>\n                  <td style=\"padding:10px 12px;\">6个月</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">firebase:authUser:*</td>\n                  <td style=\"padding:10px 12px;\">维持安全用户登录会话（Firebase Auth）</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">绝对必需</td>\n                  <td style=\"padding:10px 12px;\">会话期间</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_app_lang</td>\n                  <td style=\"padding:10px 12px;\">当前界面语言首选项（FR, EN, ES, IT, DE, JA, ZH）</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">功能性</td>\n                  <td style=\"padding:10px 12px;\">12个月</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_dark_mode</td>\n                  <td style=\"padding:10px 12px;\">界面主题模式（深色或浅色模式）</td>\n                  <td style=\"padding:10px 12px; color:#2E7D32; font-weight:600;\">功能性</td>\n                  <td style=\"padding:10px 12px;\">12个月</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-family:monospace; font-weight:600;\">troco_analytics_optin</td>\n                  <td style=\"padding:10px 12px;\">匿名访问量统计与页面性能分析</td>\n                  <td style=\"padding:10px 12px; color:#C67D5B; font-weight:600;\">可选（需用户同意）</td>\n                  <td style=\"padding:10px 12px;\">13个月</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-manage",
      "title": "3. 如何管理或撤回您的同意？",
      "subtitle": "保障您随时享有完全自由选择权，绝不降低核心服务质量",
      "body": "\n          <p>依据GDPR规定，<strong>拒绝非必要追踪器与接受一样简便</strong>。</p>\n          <p>您可随时点击下方按钮或通过网页底部的链接重新打开Cookie偏好面板，随时修改您的选择。</p>\n        "
    }
  ]
};

export default cookiesPolicyZh;
