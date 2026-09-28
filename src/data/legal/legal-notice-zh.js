const legalNoticeZh = {
  badge: "法定公示信息",
  title: "法律声明与平台信息",
  subtitle: "关于Troco协作平台的运营主体、技术托管方及合规监管条件的全面透明公示。",
  lastUpdated: "2026年9月9日",
  sections: [
    {
      id: "section-editor",
      title: "1. 平台运营与发布方",
      subtitle: "依据法国LCEN数字经济信任法第6-III条的法定主体公示",
      body: `
        <p>通过网址 <strong>troco.fr</strong> 访问的网站与网络应用（以下统称“Troco平台”）由以下主体发布并管理：</p>
        <ul>
          <li><strong>发布责任人与运营者：</strong> Mateo</li>
          <li><strong>身份：</strong> Troco协作平台创始人兼运营管理者</li>
          <li><strong>电子通信联络地址：</strong> <a href="mailto:mateo@troco.fr">mateo@troco.fr</a> 或 <a href="mailto:contact@troco.fr">contact@troco.fr</a></li>
          <li><strong>业务性质：</strong> 基于时间银行模型的个人间技能互助、知识交换与设备借用的技术撮合平台。</li>
        </ul>
      `
    },
    {
      id: "section-hosting",
      title: "2. 技术托管与云服务商",
      subtitle: "内容分发与安全数据存储的云基础设施",
      body: `
        <p>为确保高可用性、交易安全及实时同步，Troco依托全球顶尖云技术供应商：</p>
        <div class="legal-grid">
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">数据存储与Firestore数据库</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Google Cloud Platform / Firebase</strong><br />
              Google Ireland Limited（爱尔兰都柏林）<br />
              数据中心所在：欧盟境内（europe-west区域）<br />
              官方网站：<a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
            </p>
          </div>
          <div class="legal-card-sub">
            <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:15px; font-weight:700;">网站托管与边缘分发网络（CDN）</h4>
            <p style="margin:0; font-size:13.5px; line-height:1.55;">
              <strong>Vercel Inc.</strong><br />
              美国加利福尼亚州科维纳<br />
              联络方式：<a href="https://vercel.com/contact" target="_blank" rel="noopener noreferrer">vercel.com/contact</a><br />
              具有欧洲边缘节点的全球分布式架构
            </p>
          </div>
        </div>
      `
    },
    {
      id: "section-intermediary",
      title: "3. 技术中间人与托管者地位（LCEN及欧盟DSA）",
      subtitle: "用户生成内容的平台责任机制与免责范围",
      body: `
        <p>依据欧盟数字服务法（DSA）及法国LCEN法律规范：</p>
        <ul>
          <li><strong>P2P内容托管：</strong> Troco仅作为技术中介托管用户发布的物品、需求、个人档案与站内消息，不对用户发布内容进行普遍性的事前实质审查。</li>
          <li><strong>无普遍监控义务：</strong> 法律并未对Troco施加主动排查违法行为或监控存储信息的普遍义务。</li>
          <li><strong>侵权投诉与迅速下架：</strong> 任何用户若发现违规、违法或欺诈内容，可通过物品页面的“举报”按钮、本页下方的DSA表单或发信至 <a href="mailto:abuse@troco.fr">abuse@troco.fr</a> 进行投诉。Troco获知后将迅速核实并依法下架。</li>
        </ul>
      `
    },
    {
      id: "section-ip",
      title: "4. 知识产权与专有权利声明",
      subtitle: "商标、界面交互设计、算法模型及视觉资产的法律保护",
      body: `
        <p>Troco应用的全部构成要素（包括文字与图形商标、界面设计规范、Logo、图标、文案、数据库和软件源代码）均严格受法国及国际知识产权与著作权法保护。</p>
        <p>未经事先明确书面许可，严禁以任何形式擅自复制、传播、逆向工程或抓取。</p>
      `
    },
    {
      id: "section-contact",
      title: "5. 联络渠道与DSA专属联络点",
      subtitle: "面向广大用户与公共监管机构的专门对接通道",
      body: `
        <p>业务咨询、安全合规举报或官方公函请联系：</p>
        <ul>
          <li><strong>通用用户支持：</strong> <a href="mailto:support@troco.fr">support@troco.fr</a></li>
          <li><strong>违规举报与审核（DSA第11及12条）：</strong> <a href="mailto:abuse@troco.fr">abuse@troco.fr</a></li>
          <li><strong>监管主管机构联络点（DSA第11条）：</strong> <a href="mailto:legal@troco.fr">legal@troco.fr</a>（工作语言：法语、英语）</li>
        </ul>
      `
    }
  ]
};

export default legalNoticeZh;
