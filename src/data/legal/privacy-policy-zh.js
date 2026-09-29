const privacyPolicyZh = {
  "badge": "个人数据安全保护",
  "title": "隐私政策",
  "subtitle": "清晰透明地了解我们收集哪些数据、为何处理这些数据、在Firebase上的存储期限，以及如何行使您的GDPR权利。",
  "lastUpdated": "2026年9月9日",
  "sections": [
    {
      "id": "section-controller",
      "title": "1. 数据控制者与数据保护专员（DPO）",
      "subtitle": "依据GDPR第4条第7款指定的法定控制人",
      "body": "\n          <p>Troco平台收集的个人数据的法定控制者为：</p>\n          <ul>\n            <li><strong>法定负责人：</strong> Mateo</li>\n            <li><strong>身份：</strong> Troco合作平台创始人兼运营者</li>\n            <li><strong>DPO / 隐私联系邮箱：</strong> <a href=\"mailto:privacy@troco.fr\">privacy@troco.fr</a> 或 <a href=\"mailto:dpo@troco.fr\">dpo@troco.fr</a></li>\n            <li><strong>运营所在地：</strong> 法国（欧盟）</li>\n          </ul>\n        "
    },
    {
      "id": "section-firebase-data",
      "title": "2. 在Google Firebase上收集和存储的明确数据",
      "subtitle": "Firestore、Auth及Cloud Storage存储集合的完整映射",
      "body": "\n          <p>Troco依托Google Firebase安全云服务（位于欧盟境内，<code>europe-west</code>区域），绝不收集多余数据：</p>\n          <div style=\"display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin:16px 0;\">\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">🔐 认证数据（Firebase Auth）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">验证邮箱、唯一用户标识符（<code>uid</code>）、注册时间及最近登录记录。</p>\n            </div>\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">👤 公开档案（<code>users</code>集合）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">用户名、头像、个人简介、提供技能、评分及大致地理范围（无持续GPS追踪）。</p>\n            </div>\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">📦 物品发布与交换（<code>listings</code>集合）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">标题、详细说明、展示照片、Troco代币交换价值或设定的押金。</p>\n            </div>\n            <div style=\"padding:16px; border-radius:14px; background:rgba(198,125,91,0.08); border:1px solid rgba(198,125,91,0.2);\">\n              <h4 style=\"margin:0 0 6px 0; color:#C67D5B; font-size:14.5px; font-weight:700;\">💬 安全私信（<code>chats</code>集合）</h4>\n              <p style=\"margin:0; font-size:13px; line-height:1.5;\">用户之间的私信聊天记录、已读状态及交接时间提议。</p>\n            </div>\n          </div>\n          <p style=\"font-size:13px; color:#8A7A6D;\"><strong>支付安全须知：</strong> Troco不存储任何银行卡信息。所有资金交易均由通过PCI-DSS一级认证的Stripe Payments Europe直接处理。</p>\n        "
    },
    {
      "id": "section-retention",
      "title": "3. 数据存储期限",
      "subtitle": "数据最小化与存储限制原则（GDPR第5条第1款(e)）",
      "body": "\n          <p>数据仅在其收集目的所需的期限内予以保留：</p>\n          <div style=\"overflow-x:auto; margin:16px 0;\">\n            <table style=\"width:100%; border-collapse:collapse; font-size:13.5px; text-align:left;\">\n              <thead>\n                <tr style=\"border-bottom:2px solid rgba(198,125,91,0.3); color:#C67D5B;\">\n                  <th style=\"padding:10px 12px;\">数据类型</th>\n                  <th style=\"padding:10px 12px;\">有效保留期</th>\n                  <th style=\"padding:10px 12px;\">到期处置</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-weight:600;\">活跃账户信息</td>\n                  <td style=\"padding:10px 12px;\">账户存续期间</td>\n                  <td style=\"padding:10px 12px;\">依申请或闲置24个月后删除</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-weight:600;\">已完成或已删除的物品</td>\n                  <td style=\"padding:10px 12px;\">暂存回收站30天</td>\n                  <td style=\"padding:10px 12px;\">永久不可逆彻底清除</td>\n                </tr>\n                <tr style=\"border-bottom:1px solid rgba(232,221,211,0.3);\">\n                  <td style=\"padding:10px 12px; font-weight:600;\">私信交换记录</td>\n                  <td style=\"padding:10px 12px;\">双方账户存续期间</td>\n                  <td style=\"padding:10px 12px;\">任一方注销账户时彻底清除</td>\n                </tr>\n                <tr>\n                  <td style=\"padding:10px 12px; font-weight:600;\">账务记录与Stripe发票</td>\n                  <td style=\"padding:10px 12px;\">10年（法定财务留存要求）</td>\n                  <td style=\"padding:10px 12px;\">安全法定封存归档，严格限制访问</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n        "
    },
    {
      "id": "section-legal-bases",
      "title": "4. 数据处理的合法性依据（GDPR第6条）",
      "subtitle": "每项数据处理行为的法定正当理由",
      "body": "\n          <p>每项数据收集均建立在明确的法律基础之上：</p>\n          <ul>\n            <li><strong>履行合同（第6条第1款(b)）：</strong> 账户创建、物品发布、用户间联系及代币钱包管理。</li>\n            <li><strong>明确同意（第6条第1款(a)）：</strong> 可选分析Cookie、浏览器推送及周边提醒。</li>\n            <li><strong>法定义务（第6条第1款(c)）：</strong> 发票保存与防欺诈。</li>\n            <li><strong>合法利益（第6条第1款(f)）：</strong> 平台技术安全与恶意行为预防。</li>\n          </ul>\n        "
    },
    {
      "id": "section-user-rights",
      "title": "5. 您的GDPR权利与内置自主管理工具",
      "subtitle": "《通用数据保护条例》第15条至第22条规定的各项权利",
      "body": "\n          <p>对于您的个人数据，您享有以下权利：</p>\n          <ul>\n            <li><strong>访问与更正权（第15条与第16条）：</strong> 可随时在个人资料中修改信息。</li>\n            <li><strong>数据可携权（第20条）：</strong> 可在隐私中心一键以开放JSON格式下载您的全部数据。</li>\n            <li><strong>被遗忘权（第17条）：</strong> 无需理由随时自主注销账户并删除发布内容。</li>\n            <li><strong>反对与限制权（第18条与第21条）：</strong> 随时灵活调整Cookie与提醒偏好。</li>\n            <li><strong>向监管机构投诉：</strong> 有权向主管数据保护机构（如法国CNIL）提出申诉。</li>\n          </ul>\n        "
    }
  ]
};

export default privacyPolicyZh;
