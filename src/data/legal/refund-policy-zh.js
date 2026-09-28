const refundPolicyZh = {
  badge: "经济框架与安全保障",
  title: "退款政策与P2P交易条款",
  subtitle: "关于代币购买、临时资金托管机制（Escrow）、协议撤销及争议公正调解的透明规则。",
  lastUpdated: "2026年9月9日",
  sections: [
    {
      id: "section-token-model",
      title: "1. 交换模型与Troco代币本质",
      subtitle: "核心基准：1小时共享时间 ＝ 1个Troco代币",
      body: `
        <p>Troco基于协作式循环经济运行：</p>
        <ul>
          <li><strong>统一计量单位：</strong> Troco代币是衡量共享时间的内部标尺。无论专业领域为何，提供1小时技能教学、咨询或互助均可获得1个代币，确保平等互惠。</li>
          <li><strong>非法定货币属性：</strong> Troco代币非电子货币或金融资产，仅用于平台内部技能与物品交换撮合。</li>
          <li><strong>新手初始礼包：</strong> 注册赠送的免费代币属社区推广福利，不可兑换为法定货币现金（€等）。</li>
        </ul>
      `
    },
    {
      id: "section-fiat-withdrawal",
      title: "2. 欧元（€）购买与法定撤销权（退款）",
      subtitle: "消费者权益保护法规及数字内容除外条款",
      body: `
        <p>对于在Troco直接购买的增值服务（代币包充值、会员订阅、物品置顶）：</p>
        <div class="legal-card-sub" style="margin-bottom:14px;">
          <h4 style="color:#C67D5B; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">14天法定反悔期（无理由撤销）</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            自购买之日起，您享有14个自然日的法定撤销期，无需说明理由，无须承担罚金。
          </p>
        </div>
        <div class="legal-card-sub" style="border:1px solid rgba(217,119,6,0.25); background:rgba(217,119,6,0.08); margin-bottom:14px;">
          <h4 style="color:#D97706; margin:0 0 6px 0; font-size:14.5px; font-weight:700;">已消费数字内容的法定除外</h4>
          <p style="margin:0; font-size:13.5px; line-height:1.55;">
            <strong>任何已在P2P交易中转账或消费的Troco代币均不可申请退款</strong>。仅在账户余额中尚未使用、未流转的代币可按购买比例申请退款。
          </p>
        </div>
        <p>如需申请退还未消费代币，请发送邮件至 <a href="mailto:support@troco.fr">support@troco.fr</a>，并附上您的账户ID和Stripe支付单号。</p>
      `
    },
    {
      id: "section-escrow",
      title: "3. 安全暂托（Escrow）与交易撤销",
      subtitle: "全流程自动化代币安全暂存机制",
      body: `
        <p>为保障交易双方权益，Troco集成安全资金暂托系统（Escrow）：</p>
        <ol>
          <li><strong>发起交易：</strong> 用户A发起交换时，所需代币即从A账户冻结并划入系统暂托池，暂不进入B账户。</li>
          <li><strong>交付前撤回：</strong> 服务未实际履行前，任何一方均可取消交易，暂托代币全额零手续费原路退回A。</li>
          <li><strong>交易确认：</strong> 双方确认服务圆满完成后，暂托代币立即解冻并结算至接收方B。</li>
          <li><strong>无故爽约：</strong> 任何一方未经正当理由缺席预约，该笔交易作废，代币立即归还发起方。</li>
        </ol>
      `
    },
    {
      id: "section-disputes",
      title: "4. P2P纠纷处理与中立调解程序",
      subtitle: "针对服务瑕疵或借用争议的公平裁判准则",
      body: `
        <p>如成员间就履行过程产生争议：</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div class="legal-step">
            <span class="legal-step-num">1</span>
            <div><strong>友好协商阶段：</strong> 通过Troco私信系统积极沟通，寻求自愿和解方案。</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">2</span>
            <div><strong>申请官方调解：</strong> 48小时内无法达成一致，可点击“投诉争议”或发信至 <a href="mailto:litiges@troco.fr">litiges@troco.fr</a> 提交佐证材料。</div>
          </div>
          <div class="legal-step">
            <span class="legal-step-num">3</span>
            <div><strong>裁判与执行：</strong> 审核团队依聊天与系统日志客观裁判，并在72个工作小时内完成代币划转与裁决。</div>
          </div>
        </div>
      `
    },
    {
      id: "section-deposit",
      title: "5. 设备借用信用卡预授权押金",
      subtitle: "贵重工具、摄录器材与电子设备的借用保障",
      body: `
        <p>借用贵重物品时，所有者可申请设定信用卡押金预授权：</p>
        <ul>
          <li><strong>非立即扣款：</strong> 仅冻结相应信用额度，不发生实际扣费。</li>
          <li><strong>归还即时解冻：</strong> 设备完好返还后，押金预授权立即解除。</li>
          <li><strong>损坏扣损争议：</strong> 如有损坏需在24小时内拍照上传报备；未经平台调解团队审核，任何个人不得单方擅自扣款。</li>
        </ul>
      `
    }
  ]
};

export default refundPolicyZh;
