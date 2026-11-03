/* =====================================================================
   لعبة بغداد — property trading board game set in Baghdad
   Prices in "million IQD" (م)
   ===================================================================== */
const BG_GROUPS = [
  { c: '#8b5a2b', h: 50 }, { c: '#7dd3fc', h: 50 }, { c: '#f472b6', h: 100 }, { c: '#fb923c', h: 100 },
  { c: '#ef4444', h: 150 }, { c: '#facc15', h: 150 }, { c: '#22c55e', h: 200 }, { c: '#1e3a8a', h: 200 }
];
const P_ = (n, g, pr, r) => ({ t: 'p', n, g, pr, r });
const BG_SQ = [
  { t: 'go', n: 'انطلاق', sub: 'استلم الراتب' },
  P_('مدينة الصدر', 0, 60, [2, 10, 30, 90, 160, 250]),
  { t: 'cc', n: 'صندوق المحلة' },
  P_('الشعلة', 0, 60, [4, 20, 60, 180, 320, 450]),
  { t: 'tax', n: 'ضريبة الدخل', amt: 200 },
  { t: 'tr', n: 'كراج العلاوي', pr: 200 },
  P_('البياع', 1, 100, [6, 30, 90, 270, 400, 550]),
  { t: 'ch', n: 'حظ' },
  P_('الدورة', 1, 100, [6, 30, 90, 270, 400, 550]),
  P_('حي العامل', 1, 120, [8, 40, 100, 300, 450, 600]),
  { t: 'jail', n: 'السجن', sub: 'زيارة فقط' },
  P_('الكاظمية', 2, 140, [10, 50, 150, 450, 625, 750]),
  { t: 'ut', n: 'المولدة الأهلية', pr: 150 },
  P_('باب المعظم', 2, 140, [10, 50, 150, 450, 625, 750]),
  P_('شارع الرشيد', 2, 160, [12, 60, 180, 500, 700, 900]),
  { t: 'tr', n: 'محطة قطار بغداد', pr: 200 },
  P_('بغداد الجديدة', 3, 180, [14, 70, 200, 550, 750, 950]),
  { t: 'cc', n: 'صندوق المحلة' },
  P_('شارع فلسطين', 3, 180, [14, 70, 200, 550, 750, 950]),
  P_('الأعظمية', 3, 200, [16, 80, 220, 600, 800, 1000]),
  { t: 'free', n: 'كورنيش أبو نؤاس', sub: 'استراحة' },
  P_('السعدون', 4, 220, [18, 90, 250, 700, 875, 1050]),
  { t: 'ch', n: 'حظ' },
  P_('الكرادة', 4, 220, [18, 90, 250, 700, 875, 1050]),
  P_('حي الجامعة', 4, 240, [20, 100, 300, 750, 925, 1100]),
  { t: 'tr', n: 'كراج النهضة', pr: 200 },
  P_('القادسية', 5, 260, [22, 110, 330, 800, 975, 1150]),
  P_('اليرموك', 5, 260, [22, 110, 330, 800, 975, 1150]),
  { t: 'ut', n: 'إسالة الماء', pr: 150 },
  P_('زيونة', 5, 280, [24, 120, 360, 850, 1025, 1200]),
  { t: 'gtj', n: 'إلى السجن!' },
  P_('العرصات', 6, 300, [26, 130, 390, 900, 1100, 1275]),
  P_('الحارثية', 6, 300, [26, 130, 390, 900, 1100, 1275]),
  { t: 'cc', n: 'صندوق المحلة' },
  P_('شارع 14 رمضان', 6, 320, [28, 150, 450, 1000, 1200, 1400]),
  { t: 'tr', n: 'مطار بغداد', pr: 200 },
  { t: 'ch', n: 'حظ' },
  P_('المنصور', 7, 350, [35, 175, 500, 1100, 1300, 1500]),
  { t: 'tax', n: 'فاتورة المولدة', amt: 100 },
  P_('الجادرية', 7, 400, [50, 200, 600, 1400, 1700, 2000]),
];
const BG_ICON = { go: '🏁', cc: '📦', ch: '❓', tax: '🧾', tr: '🚌', ut: '💡', jail: '🚔', free: '🌴', gtj: '👮' };
const BG_TR = BG_SQ.map((s, i) => s.t === 'tr' ? i : -1).filter(i => i >= 0);
const BG_UT = BG_SQ.map((s, i) => s.t === 'ut' ? i : -1).filter(i => i >= 0);
const bgGroup = g => BG_SQ.map((s, i) => s.t === 'p' && s.g === g ? i : -1).filter(i => i >= 0);
const BG_BUYABLE = s => s.t === 'p' || s.t === 'tr' || s.t === 'ut';
const BG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
const bgM = v => fmt(v) + 'م';
const BG_CH = [
  { x: 'انطلق إلى نقطة الانطلاق واستلم الراتب', m: 0 },
  { x: 'موعد في الجادرية — اذهب إليها', m: 39 },
  { x: 'اذهب للتسوّق في الكرادة', m: 23 },
  { x: 'جولة في شارع الرشيد والمتنبي', m: 14 },
  { x: 'رحلة طيران! اذهب إلى مطار بغداد', m: 35 },
  { x: 'اذهب إلى أقرب كراج أو محطة', nt: 1 },
  { x: 'زحمة على جسر الجمهورية! ارجع 3 خانات', mv: -3 },
  { x: 'مخالفة سرعة على طريق محمد القاسم — اذهب إلى السجن', jail: 1 },
  { x: 'واسطة قوية! بطاقة خروج من السجن مجاناً', free: 1 },
  { x: 'ربحت جائزة مسابقة رمضانية', $: 150 },
  { x: 'غرامة وقوف في ساحة التحرير', $: -15 },
  { x: 'صيانة عقاراتك: ادفع 25 عن كل بيت و100 عن كل برج', rep: [25, 100] },
  { x: 'صرت مختار المحلة! ادفع 50 لكل لاعب', each: -50 },
  { x: 'أرباح محلّك في الشورجة', $: 50 },
];
const BG_CC = [
  { x: 'عيدية من الأقارب', $: 100 },
  { x: 'تصليح المولدة', $: -50 },
  { x: 'ورث من جدّك في الكاظمية', $: 100 },
  { x: 'خطأ في المصرف لصالحك', $: 200 },
  { x: 'مراجعة طبيب في شارع السعدون', $: -50 },
  { x: 'بعت سيارتك القديمة في سوق مريدي', $: 50 },
  { x: 'عيد ميلادك! كل لاعب يهديك 10', each: 10 },
  { x: 'رسوم المدرسة الأهلية', $: -50 },
  { x: 'استرداد ضريبة', $: 20 },
  { x: 'شجار في السوق — اذهب إلى السجن', jail: 1 },
  { x: 'معارفك أخرجوك! بطاقة خروج من السجن', free: 1 },
  { x: 'وليمة عرس كبيرة في الديوانية', $: -100 },
  { x: 'اشتغلت ساعات إضافية', $: 100 },
  { x: 'فزت بمسابقة أجمل حديقة بيت', $: 25 },
  { x: 'ارجع إلى نقطة الانطلاق واستلم الراتب', m: 0 },
];

class BGEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) {
    super('bg', pub, hostP, round, cfg); this.sidN = 0; this.animN = 0; this.decks = { ch: [], cc: [] };
    Object.assign(this.S, { ph: 'wait', own: Array(40).fill(null), turn: -1, step: '', dice: [1, 1], did: 0, dbl: 0, ldbl: 0, anim: null, card: null, offer: -1, pot: 0, rnd: 1, log: [], cred: null, rank: null, debt: 0 });
    this.syncBots();
  }
  newSeat(x, bot) { return Object.assign({ p: x.p, n: x.n, a: x.a, sid: this.sidN++, ch: this.cfg.start, pos: 0, jail: 0, jc: 0, bk: 0 }, bot ? { bot: 1 } : {}); }
  syncBots() { const S = this.S; if (S.ph !== 'wait') return; let bots = S.seats.filter(s => s.bot); while (bots.length < this.cfg.bots && S.seats.length < 6) { const b = this.botSeat({}); S.seats.push(Object.assign(b, this.newSeat(b, true))); bots = S.seats.filter(s => s.bot); } while (bots.length > this.cfg.bots) { const b = bots.pop(); S.seats.splice(S.seats.indexOf(b), 1); } }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph === 'wait') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => s.bot || !s.out); if (n0 !== S.seats.length) ch = true;
      for (const x of list) { if (S.seats.find(s => s.p === x.p)) continue; if (S.seats.length >= 6) { const b = S.seats.filter(s => s.bot).pop(); if (!b) break; S.seats.splice(S.seats.indexOf(b), 1); } S.seats.push(this.newSeat(x)); ch = true; }
    } else if (S.ph === 'play') { const c = S.seats[S.turn]; if (c && c.out) this.schedBot(); }
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  onCfg() { if (this.S.ph === 'wait') this.syncBots(); }
  onChips(s) { if (this.S.ph === 'play' && this.S.seats[this.S.turn] === s && this.S.step === 'debt' && s.ch >= 0) this.afterLand(); }
  onKick(p, i) {
    const S = this.S; if (i < 0) return false; const s = S.seats[i];
    if (S.ph === 'play') { s.out = 1; s.kicked = 1; this.bankrupt(s, null, true); return true; }
    S.seats.splice(i, 1); return false;
  }
  seatBySid(sid) { return this.S.seats.find(s => s.sid === sid); }
  cur() { return this.S.seats[this.S.turn]; }
  log(t) { const L = this.S.log; L.push(t); if (L.length > 7) L.shift(); }
  alive() { return this.S.seats.filter(s => !s.bk); }
  /* ---------- game flow ---------- */
  start() {
    const S = this.S; if (S.ph === 'play') return; this.syncBots();
    S.seats = S.seats.filter(s => s.bot || !s.out); if (S.seats.length < 2) return;
    S.round++; S.seats.forEach(s => Object.assign(s, { ch: this.cfg.start, pos: 0, jail: 0, jc: 0, bk: 0 }));
    S.own = Array(40).fill(null); S.pot = 0; S.rnd = 1; S.log = []; S.rank = null; S.card = null; S.offer = -1; S.anim = null;
    this.decks = { ch: pkShuffle(BG_CH.map((_, i) => i)), cc: pkShuffle(BG_CC.map((_, i) => i)) };
    S.ph = 'play'; S.turn = Math.floor(Math.random() * S.seats.length);
    this.log('🏁 بدأت لعبة بغداد! بالتوفيق للجميع'); this.beginTurn();
  }
  beginTurn() { const S = this.S, s = this.cur(); S.dbl = 0; S.ldbl = 0; S.offer = -1; this.setStep(s.jail ? 'jail' : 'roll'); }
  setStep(st) {
    const S = this.S; S.step = st; const s = this.cur();
    if (this.cfg.turn && st !== 'move' && s && !s.bot && !s.out) this.timer(this.cfg.turn * 1000); else this.untimer();
    this.commit(); this.schedBot();
  }
  botTok() { const S = this.S; return [S.ph, S.turn, S.step, S.did, S.card ? S.card.id : 0, S.log.length, S.anim ? S.anim.id : 0].join(':'); }
  schedBot() { const S = this.S, s = this.cur(); if (S.ph !== 'play' || !s || !(s.bot || s.out) || S.step === 'move') return; const tok = this.botTok(); if (this.botPending === tok) return; this.botPending = tok; this.later(() => { if (this.botPending === tok) this.botPending = null; if (this.botTok() === tok) this.botStep(); }, s.out ? 700 : 1000 + Math.random() * 600); }
  roll(s) {
    const S = this.S; const r = new Uint32Array(2); crypto.getRandomValues(r); const a = r[0] % 6 + 1, b = r[1] % 6 + 1, d = a === b;
    S.dice = [a, b]; S.did++; S.ldbl = d ? 1 : 0;
    if (S.step === 'jail') {
      if (d) { s.jail = 0; this.log(`🎲 ${s.n} رمى دبل وخرج من السجن`); S.ldbl = 0; return this.move(s, a + b); }
      s.jail++; if (s.jail > 3) { this.pay(s, null, 50, 'غرامة'); s.jail = 0; this.log(`${s.n} دفع 50م وخرج من السجن`); S.ldbl = 0; return this.move(s, a + b); }
      this.log(`🎲 ${s.n} لم يرمِ دبل — يبقى في السجن`); return this.setStep('end');
    }
    if (d) { S.dbl++; if (S.dbl >= 3) { this.log(`🚔 ${s.n} رمى دبل 3 مرات! إلى السجن`); return this.toJail(s); } }
    this.move(s, a + b);
  }
  move(s, steps) { const to = (s.pos + steps + 40) % 40; this.moveTo(s, to, steps > 0, steps); }
  moveTo(s, to, collect, steps) {
    const S = this.S, from = s.pos; if (steps === undefined) steps = (to - from + 40) % 40;
    if (collect && steps > 0 && (to < from || steps >= 40)) { s.ch += this.cfg.salary; this.log(`💵 ${s.n} استلم الراتب ${bgM(this.cfg.salary)}`); }
    s.pos = to; S.anim = { sid: s.sid, from, to, n: steps, id: ++this.animN };
    this.setStep('move');
    this.later(() => this.land(s), Math.min(12, Math.abs(steps)) * 170 + 450);
  }
  toJail(s) { const S = this.S; const from = s.pos; s.pos = 10; s.jail = 1; S.dbl = 0; S.ldbl = 0; S.anim = { sid: s.sid, from, to: 10, n: 0, id: ++this.animN }; this.setStep('end'); }
  pay(from, to, amt, why) { const S = this.S; from.ch -= amt; if (to) to.ch += amt; else if (this.cfg.pot && why !== 'شراء' && why !== 'بناء' && why !== 'فك') S.pot += amt; }
  rent(i, s) {
    const S = this.S, sq = BG_SQ[i], o = S.own[i]; if (!o || o[2]) return 0; const sid = o[0];
    if (sq.t === 'p') { if (o[1] > 0) return sq.r[o[1]]; const full = bgGroup(sq.g).every(j => S.own[j] && S.own[j][0] === sid); return full ? sq.r[0] * 2 : sq.r[0]; }
    if (sq.t === 'tr') { const n = BG_TR.filter(j => S.own[j] && S.own[j][0] === sid).length; return 25 * Math.pow(2, n - 1); }
    if (sq.t === 'ut') { const n = BG_UT.filter(j => S.own[j] && S.own[j][0] === sid).length; return (S.dice[0] + S.dice[1]) * (n === 2 ? 10 : 4); }
    return 0;
  }
  land(s) {
    const S = this.S; if (S.ph !== 'play' || this.cur() !== s) return; const i = s.pos, sq = BG_SQ[i];
    if (BG_BUYABLE(sq)) {
      const o = S.own[i];
      if (!o) { if (s.ch >= sq.pr) { S.offer = i; return this.setStep('buy'); } this.log(`${s.n} لا يملك ما يكفي لشراء ${sq.n}`); return this.afterLand(); }
      if (o[0] !== s.sid && !o[2]) { const ow = this.seatBySid(o[0]); if (ow && !ow.bk) { const r = this.rent(i, s); this.pay(s, ow, r, 'إيجار'); S.cred = ow.sid; this.log(`🏠 ${s.n} دفع إيجار ${bgM(r)} لـ ${ow.n} (${sq.n})`); } }
      return this.afterLand();
    }
    if (sq.t === 'tax') { this.pay(s, null, sq.amt, 'ضريبة'); S.cred = null; this.log(`🧾 ${s.n} دفع ${sq.n} ${bgM(sq.amt)}`); return this.afterLand(); }
    if (sq.t === 'gtj') { this.log(`👮 ${s.n} ذهب إلى السجن`); return this.toJail(s); }
    if (sq.t === 'free' && this.cfg.pot && S.pot > 0) { s.ch += S.pot; this.log(`🌴 ${s.n} ربح جائزة الكورنيش ${bgM(S.pot)}!`); S.pot = 0; return this.afterLand(); }
    if (sq.t === 'ch' || sq.t === 'cc') return this.card(s, sq.t);
    this.afterLand();
  }
  card(s, k) {
    const S = this.S, dk = this.decks[k]; if (!dk.length) this.decks[k] = pkShuffle((k === 'ch' ? BG_CH : BG_CC).map((_, i) => i)); const ci = this.decks[k].shift(); const c = (k === 'ch' ? BG_CH : BG_CC)[ci];
    if (!c.free) this.decks[k].push(ci);
    S.card = { k, x: c.x, id: (S.card ? S.card.id : 0) + 1, who: s.n }; this.log(`${k === 'ch' ? '❓' : '📦'} ${s.n}: ${c.x}`);
    this.commit();
    this.later(() => {
      if (c.m !== undefined) return this.moveTo(s, c.m, true);
      if (c.mv) return this.move(s, c.mv);
      if (c.nt) { let j = s.pos; do { j = (j + 1) % 40; } while (BG_SQ[j].t !== 'tr'); return this.moveTo(s, j, true); }
      if (c.jail) return this.toJail(s);
      if (c.free) { s.jc++; return this.afterLand(); }
      if (c.$) { if (c.$ > 0) s.ch += c.$; else { this.pay(s, null, -c.$, 'بطاقة'); S.cred = null; } return this.afterLand(); }
      if (c.each) { this.alive().forEach(o => { if (o === s) return; if (c.each > 0) { o.ch -= c.each; s.ch += c.each; } else { s.ch += c.each; o.ch -= c.each; } }); S.cred = null; return this.afterLand(); }
      if (c.rep) { let t = 0; S.own.forEach(o => { if (o && o[0] === s.sid) t += o[1] === 5 ? c.rep[1] : o[1] * c.rep[0]; }); if (t) this.pay(s, null, t, 'صيانة'); S.cred = null; return this.afterLand(); }
      this.afterLand();
    }, 1800);
  }
  afterLand() {
    const S = this.S, s = this.cur(); S.offer = -1;
    if (s.ch < 0) { S.debt = -s.ch; return this.setStep('debt'); }
    S.debt = 0; S.cred = null;
    if (S.ldbl && !s.jail) return this.setStep('roll');
    this.setStep('end');
  }
  endTurn() {
    const S = this.S, n = S.seats.length; if (this.alive().length <= 1) return this.over();
    let j = S.turn, wrapped = false; for (let k = 0; k < n; k++) { j = (j + 1) % n; if (j === 0) wrapped = true; if (!S.seats[j].bk) break; }
    if (wrapped) { S.rnd++; if (this.cfg.rounds && S.rnd > this.cfg.rounds) return this.over(); }
    S.turn = j; S.card = null; this.beginTurn();
  }
  worth(s) { let w = s.ch; this.S.own.forEach((o, i) => { if (o && o[0] === s.sid) { const sq = BG_SQ[i]; w += o[2] ? sq.pr / 2 : sq.pr; if (sq.t === 'p') w += o[1] * BG_GROUPS[sq.g].h; } }); return w; }
  over() {
    const S = this.S; S.ph = 'over'; this.untimer();
    S.rank = S.seats.map(s => ({ sid: s.sid, n: s.n, a: s.a, w: s.bk ? -1 : this.worth(s) })).sort((a, b) => b.w - a.w);
    S.win = S.rank[0].sid; this.log(`🏆 ${S.rank[0].n} فاز بلعبة بغداد!`); S.step = ''; this.commit();
  }
  bankrupt(s, credSid, silent) {
    const S = this.S, cr = credSid != null ? this.seatBySid(credSid) : null;
    S.own.forEach((o, i) => { if (o && o[0] === s.sid) { if (cr && !cr.bk) { S.own[i] = [cr.sid, 0, o[2]]; } else S.own[i] = null; } });
    s.bk = 1; s.ch = 0; s.jc = 0; this.log(`💥 ${s.n} أعلن إفلاسه${cr ? ' لصالح ' + cr.n : ''}`);
    if (this.alive().length <= 1) return this.over();
    if (this.cur() === s) return this.endTurn();
    this.commit();
  }
  /* ---------- property management ---------- */
  canBuild(s, i) {
    const S = this.S, sq = BG_SQ[i], o = S.own[i]; if (!o || o[0] !== s.sid || sq.t !== 'p' || o[1] >= 5) return false;
    const g = bgGroup(sq.g); if (!g.every(j => S.own[j] && S.own[j][0] === s.sid && !S.own[j][2])) return false;
    const mn = Math.min(...g.map(j => S.own[j][1])); return o[1] <= mn && s.ch >= BG_GROUPS[sq.g].h;
  }
  canSell(s, i) { const S = this.S, sq = BG_SQ[i], o = S.own[i]; if (!o || o[0] !== s.sid || sq.t !== 'p' || o[1] <= 0) return false; const g = bgGroup(sq.g); const mx = Math.max(...g.map(j => S.own[j][1])); return o[1] >= mx; }
  canMort(s, i) { const S = this.S, sq = BG_SQ[i], o = S.own[i]; if (!o || o[0] !== s.sid || o[2]) return false; if (sq.t === 'p') return bgGroup(sq.g).every(j => !S.own[j] || S.own[j][1] === 0); return true; }
  canUnm(s, i) { const o = this.S.own[i]; return o && o[0] === s.sid && o[2] && s.ch >= Math.ceil(BG_SQ[i].pr / 2 * 1.1); }
  manage(s, a, i) {
    const S = this.S, sq = BG_SQ[i];
    if (a === 'build' && this.canBuild(s, i)) { const c = BG_GROUPS[sq.g].h; s.ch -= c; S.own[i][1]++; this.log(`🏗️ ${s.n} ${S.own[i][1] === 5 ? 'بنى برجاً' : 'بنى بيتاً'} في ${sq.n}`); }
    else if (a === 'sell' && this.canSell(s, i)) { s.ch += BG_GROUPS[sq.g].h / 2; S.own[i][1]--; this.log(`${s.n} باع بيتاً في ${sq.n}`); }
    else if (a === 'mort' && this.canMort(s, i)) { s.ch += sq.pr / 2; S.own[i][2] = 1; this.log(`🏦 ${s.n} رهن ${sq.n} بـ ${bgM(sq.pr / 2)}`); }
    else if (a === 'unm' && this.canUnm(s, i)) { s.ch -= Math.ceil(sq.pr / 2 * 1.1); S.own[i][2] = 0; this.log(`${s.n} فكّ رهن ${sq.n}`); }
    else return false;
    if (S.step === 'debt') { if (s.ch >= 0) { S.debt = 0; return this.afterLand(); } S.debt = -s.ch; }
    this.commit(); return true;
  }
  handle(p, a) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p), s = S.seats[i];
    if (S.ph !== 'play') { if (p === this.hostP && (a.t === 'go' || a.t === 'again')) { if (S.ph === 'over') { S.ph = 'wait'; this.syncBots(); } this.start(); } return; }
    if (!s || i !== S.turn || s.bk) return; const st = S.step;
    if (['build', 'sell', 'mort', 'unm'].includes(a.t)) { if (st === 'roll' || st === 'end' || st === 'debt' || st === 'jail') this.manage(s, a.t, Math.floor(+a.v)); return; }
    if (a.t === 'roll' && (st === 'roll' || st === 'jail')) return this.roll(s);
    if (a.t === 'pay' && st === 'jail' && s.ch >= 50) { this.pay(s, null, 50, 'غرامة'); s.jail = 0; this.log(`${s.n} دفع 50م وخرج من السجن`); return this.setStep('roll'); }
    if (a.t === 'card' && st === 'jail' && s.jc > 0) { s.jc--; s.jail = 0; this.log(`${s.n} استخدم بطاقة الخروج من السجن`); return this.setStep('roll'); }
    if (a.t === 'buy' && st === 'buy') { const sq = BG_SQ[s.pos]; if (S.own[s.pos] || s.ch < sq.pr) return; this.pay(s, null, sq.pr, 'شراء'); S.own[s.pos] = [s.sid, 0, 0]; this.log(`🔑 ${s.n} اشترى ${sq.n} بـ ${bgM(sq.pr)}`); return this.afterLand(); }
    if (a.t === 'skip' && st === 'buy') { this.log(`${s.n} لم يشترِ ${BG_SQ[s.pos].n}`); return this.afterLand(); }
    if (a.t === 'end' && st === 'end') return this.endTurn();
    if (a.t === 'bankrupt' && st === 'debt') return this.bankrupt(s, S.cred);
  }
  /* ---------- bots & auto-play ---------- */
  liquidate(s) {
    const S = this.S; let guard = 60;
    while (s.ch < 0 && guard--) {
      const sells = S.own.map((o, i) => i).filter(i => this.canSell(s, i)); if (sells.length) { this.manage(s, 'sell', sells.sort((a, b) => S.own[b][1] - S.own[a][1])[0]); if (S.step !== 'debt') return true; continue; }
      const ms = S.own.map((o, i) => i).filter(i => this.canMort(s, i)); if (ms.length) { this.manage(s, 'mort', ms.sort((a, b) => BG_SQ[a].pr - BG_SQ[b].pr)[0]); if (S.step !== 'debt') return true; continue; }
      break;
    }
    return s.ch >= 0;
  }
  botBuild(s) {
    const S = this.S; let did = 0, guard = 30;
    while (guard--) { const c = S.own.map((o, i) => i).filter(i => this.canBuild(s, i) && s.ch - BG_GROUPS[BG_SQ[i].g].h > 180); if (!c.length) break; const i = c.sort((a, b) => S.own[a][1] - S.own[b][1] || BG_SQ[b].pr - BG_SQ[a].pr)[0]; s.ch -= BG_GROUPS[BG_SQ[i].g].h; S.own[i][1]++; did++; }
    if (did) this.log(`🏗️ ${s.n} بنى ${did} ${did > 2 ? 'بيوت' : did === 2 ? 'بيتين' : 'بيتاً'}`);
    S.own.forEach((o, i) => { if (o && o[0] === s.sid && o[2] && s.ch > BG_SQ[i].pr + 300) { s.ch -= Math.ceil(BG_SQ[i].pr / 2 * 1.1); o[2] = 0; } });
  }
  botStep() {
    const S = this.S, s = this.cur(); if (S.ph !== 'play' || !s || !(s.bot || s.out)) return; const st = S.step;
    if (st === 'jail') { if (s.jc) return this.handle(s.p, { t: 'card' }); if (s.ch > 250 && Math.random() < .6) return this.handle(s.p, { t: 'pay' }); return this.roll(s); }
    if (st === 'roll') return this.roll(s);
    if (st === 'buy') { const sq = BG_SQ[s.pos]; return this.handle(s.p, { t: (!s.out && s.ch - sq.pr >= 120) ? 'buy' : 'skip' }); }
    if (st === 'end') { if (!s.out) this.botBuild(s); return this.endTurn(); }
    if (st === 'debt') { if (!this.liquidate(s)) this.bankrupt(s, S.cred); return; }
  }
  tick() {
    const S = this.S; if (S.ph !== 'play' || !S.end || Date.now() < S.end) return; const s = this.cur(); this.untimer();
    if (S.step === 'roll' || S.step === 'jail') this.roll(s);
    else if (S.step === 'buy') this.handle(s.p, { t: 'skip' });
    else if (S.step === 'end') this.endTurn();
    else if (S.step === 'debt') { if (!this.liquidate(s)) this.bankrupt(s, S.cred); }
  }
}

/* ---------------- view (illustrated) ---------------- */
const BG_LM = { 1: '🏘️', 3: '🔥', 6: '🚗', 8: '🏭', 9: '👷', 11: '🕌', 13: '🏫', 14: '🏛️', 16: '🛒', 18: '🛣️', 19: '🕰️', 21: '🏨', 23: '🛍️', 24: '🎓', 26: '🏡', 27: '🏥', 29: '🌳', 31: '🍽️', 32: '🗼', 34: '☕', 37: '🏬', 39: '🌉', 5: '🚌', 15: '🚆', 25: '🚐', 35: '✈️', 12: '⚡', 28: '🚰' };
const BGV = { built: false, pos: {}, animId: 'init', animSid: null, animIv: null, did: 0, cardId: 0, settled: '', spin: { x: 0, y: 0 }, prev: null, cash: {} };
function bgCell(i) { if (i <= 10) return [11, 11 - i]; if (i <= 20) return [11 - (i - 10), 1]; if (i <= 30) return [1, 1 + (i - 20)]; return [1 + (i - 30), 11]; }
function bgSide(i) { return i % 10 === 0 ? 'corner' : i < 10 ? 'b' : i < 20 ? 'l' : i < 30 ? 't' : 'r'; }
function bgOwnerColor(S, o) { if (!o) return null; const s = S.seats.find(x => x.sid === o[0]); return s ? BG_COLORS[s.sid % 6] : '#999'; }
const BG_SCENE = `<svg class="scene" viewBox="0 0 600 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="bgsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c0f3f"/><stop offset=".45" stop-color="#6b2a5c"/><stop offset=".75" stop-color="#e0773a"/><stop offset="1" stop-color="#ffc56b"/></linearGradient>
    <radialGradient id="bgsun" cx="50%" cy="50%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffd166"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <linearGradient id="bgriver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7f8f"/><stop offset="1" stop-color="#0c3440"/></linearGradient>
    <linearGradient id="bgdome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe7e0"/><stop offset="1" stop-color="#1b8f9a"/></linearGradient>
    <linearGradient id="bggold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset="1" stop-color="#d49a2a"/></linearGradient>
  </defs>
  <rect width="600" height="340" fill="url(#bgsky)"/>
  <g class="stars" fill="#fff"><circle cx="60" cy="30" r="1.2"/><circle cx="140" cy="55" r=".9"/><circle cx="420" cy="25" r="1.1"/><circle cx="520" cy="60" r=".8"/><circle cx="300" cy="18" r="1"/><circle cx="220" cy="40" r=".7"/><circle cx="470" cy="45" r=".7"/></g>
  <circle class="sun" cx="455" cy="175" r="70" fill="url(#bgsun)"/><circle cx="455" cy="175" r="26" fill="#ffe08a" opacity=".95"/>
  <g class="far" fill="#4a2350" opacity=".85">
    <rect x="0" y="205" width="600" height="40"/>
    <rect x="20" y="185" width="26" height="25"/><rect x="50" y="175" width="18" height="35"/><rect x="560" y="182" width="30" height="28"/><rect x="520" y="190" width="22" height="20"/>
  </g>
  <!-- Baghdad tower -->
  <g fill="#2a1438"><rect x="96" y="92" width="7" height="125"/><ellipse cx="99.5" cy="95" rx="13" ry="10"/><rect x="88" y="103" width="23" height="4" rx="2"/><rect x="98" y="70" width="3" height="18"/><circle cx="99.5" cy="68" r="2" fill="#ff5a5a"/></g>
  <!-- martyr monument (split turquoise dome) -->
  <g><path d="M170 215 Q172 150 206 140 L206 215 Z" fill="url(#bgdome)"/><path d="M216 215 L216 140 Q250 150 252 215 Z" fill="url(#bgdome)"/><rect x="208" y="150" width="6" height="65" fill="#ffe08a" opacity=".7"/><rect x="160" y="213" width="102" height="6" fill="#2a1438"/></g>
  <!-- golden domes & minarets -->
  <g><rect x="296" y="120" width="6" height="96" fill="#2a1438"/><path d="M293 120 L299 98 L305 120 Z" fill="url(#bggold)"/><rect x="292" y="140" width="14" height="3" fill="#2a1438"/>
     <path d="M318 216 L318 176 Q340 140 362 176 L362 216 Z" fill="#2a1438"/><path d="M322 176 Q340 138 358 176 Z" fill="url(#bggold)"/><rect x="338" y="132" width="4" height="10" fill="url(#bggold)"/>
     <rect x="378" y="124" width="6" height="92" fill="#2a1438"/><path d="M375 124 L381 102 L387 124 Z" fill="url(#bggold)"/></g>
  <!-- shanasheel houses -->
  <g fill="#3a1d3f"><rect x="480" y="168" width="44" height="48"/><rect x="526" y="176" width="40" height="40"/><rect x="430" y="186" width="44" height="30"/></g>
  <g fill="#ffcf73" opacity=".85"><rect x="486" y="176" width="8" height="10"/><rect x="500" y="176" width="8" height="10"/><rect x="512" y="176" width="8" height="10"/><rect x="532" y="186" width="7" height="9"/><rect x="546" y="186" width="7" height="9"/><rect x="438" y="194" width="7" height="8"/><rect x="452" y="194" width="7" height="8"/></g>
  <g fill="#5a2e3c"><rect x="484" y="198" width="36" height="6"/><rect x="530" y="200" width="32" height="5"/></g>
  <!-- palms -->
  <g class="palms" stroke="#1d0f24" stroke-width="4" fill="none" stroke-linecap="round">
    <path d="M30 240 C34 210 28 196 36 176"/><path d="M36 176 c-14 -4 -24 2 -28 10 M36 176 c14 -6 26 0 30 8 M36 176 c-6 -12 -18 -16 -26 -14 M36 176 c6 -12 18 -14 25 -10 M36 176 c0 -10 6 -16 12 -18"/>
    <path d="M572 240 C566 214 574 200 566 180"/><path d="M566 180 c-14 -4 -24 2 -28 10 M566 180 c14 -6 26 0 30 8 M566 180 c-6 -12 -18 -16 -26 -14 M566 180 c6 -12 18 -14 25 -10"/>
    <path d="M140 236 C143 216 138 206 144 192"/><path d="M144 192 c-10 -3 -18 1 -21 7 M144 192 c10 -4 19 0 22 6 M144 192 c-4 -9 -13 -12 -19 -10 M144 192 c4 -9 13 -10 18 -7"/>
  </g>
  <!-- river -->
  <rect x="0" y="236" width="600" height="104" fill="url(#bgriver)"/>
  <path d="M0 236 L600 236" stroke="#1d0f24" stroke-width="3"/>
  <ellipse cx="455" cy="262" rx="40" ry="5" fill="#ffe08a" opacity=".35"/><ellipse cx="455" cy="280" rx="26" ry="3" fill="#ffe08a" opacity=".25"/>
  <!-- bridge -->
  <g fill="#2a1438"><rect x="190" y="226" width="250" height="8"/><path d="M200 234 h30 v4 q-15 18 -30 0z M250 234 h30 v4 q-15 18 -30 0z M300 234 h30 v4 q-15 18 -30 0z M350 234 h30 v4 q-15 18 -30 0z M400 234 h30 v4 q-15 18 -30 0z"/><g fill="#ffcf73"><circle cx="210" cy="222" r="2"/><circle cx="270" cy="222" r="2"/><circle cx="330" cy="222" r="2"/><circle cx="390" cy="222" r="2"/></g></g>
  <g class="waves" fill="none" stroke="#9fe3e0" stroke-width="2" opacity=".45"><path class="w1" d="M-60 270 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0"/><path class="w2" d="M-60 296 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0"/></g>
  <!-- boat (mashhoof) -->
  <g class="boat"><path d="M60 284 Q90 298 128 284 L122 290 Q92 300 66 290 Z" fill="#1d0f24"/><rect x="93" y="262" width="2" height="24" fill="#1d0f24"/><path d="M95 264 L114 282 L95 282 Z" fill="#f3e2c7"/></g>
</svg>`;
function bgBuild() {
  if (BGV.built) return; BGV.built = true;
  const b = $('#bgBoard'); let h = '';
  BG_SQ.forEach((sq, i) => {
    const [r, c] = bgCell(i), sd = bgSide(i);
    const band = sq.t === 'p' ? `<div class="band" style="--gc:${BG_GROUPS[sq.g].c}"></div>` : '';
    const ic = sq.t === 'p' || BG_LM[i] ? `<div class="lm">${BG_LM[i] || ''}</div>` : `<div class="ic">${BG_ICON[sq.t]}</div>`;
    const pr = sq.pr ? `<div class="pr">${bgM(sq.pr)}</div>` : sq.amt ? `<div class="pr">${bgM(sq.amt)}</div>` : sq.sub ? `<div class="pr">${sq.sub}</div>` : '';
    h += `<div class="bsq s-${sd} t-${sq.t}" data-i="${i}" style="grid-row:${r};grid-column:${c}">${band}<div class="bin">${ic}<div class="nm">${sq.n}</div>${pr}</div><div class="hs"></div><div class="flag"></div></div>`;
  });
  h += `<div class="bcenter" id="bgCenter">${BG_SCENE}
    <div class="ctop"><div class="bgt">لعبة بغداد</div><div class="bgs">الأسعار بالمليون دينار عراقي</div></div>
    <div class="deck dch"><div class="dc"></div><div class="dc"></div><div class="dc"><span>❓</span><b>حظ</b></div></div>
    <div class="deck dcc"><div class="dc"></div><div class="dc"></div><div class="dc"><span>📦</span><b>صندوق المحلة</b></div></div>
    <div class="bgmid"><div class="dtray"><div class="cube" id="bgC1"></div><div class="cube" id="bgC2"></div></div><div class="bgpot" id="bgPot"></div></div>
    <div class="bgmsg" id="bgMsg"></div>
    <div class="bgcard" id="bgCard"></div>
    <div class="bgoffer" id="bgOffer"></div>
  </div><div class="toks" id="bgToks"></div><div class="fx" id="bgFx"></div>`;
  b.innerHTML = h;
  b.querySelectorAll('.bsq').forEach(e => e.onclick = () => bgInfo(+e.dataset.i));
  ['#bgC1', '#bgC2'].forEach(id => { const c = $(id); c.innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<div class="face f${n}">${DIE_P[n].map(p => `<i style="grid-area:${Math.floor(p / 3) + 1}/${p % 3 + 1}"></i>`).join('')}</div>`).join(''); });
}
const DIE_P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const DIE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
function bgSetCube(el, v, spin) { const [x, y] = DIE_ROT[v]; const sx = spin ? (BGV.spin.x += 720) : BGV.spin.x, sy = spin ? (BGV.spin.y += 720) : BGV.spin.y; el.style.transition = spin ? 'transform 1s cubic-bezier(.2,.9,.3,1.05)' : 'none'; el.style.transform = `rotateX(${sx + x}deg) rotateY(${sy + y}deg)`; }
function bgDeed(i, S) {
  const sq = BG_SQ[i], o = S && S.own[i], g = sq.t === 'p' ? BG_GROUPS[sq.g] : null;
  let h = `<div class="deed">`;
  if (sq.t === 'p') h += `<div class="dh" style="--gc:${g.c}"><span class="dlm">${BG_LM[i] || '🏠'}</span><small>سند ملكية</small><b>${sq.n}</b></div><table><tr><td>الإيجار</td><td>${bgM(sq.r[0])}</td></tr><tr><td>المنطقة كاملة</td><td>${bgM(sq.r[0] * 2)}</td></tr>${[1, 2, 3, 4].map(k => `<tr><td>${'🏠'.repeat(k)}</td><td>${bgM(sq.r[k])}</td></tr>`).join('')}<tr class="hot"><td>🏢 برج</td><td>${bgM(sq.r[5])}</td></tr></table><div class="dfoot"><span>السعر <b>${bgM(sq.pr)}</b></span><span>البيت <b>${bgM(g.h)}</b></span><span>الرهن <b>${bgM(sq.pr / 2)}</b></span></div>`;
  else if (sq.t === 'tr') h += `<div class="dh tr"><span class="dlm">${BG_LM[i]}</span><small>نقل</small><b>${sq.n}</b></div><table><tr><td>مكان واحد</td><td>25م</td></tr><tr><td>مكانان</td><td>50م</td></tr><tr><td>ثلاثة</td><td>100م</td></tr><tr><td>أربعة</td><td>200م</td></tr></table><div class="dfoot"><span>السعر <b>${bgM(sq.pr)}</b></span><span>الرهن <b>${bgM(sq.pr / 2)}</b></span></div>`;
  else if (sq.t === 'ut') h += `<div class="dh ut"><span class="dlm">${BG_LM[i]}</span><small>خدمات</small><b>${sq.n}</b></div><p>خدمة واحدة: <b>4 ×</b> مجموع النرد<br>الخدمتان معاً: <b>10 ×</b> مجموع النرد</p><div class="dfoot"><span>السعر <b>${bgM(sq.pr)}</b></span><span>الرهن <b>${bgM(sq.pr / 2)}</b></span></div>`;
  else h += `<div class="dh sp"><span class="dlm">${BG_ICON[sq.t]}</span><b>${sq.n}</b></div><p>${{ go: 'كلما مررت من هنا تستلم الراتب.', jail: 'إذا كنت مسجوناً: ادفع 50م، أو استخدم بطاقة، أو ارمِ دبل.', free: 'استراحة على ضفاف دجلة. إذا فُعّلت الجائزة تأخذ كل الضرائب المجمّعة!', gtj: 'اذهب مباشرة إلى السجن دون استلام الراتب.', tax: 'ادفع ' + bgM(sq.amt || 0), ch: 'اسحب بطاقة حظ.', cc: 'اسحب بطاقة من صندوق المحلة.' }[sq.t]}</p>`;
  if (o && S) { const ow = S.seats.find(s => s.sid === o[0]); h += `<div class="downer" style="--oc:${bgOwnerColor(S, o)}">${ow ? ow.a + ' ' + ow.n : '—'}${o[1] ? ' • ' + (o[1] === 5 ? '🏢 برج' : '🏠'.repeat(o[1])) : ''}${o[2] ? ' • مرهون' : ''}</div>`; }
  return h + '</div>';
}
function bgInfo(i) {
  const S = APP.S; if (!S) return; const me = mySeat(S), o = S.own[i], mine = o && me && o[0] === me.sid, myTurn = me && S.seats[S.turn] === me && ['roll', 'end', 'debt', 'jail'].includes(S.step) && S.ph === 'play';
  modal(`<div class="bginfo">${bgDeed(i, S)}</div><div class="mbtns" id="bgMg"></div><div class="mbtns"><button class="btn ghost" id="bgX">إغلاق</button></div>`, b => {
    b.querySelector('#bgX').onclick = closeModal;
    if (mine && myTurn) { const m = b.querySelector('#bgMg'), sq = BG_SQ[i];
      const add = (t, cls, act) => { const x = el('button', 'btn sm ' + cls, t); x.onclick = () => { myAct({ t: act, v: i }); closeModal(); }; m.appendChild(x); };
      if (sq.t === 'p' && !o[2] && o[1] < 5) add(`🏗️ ابنِ (${bgM(BG_GROUPS[sq.g].h)})`, 'green', 'build');
      if (sq.t === 'p' && o[1] > 0) add(`بع بيتاً (+${bgM(BG_GROUPS[sq.g].h / 2)})`, 'ghost', 'sell');
      if (!o[2]) add(`🏦 ارهن (+${bgM(sq.pr / 2)})`, 'blue', 'mort'); else add(`فكّ الرهن (${bgM(Math.ceil(sq.pr / 2 * 1.1))})`, 'gold', 'unm');
    }
  });
}
function bgSqCenter(i) { const e = $('#bgBoard .bsq[data-i="' + i + '"]'), bd = $('#bgBoard'); if (!e) return [0, 0, 20]; const r = e.getBoundingClientRect(), br = bd.getBoundingClientRect(); return [r.left - br.left + r.width / 2, r.top - br.top + r.height / 2, Math.min(r.width, r.height)]; }
function bgTokPos(i, k, n) { const [cx, cy, sz] = bgSqCenter(i); const cols = Math.min(n, 3), row = Math.floor(k / 3), col = k % 3; return [cx + (col - (cols - 1) / 2) * sz * .36, cy + (row - (n > 3 ? .5 : 0)) * sz * .36 + sz * .08]; }
function bgPlaceToks(S, hopSid) {
  const box = $('#bgToks'); if (!box) return; const groups = {};
  S.seats.forEach(s => { if (s.bk) return; const p = BGV.pos[s.sid] !== undefined ? BGV.pos[s.sid] : s.pos; (groups[p] = groups[p] || []).push(s); });
  const keep = new Set();
  Object.entries(groups).forEach(([p, arr]) => arr.forEach((s, k) => {
    keep.add(String(s.sid)); let t = box.querySelector(`.tok[data-s="${s.sid}"]`);
    if (!t) { t = el('div', 'tok', '<div class="tk"><span></span></div><i class="sh"></i>'); t.dataset.s = s.sid; box.appendChild(t); }
    t.querySelector('span').textContent = s.a; t.style.setProperty('--tc', BG_COLORS[s.sid % 6]);
    t.classList.toggle('turn', S.seats[S.turn] === s && S.ph === 'play'); t.classList.toggle('jailed', !!s.jail);
    const [x, y] = bgTokPos(+p, k, arr.length); t.style.transform = `translate(${x}px,${y}px)`;
    if (hopSid === s.sid) { const tk = t.querySelector('.tk'); tk.classList.remove('hop'); void tk.offsetWidth; tk.classList.add('hop'); }
  }));
  box.querySelectorAll('.tok').forEach(t => { if (!keep.has(t.dataset.s)) t.remove(); });
}
function bgAnimate(S) {
  const a = S.anim; if (!a || BGV.animId === a.id) return; BGV.animId = a.id;
  const sid = a.sid; clearInterval(BGV.animIv); BGV.animSid = null;
  if (!a.n || Math.abs(a.n) > 12) { BGV.pos[sid] = a.to; setTimeout(() => bgPlaceToks(APP.S || S, sid), 0); return; }
  BGV.animSid = sid;
  let cur = a.from, left = Math.abs(a.n), dir = a.n > 0 ? 1 : -1; BGV.pos[sid] = cur;
  BGV.animIv = setInterval(() => { cur = (cur + dir + 40) % 40; BGV.pos[sid] = cur; left--; if (SND.on && SND.ctx) tone(700 + (left % 2) * 180, 0, .06, 'triangle', .05); bgPlaceToks(APP.S || S, sid); if (cur === 0 && dir > 0) bgFloatAt(0, '💵', '#7CFC9A'); if (left <= 0) { clearInterval(BGV.animIv); BGV.animSid = null; BGV.pos[sid] = a.to; bgPlaceToks(APP.S || S); } }, 190);
}
/* ---- effects ---- */
function bgTokXY(sid) { const t = $(`#bgToks .tok[data-s="${sid}"]`); if (!t) return null; const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(t.style.transform); return m ? [+m[1], +m[2]] : null; }
function bgFloat(x, y, txt, col) { const fx = $('#bgFx'); if (!fx) return; const e = el('div', 'mfloat'); e.textContent = txt; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.color = col; fx.appendChild(e); setTimeout(() => e.remove(), 1700); }
function bgFloatAt(i, txt, col) { const [x, y] = bgSqCenter(i); bgFloat(x, y, txt, col); }
function bgCoins(from, to, n) { const fx = $('#bgFx'); if (!fx || !from || !to) return; for (let k = 0; k < (n || 8); k++) { const c = el('div', 'fcoin'); c.style.left = from[0] + 'px'; c.style.top = from[1] + 'px'; fx.appendChild(c); const dx = to[0] - from[0], dy = to[1] - from[1]; c.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: `translate(calc(-50% + ${dx * .5}px), calc(-50% + ${dy * .5 - 40}px)) scale(1.1)`, opacity: 1, offset: .5 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: .9 }], { duration: 750, delay: k * 60, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).onfinish = () => c.remove(); } setTimeout(() => sfx('chip'), 300); }
function bgEffects(prev, S) {
  if (!prev || prev.round !== S.round || S.ph !== 'play') return;
  // purchases / buildings
  S.own.forEach((o, i) => { const p = prev.own[i], e = $(`#bgBoard .bsq[data-i="${i}"]`); if (!e) return;
    if (o && !p) { e.classList.remove('buyfx'); void e.offsetWidth; e.classList.add('buyfx'); sfx('win'); bgFloatAt(i, '🔑', '#ffe08a'); }
    else if (o && p && o[1] > p[1]) { e.classList.remove('buildfx'); void e.offsetWidth; e.classList.add('buildfx'); bgFloatAt(i, o[1] === 5 ? '🏢' : '🏠', '#7CFC9A'); sfx('chip'); } });
  // money changes
  const gains = [], losses = [];
  S.seats.forEach(s => { const p = prev.seats.find(x => x.sid === s.sid); if (!p) return; const d = s.ch - p.ch; if (!d) return; const xy = bgTokXY(s.sid); if (xy) bgFloat(xy[0], xy[1] - 18, (d > 0 ? '+' : '') + bgM(d), d > 0 ? '#7CFC9A' : '#ff6b6b'); (d > 0 ? gains : losses).push([s, d]); });
  if (losses.length === 1 && gains.length === 1) bgCoins(bgTokXY(losses[0][0].sid), bgTokXY(gains[0][0].sid), 9);
  else if (losses.length && !gains.length) { const c = $('#bgPot'); const bd = $('#bgBoard').getBoundingClientRect(), r = c.getBoundingClientRect(); losses.forEach(([s]) => bgCoins(bgTokXY(s.sid), [r.left - bd.left + r.width / 2, r.top - bd.top + r.height / 2], 5)); }
}

GAMES.bg = {
  key: 'bg', title: 'لعبة بغداد', Engine: BGEngine, chips: true,
  soloIcon: '🤖', soloLabel: 'ضد الكمبيوتر', soloDesc: 'العب ضد تجّار آليين', hostDesc: 'من 2 إلى 6 لاعبين، ويمكن إضافة لاعبين آليين',
  cfg: [
    { k: 'start', label: '💰 رأس المال لكل لاعب (مليون)', d: 1500, lo: 100, hi: 100000, step: 50 },
    { k: 'salary', label: '💵 الراتب عند المرور بالانطلاق', d: 200, lo: 0, hi: 5000, opts: [100, 150, 200, 300, 500], fmt: bgM },
    { k: 'turn', label: '⏱️ وقت الدور لكل لاعب', d: 45, lo: 0, hi: 300, opts: [20, 30, 45, 60, 90, 0], fmt: secs },
    { k: 'bots', label: '🤖 عدد اللاعبين الآليين', d: 3, lo: 0, hi: 5, opts: [0, 1, 2, 3, 4, 5], fmt: v => v ? v : 'بدون' },
    { k: 'rounds', label: '🔁 عدد الجولات', d: 0, lo: 0, hi: 200, opts: [0, 10, 15, 20, 30, 50], fmt: v => v ? v + ' جولة ثم يفوز الأغنى' : 'حتى يفلس الجميع' },
    { k: 'pot', label: '🌴 جائزة كورنيش أبو نؤاس', d: 1, lo: 0, hi: 1, opts: [1, 0], fmt: v => v ? 'الضرائب تُجمع للجائزة' : 'بدون جائزة' },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>ارمِ النرد وتنقّل في أحياء بغداد. اشترِ الحي الذي تقف عليه، ومن يقف على أملاكك يدفع لك إيجاراً.</li>
    <li>الأسعار ترتفع من الأحياء الشعبية (مدينة الصدر، الشعلة) إلى الراقية (المنصور، الجادرية).</li>
    <li>إذا امتلكت كل أحياء اللون الواحد يتضاعف الإيجار، وتستطيع بناء بيوت ثم برج.</li>
    <li>الكراجات والمطار: كلما امتلكت أكثر زاد الإيجار. المولدة والإسالة: الإيجار حسب النرد.</li>
    <li>الدبل يمنحك رمية إضافية، و3 دبل متتالية تأخذك إلى السجن.</li>
    <li>إذا نفدت نقودك: ارهن أو بع بيوتاً، وإلا تعلن إفلاسك. آخر من يبقى، أو الأغنى عند انتهاء الجولات، يفوز.</li></ul>`,
  reset() { const b = $('#bgBoard'); if (b) { b.querySelectorAll('.tok,.mfloat,.fcoin').forEach(t => t.remove()); } BGV.pos = {}; BGV.animId = 'init'; BGV.animSid = null; BGV.did = 0; BGV.cash = {}; clearInterval(BGV.animIv); $('#bgPlayers').innerHTML = ''; $('#bgMine').innerHTML = ''; },
  busy(S) { return S.ph === 'play' && !!mySeat(S); },
  hud(S) { const s = mySeat(S); return s ? bgM(s.ch) : null; },
  chipsEdited(prev, S, a, b) { return S.step === prev.step && S.turn === prev.turn && S.log.length === prev.log.length && a.ch !== b.ch; },
  localKey() { return ''; },
  onState(prev, S) {
    if (prev && S.turn !== prev.turn && S.seats[S.turn] && S.seats[S.turn].p === APP.myPeer && S.ph === 'play') sfx('turn');
    if (prev && S.round !== prev.round) { BGV.pos = {}; }
    BGV.prevS = prev;
    if (S.ph === 'over') { const key = APP.code + ':' + S.round; if (BGV.settled !== key) { BGV.settled = key; const me = mySeat(S); setTimeout(() => { banner('🏆 ' + (S.rank && S.rank[0] ? S.rank[0].n : ''), 'gold'); sfx(me && me.sid === S.win ? 'bj' : 'win'); }, 300); } }
  },
  render(S) {
    bgBuild(); if (!S) { timerMsg($('#bgMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    const b = $('#bgBoard'), prev = BGV.prevS; BGV.prevS = null;
    b.querySelectorAll('.bsq').forEach(e => {
      const i = +e.dataset.i, o = S.own[i], oc = bgOwnerColor(S, o);
      e.classList.toggle('owned', !!o); e.classList.toggle('mort', !!(o && o[2])); e.style.setProperty('--oc', oc || 'transparent');
      const hk = o ? o[1] : 0, hs = e.querySelector('.hs'); if (hs.dataset.k !== String(hk)) { hs.dataset.k = hk; hs.innerHTML = hk === 5 ? '<i class="hotel"></i>' : '<i class="house"></i>'.repeat(hk); }
      e.classList.toggle('here', S.ph === 'play' && S.seats[S.turn] && S.seats[S.turn].pos === i && S.step !== 'move');
    });
    if (BGV.animId === 'init') BGV.animId = S.anim ? S.anim.id : null; else if (S.anim && BGV.animId !== S.anim.id) bgAnimate(S);
    S.seats.forEach(s => { if (s.sid !== BGV.animSid) BGV.pos[s.sid] = s.pos; });
    bgPlaceToks(S);
    // 3D dice
    const c1 = $('#bgC1'), c2 = $('#bgC2');
    if (BGV.did !== S.did) { const first = BGV.did === 0; BGV.did = S.did; bgSetCube(c1, S.dice[0], !first); bgSetCube(c2, S.dice[1], !first); if (!first) { sfx('card'); setTimeout(() => sfx('card'), 250); $('.dtray').classList.toggle('dbl', S.dice[0] === S.dice[1]); } }
    else if (!c1.style.transform) { bgSetCube(c1, S.dice[0]); bgSetCube(c2, S.dice[1]); }
    const pot = $('#bgPot'); pot.innerHTML = S.cfg.pot && S.pot ? `<span class="potc">🌴</span> جائزة الكورنيش <b>${bgM(S.pot)}</b>` : ''; pot.classList.toggle('on', !!(S.cfg.pot && S.pot));
    // card
    const cd = $('#bgCard'); if (S.card && BGV.cardId !== S.card.id) { const first = BGV.cardId === 0 && !prev; BGV.cardId = S.card.id; if (!first) { cd.className = 'bgcard ' + S.card.k; cd.innerHTML = `<div class="cin"><div class="chd"><span>${S.card.k === 'ch' ? '❓' : '📦'}</span>${S.card.k === 'ch' ? 'حظ' : 'صندوق المحلة'}</div><div class="cx"></div><div class="cw"></div></div>`; cd.querySelector('.cx').textContent = S.card.x; cd.querySelector('.cw').textContent = '— ' + S.card.who; void cd.offsetWidth; cd.classList.add('on'); sfx('flip'); clearTimeout(BGV.cardT); BGV.cardT = setTimeout(() => cd.classList.remove('on'), 3800); } }
    // offer
    const of = $('#bgOffer'); if (S.step === 'buy' && S.offer >= 0) { if (of.dataset.i !== String(S.offer)) { of.dataset.i = S.offer; of.innerHTML = bgDeed(S.offer, S); of.classList.remove('on'); void of.offsetWidth; } of.classList.add('on'); } else { of.classList.remove('on'); of.dataset.i = ''; }
    // players
    const pl = $('#bgPlayers'), keep = new Set();
    S.seats.forEach((s, i) => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'bgp', '<div class="emo"></div><div class="net"></div><span class="av"></span><div class="pi"><div class="nm"></div><div class="st"></div><div class="ownr"></div></div><div class="cash"></div>'); pl.appendChild(e); SEATS.set(s.p, e); }
      e.style.setProperty('--tc', BG_COLORS[s.sid % 6]); e.classList.toggle('turn', S.ph === 'play' && S.turn === i); e.classList.toggle('bk', !!s.bk); e.classList.toggle('me', s.p === APP.myPeer);
      e.querySelector('.av').textContent = s.a; e.querySelector('.nm').textContent = s.p === APP.myPeer ? s.n + ' (أنت)' : s.n;
      e.querySelector('.st').textContent = s.bk ? '💥 مفلس' : [s.jail ? '🚔 في السجن' : '', s.jc ? '🎫 ' + s.jc : '', s.out && !s.bot ? 'غادر' : ''].filter(Boolean).join(' • ');
      const mine = S.own.map((o, k) => o && o[0] === s.sid ? k : -1).filter(k => k >= 0), ok = mine.join(',');
      const ow = e.querySelector('.ownr'); if (ow.dataset.k !== ok) { ow.dataset.k = ok; ow.innerHTML = mine.map(k => { const sq = BG_SQ[k]; return `<i style="background:${sq.t === 'p' ? BG_GROUPS[sq.g].c : '#9aa'}" title="${sq.n}"></i>`; }).join(''); }
      const cash = e.querySelector('.cash'); cash.classList.toggle('neg', s.ch < 0);
      const from = BGV.cash[s.sid] !== undefined ? BGV.cash[s.sid] : s.ch; BGV.cash[s.sid] = s.ch;
      if (s.bk) cash.textContent = ''; else if (from !== s.ch) { const t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 700); cash.textContent = bgM(Math.round(from + (s.ch - from) * k)); if (k < 1) requestAnimationFrame(step); }; step(); cash.classList.remove('pulse'); void cash.offsetWidth; cash.classList.add('pulse'); } else cash.textContent = bgM(s.ch);
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    // my properties
    const me = mySeat(S), mb = $('#bgMine');
    const mineIdx = me ? S.own.map((o, i) => o && o[0] === me.sid ? i : -1).filter(i => i >= 0) : [];
    const mk = mineIdx.map(i => i + ':' + S.own[i].join(',')).join('|') + (me ? me.ch : '');
    if (mb.dataset.k !== mk) { mb.dataset.k = mk; mb.innerHTML = mineIdx.length ? '' : '<div class="hint">لا تملك عقارات بعد — اضغط على أي خانة لترى سند ملكيتها</div>';
      mineIdx.forEach(i => { const sq = BG_SQ[i], o = S.own[i]; const r = el('button', 'mrow' + (o[2] ? ' mort' : '')); r.style.setProperty('--gc', sq.t === 'p' ? BG_GROUPS[sq.g].c : '#7a8a9a'); r.innerHTML = `<span class="ml">${BG_LM[i] || BG_ICON[sq.t]}</span><span class="mn"></span><span class="mh">${o[1] === 5 ? '🏢' : '🏠'.repeat(o[1])}${o[2] ? ' مرهون' : ''}</span>`; r.querySelector('.mn').textContent = sq.n; r.onclick = () => bgInfo(i); mb.appendChild(r); }); }
    const lg = $('#bgLog'), lk = S.log.join('\n'); if (lg.dataset.k !== lk) { lg.dataset.k = lk; lg.innerHTML = ''; S.log.slice().reverse().forEach((t, i) => { const d = el('div', i === 0 ? 'new' : ''); d.textContent = t; lg.appendChild(d); }); }
    if (prev) { const p2 = prev; setTimeout(() => bgEffects(p2, S), S.anim && prev.anim && S.anim.id !== prev.anim.id ? Math.min(12, Math.abs(S.anim.n || 0)) * 190 + 100 : 30); }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(); let m1 = '', m2 = '', bar = false; const c = S.seats[S.turn], me = mySeat(S);
    if (S.ph === 'wait') { m1 = 'بانتظار بدء اللعبة'; m2 = S.seats.length < 2 ? 'يلزم لاعبان على الأقل' : `${S.seats.length} لاعبين جاهزين`; }
    else if (S.ph === 'play' && c) { const mine = c === me; const W = { roll: 'يرمي النرد', jail: 'في السجن', buy: 'يفكّر في الشراء', end: 'ينهي دوره', debt: 'عليه دين!', move: 'يتحرّك...' }[S.step] || '';
      m1 = mine ? ({ roll: '🎲 دورك! ارمِ النرد', jail: '🚔 أنت في السجن', buy: '🔑 هل تشتري؟', end: 'ابنِ أو أنهِ دورك', debt: '⚠️ عليك دين ' + bgM(S.debt), move: '...' }[S.step] || '') : `${c.a} ${c.n} ${W}`;
      m2 = `الجولة ${S.rnd}${S.cfg.rounds ? ' / ' + S.cfg.rounds : ''}` + (S.end ? ` — ${Math.ceil(tl / 1000)} ث` : ''); bar = !!S.end; }
    else if (S.ph === 'over') { m1 = '🏆 ' + (S.rank && S.rank[0] ? S.rank[0].a + ' ' + S.rank[0].n + ' فاز!' : ''); m2 = (S.rank || []).slice(0, 3).map((r, i) => `${['🥇', '🥈', '🥉'][i]} ${r.n} ${r.w >= 0 ? bgM(r.w) : 'مفلس'}`).join('   '); }
    timerMsg($('#bgMsg'), m1, m2, bar);
  },
  controls(box, S, priv, pending) {
    const me = mySeat(S), row = el('div', 'crow'); box.appendChild(row); const B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (S.ph === 'wait') { row.appendChild(el('div', 'status', APP.eng ? 'جاهز؟' : 'بانتظار المضيف ليبدأ اللعبة...')); if (APP.eng) B('ابدأ اللعبة ▶', 'green', () => myAct({ t: 'go' }), S.seats.length < 2); return; }
    if (S.ph === 'over') { row.appendChild(el('div', 'status', 'انتهت اللعبة')); if (APP.eng) B('لعبة جديدة ▶', 'green', () => myAct({ t: 'again' })); return; }
    if (!me) { row.appendChild(el('div', 'status', '👀 أنت تشاهد')); return; }
    if (me.bk) { row.appendChild(el('div', 'status', '💥 أفلست — يمكنك متابعة اللعب كمشاهد')); return; }
    if (S.seats[S.turn] !== me) { const c = S.seats[S.turn]; row.appendChild(el('div', 'status', c ? `دور ${c.n}...` : '')); return; }
    const st = S.step, sq = BG_SQ[me.pos];
    if (st === 'roll') B('🎲 ارمِ النرد', 'gold', () => myAct({ t: 'roll' }));
    else if (st === 'jail') { B('🎲 حاول رمي دبل', 'gold', () => myAct({ t: 'roll' })); B('ادفع 50م واخرج', 'blue', () => myAct({ t: 'pay' }), me.ch < 50); if (me.jc) B('🎫 استخدم بطاقة الخروج', 'purple', () => myAct({ t: 'card' })); }
    else if (st === 'buy') { B(`🔑 اشترِ ${sq.n} بـ ${bgM(sq.pr)}`, 'green', () => myAct({ t: 'buy' }), me.ch < sq.pr); B('لا، شكراً', 'ghost', () => myAct({ t: 'skip' })); }
    else if (st === 'end') { B('⏭️ إنهاء الدور', 'gold', () => myAct({ t: 'end' })); row.appendChild(el('div', 'hint', 'اضغط على عقاراتك للبناء أو الرهن')); }
    else if (st === 'debt') { row.appendChild(el('div', 'status', `⚠️ عليك ${bgM(S.debt)} — ارهن عقاراً أو بع بيوتاً من قائمة أملاكك`)); B('💥 أعلن الإفلاس', 'red sm', () => myAct({ t: 'bankrupt' })); }
    else row.appendChild(el('div', 'status', '...'));
  }
};
