/* =========================================================================
 * ai.js — OpenAI 兼容网关接入（可选增强，无 Key 完全可玩）
 * 用户自填 Key（存 localStorage，不内嵌任何密钥）。
 * 实测端点：https://api.qnaigc.com/v1 · model: qiniu/conatus-free
 * 免费模型偶发 429 全局限流 → 调用方捕获后静默回退预写池。
 * ========================================================================= */
'use strict';

const AI = {
  /* 当前配置（G 未初始化时从 localStorage 读） */
  cfg() {
    if (typeof G !== 'undefined' && G && G.ai) return G.ai;
    return {
      baseUrl: localStorage.getItem('bcos_ai_baseUrl') || 'https://api.qnaigc.com',
      model: localStorage.getItem('bcos_ai_model') || 'qiniu/conatus-free',
      key: localStorage.getItem('bcos_ai_key') || ''
    };
  },

  hasKey() { return !!this.cfg().key; },

  /* 基础对话调用；任何失败抛异常，由调用方兜底 */
  async chat(messages, opts = {}) {
    const c = this.cfg();
    if (!c.key) throw new Error('NO_KEY');
    const body = { stream: false, model: c.model, messages };
    if (opts.response_format) body.response_format = opts.response_format;
    const res = await fetch(c.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeout || 15000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!t) throw new Error('EMPTY_RESPONSE');
    return t;
  },

  /* 数值钳制：非法值回落下限 */
  clamp(v, a, b) {
    v = Math.round(Number(v));
    if (!isFinite(v)) v = a;
    return Math.max(a, Math.min(b, v));
  },

  /* ---- 职业召唤：AI 生成随机职业，Schema 钳制 ±10% 区间 ----
   * 返回职业对象；失败返回 null（调用方回退 FALLBACK_CLASS / FALLBACK_GHOST） */
  async summonClass(ng) {
    const sys =
      '为魔塔小游戏生成一个随机玩家职业。只输出JSON：' +
      '{"name":"职业名(8字内,可爱玩梗)","desc":"一句话档案(30字内)",' +
      '"maxHp":900到1400的整数,"atk":50到75的整数,"def":30到55的整数,' +
      '"skills":["s_fluff","s_debug","s_git","s_review","s_cache"]中随机1-2个id,' +
      '"quip":"登场台词一句(20字内)"}。' +
      (ng ? '主题必须是档案馆幽灵/CRT悬疑风，与数据残骸、绿光、旧终端有关。'
          : '主题随机但必须可爱，禁止与"兔可可"重复。');
    const t = await this.chat(
      [{ role: 'system', content: sys }, { role: 'user', content: '生成一个职业' }],
      { response_format: { type: 'json_object' }, timeout: 20000 });
    const o = JSON.parse(t);
    const VALID = ['s_fluff', 's_debug', 's_git', 's_review', 's_cache'];
    let sk = Array.isArray(o.skills) ? o.skills.filter(s => VALID.includes(s)) : [];
    if (!sk.length) sk = ['s_fluff'];
    return {
      name: String(o.name || '谜之兔').slice(0, 12),
      desc: String(o.desc || '档案缺失的神秘访客。').slice(0, 60),
      maxHp: this.clamp(o.maxHp, 800, 1540),   /* 900~1400 ±10% */
      atk: this.clamp(o.atk, 45, 82),          /* 50~75 ±10% */
      def: this.clamp(o.def, 27, 60),          /* 30~55 ±10% */
      skills: sk.slice(0, 2),
      quip: String(o.quip || '').slice(0, 40),
      ai: true
    };
  },

  /* ---- 项目即兴点评：一两句俏皮吐槽 ----
   * 返回文本；失败返回 null（调用方静默跳过） */
  async comment(repo, lore) {
    const t = await this.chat([
      { role: 'system', content: '你是兔可可，一只可爱的AI兔子档案管理员。用一两句话吐槽这个开源项目，语气俏皮，可以玩梗。直接输出内容，不要引号。' },
      { role: 'user', content: '项目：' + repo + '。简介：' + lore }
    ], { timeout: 15000 });
    return String(t).slice(0, 80);
  }
};

window.AI = AI;
