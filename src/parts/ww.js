/* =====================================================================
   ذئب المافيا — Werewolf / Mafia social deduction (5–16 players)
   ===================================================================== */
const WW_R = { V: { n: 'قروي', i: '🧑‍🌾', d: 'اكتشف المستذئبين وصوّت لإعدامهم نهاراً' }, W: { n: 'مستذئب', i: '🐺', d: 'افترس قروياً كل ليلة دون أن ينكشف أمرك' }, S: { n: 'العرّافة', i: '🔮', d: 'كل ليلة اكشف حقيقة لاعب واحد' }, D: { n: 'الطبيب', i: '🩺', d: 'كل ليلة احمِ لاعباً من الموت (لا تكرر نفس اللاعب مرتين متتاليتين)' }, H: { n: 'الصيّاد', i: '🏹', d: 'إذا متّ، تطلق سهمك الأخير على من تختار' } };
const wwClean = shClean;
const WW_LINES = [n => `أشكّ في ${n}… كان هادئاً أكثر من اللازم`, () => 'أنا قروي بسيط، صدقوني! 🙏', n => `لماذا يدافع ${n} عن نفسه بهذا الحماس؟`, () => 'دعونا لا نتسرّع في الحكم', n => `${n} تصرّف بغرابة البارحة 🤔`, n => `صوتي على ${n}`, () => 'سمعت عواءً قرب بيتي الليلة الماضية 😨'];

class WWEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) {
    super('ww', pub, hostP, round, cfg);
    Object.assign(this.S, { ph: 'wait', step: '', day: 0, votes: [], news: null, exec: null, log: [], chat: [], win: null, why: '', roles: null, rv: [], comp: null, hunter: -1, cid: 0 });
    this.roles = []; this.wv = {}; this.seerPick = -1; this.docPick = -1; this.lastDoc = -1; this.seerRes = {}; this.wchat = []; this.after = null; this.chatAt = {}; this.botPending = {};
    this.syncBots();
  }
  syncBots() { const S = this.S; if (S.ph === 'play') return; let bots = S.seats.filter(s => s.bot); while (bots.length < this.cfg.bots && S.seats.length < 16) { const b = this.botSeat({}); S.seats.push(Object.assign(b, { dead: 0 })); bots = S.seats.filter(s => s.bot); } while (bots.length > this.cfg.bots) { const b = bots.pop(); S.seats.splice(S.seats.indexOf(b), 1); } }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph !== 'play') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => s.bot || !s.out); if (S.seats.length !== n0) ch = true;
      for (const x of list) { if (S.seats.find(s => s.p === x.p)) continue; if (S.seats.length >= 16) { const b = S.seats.filter(s => s.bot).pop(); if (!b) break; S.seats.splice(S.seats.indexOf(b), 1); } S.seats.push({ p: x.p, n: x.n, a: x.a, dead: 0 }); ch = true; }
    } else this.schedBots();
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  onCfg() { if (this.S.ph !== 'play') this.syncBots(); }
  onKick(p, i) { const S = this.S; if (i < 0) return false; if (S.ph === 'play') { S.seats[i].out = 1; S.seats[i].kicked = 1; this.schedBots(); return false; } S.seats.splice(i, 1); return false; }
  log(t) { const L = this.S.log; L.push(t); if (L.length > 6) L.shift(); }
  alive() { return this.S.seats.map((s, i) => i).filter(i => !this.S.seats[i].dead); }
  aliveRole(r) { return this.alive().filter(i => this.roles[i] === r); }
  auto(i) { const s = this.S.seats[i]; return s && (s.bot || s.out); }
  priv(p) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p); if (i < 0 || !this.roles.length || S.ph === 'wait') return null;
    const role = this.roles[i], o = { r: S.round, role };
    if (role === 'W') { o.mates = this.roles.map((r, k) => r === 'W' && k !== i ? k : -1).filter(k => k >= 0); o.wv = Object.entries(this.wv).map(([a, b]) => [+a, b]); o.wc = this.wchat.slice(-6); }
    if (role === 'S') o.seen = this.seerRes[i] || [];
    if (role === 'S' && S.step === 'night') o.pick = this.seerPick;
    if (role === 'D') { o.last = this.lastDoc; if (S.step === 'night') o.pick = this.docPick; }
    return o;
  }
  wolfCount(n) { return this.cfg.wolves || (n <= 6 ? 1 : n <= 9 ? 2 : n <= 12 ? 3 : 4); }
  start() {
    const S = this.S; if (S.ph === 'play') return; this.syncBots(); S.seats = S.seats.filter(s => s.bot || !s.out); const n = S.seats.length; if (n < 5) return;
    S.round++; S.seats.forEach(s => s.dead = 0);
    const w = Math.min(this.wolfCount(n), Math.floor((n - 1) / 2)), list = Array(w).fill('W');
    if (this.cfg.seer) list.push('S'); if (this.cfg.doctor) list.push('D'); if (this.cfg.hunter && n >= 6) list.push('H');
    while (list.length < n) list.push('V');
    this.roles = pkShuffle(list.slice(0, n)); this.seerRes = {}; this.lastDoc = -1; this.wchat = [];
    Object.assign(S, { ph: 'play', day: 1, votes: [], news: null, exec: null, log: [], chat: [], win: null, why: '', roles: null, rv: S.seats.map(() => null), comp: { w, s: list.includes('S') ? 1 : 0, d: list.includes('D') ? 1 : 0, h: list.includes('H') ? 1 : 0, n }, hunter: -1 });
    this.log(`🌕 حلّ الليل الأول على القرية… بينكم ${w} ${w === 1 ? 'مستذئب' : 'مستذئبين'}`);
    this.night();
  }
  night() {
    const S = this.S; S.step = 'night'; S.votes = []; S.exec = null; this.wv = {}; this.seerPick = -1; this.docPick = -1; this.wchat = [];
    if (this.cfg.nightTime) this.timer(this.cfg.nightTime * 1000); else this.untimer();
    this.commit(); this.schedBots();
  }
  nightReady() {
    const W = this.aliveRole('W'); if (W.some(i => this.wv[i] === undefined)) return false;
    if (this.aliveRole('S').length && this.seerPick < 0) return false; if (this.aliveRole('D').length && this.docPick < 0) return false; return true;
  }
  checkNight() { if (this.S.step !== 'night' || !this.nightReady() || this.nightPend) return; this.nightPend = 1; this.commit(); this.later(() => { this.nightPend = 0; if (this.S.step === 'night') this.resolveNight(); }, 1800); }
  plurality(arr) { const c = {}; arr.forEach(t => { if (t >= 0) c[t] = (c[t] || 0) + 1; }); const ks = Object.keys(c); if (!ks.length) return { t: -1, n: 0, tie: false }; const mx = Math.max(...ks.map(k => c[k])); const top = ks.filter(k => c[k] === mx).map(Number); return { t: top.length === 1 ? top[0] : top[Math.floor(Math.random() * top.length)], n: mx, tie: top.length > 1, top }; }
  resolveNight() {
    const S = this.S; this.untimer();
    let { t } = this.plurality(Object.values(this.wv));
    if (t < 0 && this.aliveRole('W').length) { const c = this.alive().filter(i => this.roles[i] !== 'W'); t = c[Math.floor(Math.random() * c.length)]; }
    if (this.docPick >= 0) this.lastDoc = this.docPick;
    const saved = t >= 0 && t === this.docPick;
    S.news = { k: saved ? -1 : t, saved: saved ? 1 : 0, day: S.day };
    if (!saved && t >= 0) { this.kill(t); this.log(`🌅 طلع الصباح… وُجد ${S.seats[t].n} مقتولاً${this.cfg.reveal ? ' — كان ' + WW_R[this.roles[t]].n : ''}`); }
    else this.log('🌅 طلع الصباح… ولم يمت أحد! الطبيب أنقذ ضحية الليلة 🩺');
    S.step = 'dawn'; this.commit();
    if (this.win()) return;
    this.after = 'day';
    this.later(() => this.afterDeath(), 4200);
  }
  kill(i) { const S = this.S; S.seats[i].dead = 1; if (this.cfg.reveal) S.rv[i] = this.roles[i]; if (this.roles[i] === 'H') this.pendHunter = i; }
  afterDeath() {
    const S = this.S;
    if (this.pendHunter !== undefined && this.pendHunter >= 0) { S.hunter = this.pendHunter; this.pendHunter = -1; S.step = 'hunter'; this.log(`🏹 ${S.seats[S.hunter].n} هو الصيّاد! سيطلق سهمه الأخير…`); this.timer(30000); this.commit(); this.schedBots(); return; }
    if (this.after === 'day') this.dayStart(); else { S.day++; this.night(); }
  }
  shoot(t) { const S = this.S, h = S.hunter; if (S.step !== 'hunter' || !S.seats[t] || S.seats[t].dead || t === h) return; this.untimer(); this.kill(t); S.hunter = -1; this.log(`🏹 أطلق الصيّاد سهمه على ${S.seats[t].n}${this.cfg.reveal ? ' — كان ' + WW_R[this.roles[t]].n : ''}`); S.step = 'shot'; S.news = Object.assign({}, S.news, { shot: t }); this.commit(); if (this.win()) return; this.later(() => this.afterDeath(), 2500); }
  dayStart() {
    const S = this.S; S.step = 'day'; S.votes = S.seats.map(() => null); S.exec = null; this.dayPend = 0;
    if (this.cfg.dayTime) this.timer(this.cfg.dayTime * 1000); else this.untimer();
    this.log(`☀️ اليوم ${S.day}: ناقشوا وصوّتوا على من تشكّون به`); this.commit(); this.schedBots(); this.botChatter();
  }
  vote(i, t) { const S = this.S; if (S.step !== 'day' || S.seats[i].dead) return; if (t !== -1 && (!S.seats[t] || S.seats[t].dead)) return; S.votes[i] = t; this.commit(); this.checkDay(); }
  checkDay() { const S = this.S; if (S.step !== 'day' || this.dayPend) return; if (this.alive().some(i => S.votes[i] === null || S.votes[i] === undefined)) return; this.dayPend = 1; this.later(() => { this.dayPend = 0; if (S.step === 'day' && !this.alive().some(i => S.votes[i] === null || S.votes[i] === undefined)) this.endDay(); }, 3000); }
  endDay() {
    const S = this.S; this.untimer(); const al = this.alive(); const p = this.plurality(al.map(i => S.votes[i] === null || S.votes[i] === undefined ? -1 : S.votes[i]));
    const skip = al.filter(i => S.votes[i] === -1).length;
    if (p.t >= 0 && !p.tie && p.n > skip) { this.kill(p.t); S.exec = { k: p.t, n: p.n }; this.log(`⚖️ قررت القرية إعدام ${S.seats[p.t].n} بـ ${p.n} أصوات${this.cfg.reveal ? ' — كان ' + WW_R[this.roles[p.t]].n + ' ' + WW_R[this.roles[p.t]].i : ''}`); }
    else { S.exec = { k: -1 }; this.log(p.tie ? '⚖️ تعادلت الأصوات — لم يُعدم أحد اليوم' : '⚖️ لم تتفق القرية — لم يُعدم أحد اليوم'); }
    S.step = 'dusk'; this.commit(); if (this.win()) return;
    this.after = 'night'; this.later(() => this.afterDeath(), 4200);
  }
  win() {
    const S = this.S, W = this.aliveRole('W').length, O = this.alive().length - W;
    if (W === 0) { this.finish('V', '🎉 قُضي على كل المستذئبين — فازت القرية!'); return true; }
    if (W >= O) { this.finish('W', '🐺 تساوى عدد المستذئبين مع القرويين — فاز المستذئبون!'); return true; }
    return false;
  }
  finish(w, why) { const S = this.S; S.ph = 'over'; S.win = w; S.why = why; S.roles = this.roles.slice(); S.step = 'over'; this.untimer(); this.log(why); this.commit(); }
  handle(p, a) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p), s = S.seats[i];
    if (S.ph !== 'play') { if (p === this.hostP && (a.t === 'go' || a.t === 'again')) { S.ph = 'wait'; this.start(); } return; }
    if (i < 0) return; const v = Math.floor(+a.v), role = this.roles[i];
    if (a.t === 'shoot' && S.step === 'hunter' && i === S.hunter) return this.shoot(v);
    if (s.dead) return;
    if (a.t === 'chat') { if (S.step === 'night') { if (role === 'W') return this.wolfChat(i, a.v); return; } return this.chat(i, a.v); }
    if (S.step === 'night') {
      const okT = S.seats[v] && !S.seats[v].dead;
      if (a.t === 'kill' && role === 'W' && okT && this.roles[v] !== 'W') { this.wv[i] = v; this.commit(); return this.checkNight(); }
      if (a.t === 'see' && role === 'S' && okT && v !== i && this.seerPick < 0) { this.seerPick = v; (this.seerRes[i] = this.seerRes[i] || []).push([v, this.roles[v] === 'W' ? 1 : 0]); this.commit(); return this.checkNight(); }
      if (a.t === 'save' && role === 'D' && okT && v !== this.lastDoc) { this.docPick = v; this.commit(); return this.checkNight(); }
    }
    if (a.t === 'vote' && S.step === 'day') return this.vote(i, v);
    if (a.t === 'shoot' && S.step === 'hunter' && i === S.hunter) return this.shoot(v);
  }
  chat(i, txt) { const S = this.S, now = Date.now(), t = wwClean(txt); if (!t || now - (this.chatAt[i] || 0) < 900) return; this.chatAt[i] = now; S.chat.push([i, t]); if (S.chat.length > 6) S.chat.shift(); this.commit(); }
  wolfChat(i, txt) { const now = Date.now(), t = wwClean(txt); if (!t || now - (this.chatAt[i] || 0) < 900) return; this.chatAt[i] = now; this.wchat.push([i, t]); if (this.wchat.length > 8) this.wchat.shift(); this.commit(); }
  /* ---------- bots ---------- */
  schedBots() {
    const S = this.S; if (S.ph !== 'play') return; const acts = [];
    if (S.step === 'night') this.alive().forEach(i => { if (!this.auto(i)) return; const r = this.roles[i]; if ((r === 'W' && this.wv[i] === undefined) || (r === 'S' && this.seerPick < 0) || (r === 'D' && this.docPick < 0)) acts.push(i); });
    else if (S.step === 'day') this.alive().forEach(i => { if (this.auto(i) && (S.votes[i] === null || S.votes[i] === undefined)) acts.push(i); });
    else if (S.step === 'hunter' && this.auto(S.hunter)) acts.push(S.hunter);
    acts.forEach(i => { const tok = S.step + ':' + S.round + ':' + S.day + ':' + i; if (this.botPending[i] === tok) return; this.botPending[i] = tok; const d = S.step === 'day' ? 5000 + Math.random() * Math.min(25000, (this.cfg.dayTime || 30) * 400) : 1500 + Math.random() * 3500; this.later(() => { if (this.botPending[i] === tok) { delete this.botPending[i]; this.botAct(i); } }, d); });
  }
  knownWolf(i) { const r = (this.seerRes[i] || []).find(([t, w]) => w && !this.S.seats[t].dead); return r ? r[0] : -1; }
  botAct(i) {
    const S = this.S; if (S.ph !== 'play' || (S.seats[i].dead && !(S.step === 'hunter' && i === S.hunter))) return; const role = this.roles[i], al = this.alive(), rnd = a => a[Math.floor(Math.random() * a.length)];
    if (S.step === 'night') {
      if (role === 'W') { const others = Object.values(this.wv); const c = al.filter(k => this.roles[k] !== 'W'); const t = others.length && Math.random() < .8 ? others[0] : rnd(c); return this.handle(S.seats[i].p, { t: 'kill', v: t }); }
      if (role === 'S') { const seen = (this.seerRes[i] || []).map(x => x[0]); const c = al.filter(k => k !== i && !seen.includes(k)); return this.handle(S.seats[i].p, { t: 'see', v: c.length ? rnd(c) : rnd(al.filter(k => k !== i)) }); }
      if (role === 'D') { const c = al.filter(k => k !== this.lastDoc); return this.handle(S.seats[i].p, { t: 'save', v: c.includes(i) && Math.random() < .4 ? i : rnd(c) }); }
    }
    if (S.step === 'day') {
      let t; const kw = role === 'S' ? this.knownWolf(i) : -1; const tally = this.plurality(al.map(k => S.votes[k] ?? -1));
      if (kw >= 0) t = kw;
      else if (role === 'W') { const c = al.filter(k => this.roles[k] !== 'W'); t = tally.t >= 0 && this.roles[tally.t] !== 'W' && Math.random() < .7 ? tally.t : rnd(c); }
      else { const c = al.filter(k => k !== i); t = tally.t >= 0 && tally.t !== i && Math.random() < .55 ? tally.t : (Math.random() < .15 ? -1 : rnd(c)); }
      return this.vote(i, t);
    }
    if (S.step === 'hunter' && i === S.hunter) { const c = al.filter(k => k !== i); const kw = this.knownWolf(i); return this.shoot(kw >= 0 ? kw : rnd(c)); }
  }
  botChatter() {
    const S = this.S, bots = this.alive().filter(i => S.seats[i].bot); if (!bots.length) return; const al = this.alive();
    pkShuffle(bots.slice()).slice(0, Math.min(2, bots.length)).forEach((b, k) => this.later(() => {
      if (S.step !== 'day' || S.seats[b].dead) return; const kw = this.roles[b] === 'S' ? this.knownWolf(b) : -1; let line;
      if (kw >= 0 && Math.random() < .6) line = `أنا العرّافة 🔮… ${S.seats[kw].n} مستذئب!`;
      else { const others = al.filter(x => x !== b && !S.seats[x].dead && !(this.roles[b] === 'W' && this.roles[x] === 'W')); const tg = others[Math.floor(Math.random() * others.length)]; line = WW_LINES[Math.floor(Math.random() * WW_LINES.length)](tg !== undefined ? S.seats[tg].n : 'أحدكم'); }
      this.chatAt[b] = 0; this.chat(b, line);
    }, 2500 + k * 4000 + Math.random() * 3000));
  }
  tick() {
    const S = this.S; if (S.ph !== 'play' || !S.end || Date.now() < S.end) return; this.untimer();
    if (S.step === 'night') { this.alive().forEach(i => { if (this.roles[i] === 'D' && this.docPick < 0) this.docPick = -2; if (this.roles[i] === 'S' && this.seerPick < 0) this.seerPick = -2; }); this.resolveNight(); }
    else if (S.step === 'day') this.endDay();
    else if (S.step === 'hunter') this.botAct(S.hunter);
  }
}

/* ---------------- view ---------------- */
const WWV = { sel: -1, intro: null, newsK: '', settled: '' };
const wwMe = S => S ? S.seats.findIndex(s => s.p === APP.myPeer) : -1;
const WW_SCENE = `<svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
 <defs><linearGradient id="wwN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060b22"/><stop offset=".6" stop-color="#16214a"/><stop offset="1" stop-color="#2a2f5c"/></linearGradient>
 <linearGradient id="wwD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb0ea"/><stop offset=".7" stop-color="#bfe3f5"/><stop offset="1" stop-color="#ffe3b0"/></linearGradient>
 <radialGradient id="wwMoon"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#f3e7b5"/><stop offset="1" stop-color="#f3e7b5" stop-opacity="0"/></radialGradient>
 <radialGradient id="wwSun"><stop offset="0" stop-color="#fff7cc"/><stop offset=".5" stop-color="#ffd25e"/><stop offset="1" stop-color="#ffb52e" stop-opacity="0"/></radialGradient></defs>
 <rect class="skyD" width="800" height="220" fill="url(#wwD)"/><rect class="skyN" width="800" height="220" fill="url(#wwN)"/>
 <g class="stars" fill="#fff"><circle cx="40" cy="30" r="1.3"/><circle cx="120" cy="60" r="1"/><circle cx="210" cy="22" r="1.2"/><circle cx="330" cy="48" r=".9"/><circle cx="460" cy="20" r="1.3"/><circle cx="560" cy="58" r="1"/><circle cx="700" cy="30" r="1.2"/><circle cx="760" cy="70" r=".8"/><circle cx="270" cy="80" r=".8"/><circle cx="620" cy="90" r=".9"/></g>
 <g class="moon"><circle cx="640" cy="62" r="60" fill="url(#wwMoon)" opacity=".7"/><circle cx="640" cy="62" r="30" fill="#fdf6d8"/><circle cx="630" cy="55" r="5" fill="#e6dbb0"/><circle cx="650" cy="72" r="7" fill="#e6dbb0"/><circle cx="645" cy="50" r="3" fill="#e6dbb0"/></g>
 <g class="sun"><circle cx="160" cy="62" r="70" fill="url(#wwSun)"/><circle cx="160" cy="62" r="28" fill="#ffe27a"/></g>
 <g class="clouds" fill="#fff" opacity=".85"><ellipse cx="300" cy="50" rx="40" ry="12"/><ellipse cx="330" cy="44" rx="26" ry="12"/><ellipse cx="540" cy="80" rx="46" ry="12"/><ellipse cx="570" cy="74" rx="24" ry="11"/></g>
 <path class="hill2" d="M0 170 Q120 120 260 150 T520 140 T800 150 L800 220 L0 220Z"/>
 <g class="wolf"><path d="M592 128 l6 -16 l4 8 l4 -10 l2 14 q10 4 12 14 l-4 2 q-4 -4 -10 -4 q-8 8 -20 8 q-6 6 -18 6 l2 -4 q8 -2 12 -8 q-4 -2 -2 -10z"/></g>
 <g class="pines"><path d="M30 190 l18 -50 l18 50z M70 196 l14 -40 l14 40z M720 192 l18 -54 l18 54z M760 198 l14 -40 l14 40z M110 200 l12 -32 l12 32z"/></g>
 <g class="houses"><path d="M250 200 v-34 l26 -20 l26 20 v34z M330 204 v-28 l22 -17 l22 17 v28z M420 202 v-38 l30 -22 l30 22 v38z M520 204 v-30 l22 -16 l22 16 v30z"/></g>
 <g class="win"><rect x="262" y="174" width="8" height="9"/><rect x="282" y="174" width="8" height="9"/><rect x="345" y="182" width="7" height="8"/><rect x="435" y="172" width="9" height="10"/><rect x="456" y="172" width="9" height="10"/><rect x="536" y="182" width="7" height="8"/></g>
 <rect class="ground" x="0" y="204" width="800" height="16"/>
</svg>`;
GAMES.ww = {
  key: 'ww', title: 'ذئب المافيا', Engine: WWEngine, hidden: true, hudIcon: '🐺',
  soloIcon: '🤖', soloLabel: 'مع لاعبين آليين', soloDesc: 'جرّب اللعبة مع قرويين آليين يتكلمون ويتّهمون', hostDesc: 'من 5 إلى 16 لاعباً، ويمكن إكمال العدد بلاعبين آليين',
  cfg: [
    { k: 'wolves', label: '🐺 عدد المستذئبين', d: 0, lo: 0, hi: 5, opts: [0, 1, 2, 3, 4, 5], fmt: v => v ? v : 'تلقائي حسب العدد' },
    { k: 'seer', label: '🔮 العرّافة', d: 1, lo: 0, hi: 1, opts: [1, 0], fmt: v => v ? 'موجودة' : 'بدون' },
    { k: 'doctor', label: '🩺 الطبيب', d: 1, lo: 0, hi: 1, opts: [1, 0], fmt: v => v ? 'موجود' : 'بدون' },
    { k: 'hunter', label: '🏹 الصيّاد (6 لاعبين فأكثر)', d: 1, lo: 0, hi: 1, opts: [1, 0], fmt: v => v ? 'موجود' : 'بدون' },
    { k: 'reveal', label: '🪦 كشف دور الميت', d: 1, lo: 0, hi: 1, opts: [1, 0], fmt: v => v ? 'نعم، يُكشف دوره' : 'لا، يبقى سراً' },
    { k: 'nightTime', label: '🌙 مدة الليل', d: 40, lo: 0, hi: 300, opts: [20, 30, 40, 60, 90, 0], fmt: secs },
    { k: 'dayTime', label: '☀️ مدة النقاش والتصويت نهاراً', d: 150, lo: 0, hi: 900, opts: [60, 90, 120, 150, 180, 240, 300, 0], fmt: v => v ? (v >= 60 ? (v / 60) + ' دقيقة' : v + ' ثانية') : 'بدون حد' },
    { k: 'bots', label: '🤖 عدد اللاعبين الآليين', d: 7, lo: 0, hi: 15, opts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], fmt: v => v ? v : 'بدون' },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>تُوزَّع الأدوار سراً: <b>🧑‍🌾 قرويون</b> و<b>🐺 مستذئبون</b> يعرفون بعضهم، ومعهم أدوار خاصة:
      <b>🔮 العرّافة</b> تكشف حقيقة لاعب كل ليلة، و<b>🩺 الطبيب</b> يحمي لاعباً كل ليلة، و<b>🏹 الصيّاد</b> يطلق سهماً على من يختار عند موته.</li>
    <li>🌙 <b>في الليل</b> تنام القرية، ويختار المستذئبون ضحية ويتهامسون في دردشة سرية.</li>
    <li>☀️ <b>في النهار</b> يُعلن من مات، ثم يتناقش الجميع ويصوّتون علناً لإعدام من يشكّون به. ومن لا يريد إعدام أحد يختار «امتناع».</li>
    <li>🎉 <b>تفوز القرية</b> إذا قضت على كل المستذئبين. 🐺 <b>يفوز المستذئبون</b> إذا تساوى عددهم مع الباقين.</li>
    <li>الميت لا يتكلم 🤐. والكذب والاتهام والدفاع جزء من المتعة!</li></ul>`,
  reset() { $('#wwSeats').innerHTML = ''; $('#wwChat').innerHTML = ''; WWV.sel = -1; },
  busy(S) { return S.ph === 'play' && wwMe(S) >= 0; },
  hud(S) { const i = wwMe(S); if (i < 0) return null; return S.seats[i].dead ? '🪦 ميت' : (S.ph === 'play' ? (S.step === 'night' ? '🌙 الليل ' + S.day : '☀️ اليوم ' + S.day) : '🐺'); },
  localKey() { return WWV.sel; },
  onState(prev, S) {
    if (prev && S.step !== prev.step) { WWV.sel = -1; if (S.step === 'night') sfx('lose'); if (S.step === 'day') sfx('turn'); }
    if (S.ph === 'over') { const key = APP.code + ':' + S.round; if (WWV.settled !== key) { WWV.settled = key; setTimeout(() => { banner(S.win === 'V' ? '🎉 فازت القرية' : '🐺 فاز المستذئبون', S.win === 'V' ? 'gold' : 'redt'); const me = wwMe(S), r = S.roles && me >= 0 ? S.roles[me] : null; sfx(r && ((S.win === 'W') === (r === 'W')) ? 'bj' : 'lose'); }, 300); } }
  },
  render(S, priv) {
    if (!S) { timerMsg($('#wwMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    const wrap = $('#wwWrap'), me = wwMe(S), night = S.ph === 'play' && (S.step === 'night' || S.step === 'hunter' && S.news && S.news.day && false), myRole = priv && priv.role;
    if (!$('#wwSky').firstChild) $('#wwSky').innerHTML = WW_SCENE;
    const isNight = S.ph === 'play' && ['night'].includes(S.step), dawn = S.step === 'dawn';
    wrap.classList.toggle('night', isNight); wrap.classList.toggle('dawn', dawn); wrap.classList.toggle('dusk', S.step === 'dusk');
    const sleeping = isNight && me >= 0 && !S.seats[me].dead && myRole && !['W', 'S', 'D'].includes(myRole);
    wrap.classList.toggle('sleep', !!sleeping);
    // news
    const nw = $('#wwNews'); let nk = '', nh = '';
    if (S.ph === 'play' && S.news && ['dawn', 'hunter', 'shot', 'day'].includes(S.step)) { const k = S.news.k; nk = 'n' + S.news.day + ':' + k + ':' + (S.news.shot ?? ''); nh = k >= 0 ? `<span class="big">🪦</span><div><b>${esc(S.seats[k].n)}</b> وُجد مقتولاً هذا الصباح${S.rv[k] ? `<br><small>كان ${WW_R[S.rv[k]].n} ${WW_R[S.rv[k]].i}</small>` : ''}</div>` : `<span class="big">🩺</span><div><b>لم يمت أحد!</b><br><small>أنقذ الطبيب ضحية المستذئبين</small></div>`; if (S.news.shot !== undefined) { const t = S.news.shot; nh += `<div class="shot">🏹 سهم الصيّاد أصاب <b>${esc(S.seats[t].n)}</b>${S.rv[t] ? ' — كان ' + WW_R[S.rv[t]].n : ''}</div>`; } }
    else if (S.ph === 'play' && S.exec && ['dusk', 'hunter', 'shot'].includes(S.step)) { const k = S.exec.k; nk = 'e' + S.day + ':' + k; nh = k >= 0 ? `<span class="big">⚖️</span><div>قررت القرية إعدام <b>${esc(S.seats[k].n)}</b>${S.rv[k] ? `<br><small>كان ${WW_R[S.rv[k]].n} ${WW_R[S.rv[k]].i}</small>` : ''}</div>` : `<span class="big">🤷</span><div><b>لم يُعدم أحد اليوم</b></div>`; }
    if (nw.dataset.k !== nk) { nw.dataset.k = nk; nw.innerHTML = nh; nw.classList.toggle('on', !!nh); if (nh) { nw.classList.remove('pop'); void nw.offsetWidth; nw.classList.add('pop'); sfx('flip'); } }
    // seats
    const box = $('#wwSeats'), keep = new Set(), mates = new Set(priv && priv.mates || []), seen = {}; (priv && priv.seen || []).forEach(([t, w]) => seen[t] = w);
    const tally = {}; if (S.step === 'day' || S.step === 'dusk') S.votes.forEach((t, v) => { if (t !== null && t !== undefined && t >= 0 && !S.seats[v].dead) (tally[t] = tally[t] || []).push(v); });
    const wv = {}; (priv && priv.wv || []).forEach(([w, t]) => (wv[t] = wv[t] || []).push(w));
    const alive = me >= 0 && !S.seats[me].dead;
    let pickMode = '';
    if (alive && S.step === 'night') pickMode = myRole === 'W' ? 'kill' : myRole === 'S' && (priv.pick === undefined || priv.pick < 0) ? 'see' : myRole === 'D' ? 'save' : '';
    else if (alive && S.step === 'day') pickMode = 'vote';
    else if (S.step === 'hunter' && S.hunter === me) pickMode = 'shoot';
    S.seats.forEach((s, i) => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'wws', '<div class="emo"></div><div class="net"></div><div class="av"></div><div class="nm"></div><div class="tag"></div><div class="vv"></div><div class="mk"></div>'); box.appendChild(e); SEATS.set(s.p, e); }
      if (e.parentNode !== box) box.appendChild(e); e.style.order = i;
      e.querySelector('.av').textContent = s.dead ? '🪦' : s.a; e.querySelector('.nm').textContent = i === me ? s.n + ' (أنت)' : s.n;
      const rr = S.roles ? S.roles[i] : (S.rv && S.rv[i]) || (mates.has(i) ? 'W' : null) || (i === me && myRole ? myRole : null);
      let tag = rr ? `${WW_R[rr].i} ${WW_R[rr].n}` : ''; if (!rr && seen[i] !== undefined) tag = seen[i] ? '🔮 مستذئب!' : '🔮 بريء';
      if (s.kicked) tag = 'طُرد'; else if (s.out && !s.bot && S.ph === 'play') tag += (tag ? ' • ' : '') + 'غادر (آلي)';
      const tg = e.querySelector('.tag'); tg.textContent = tag; tg.className = 'tag' + (rr === 'W' || seen[i] === 1 ? ' bad' : rr ? ' good' : seen[i] === 0 ? ' good' : '');
      const vv = e.querySelector('.vv'), voters = tally[i] || []; const vk = voters.join(','); if (vv.dataset.k !== vk) { vv.dataset.k = vk; vv.innerHTML = voters.length ? `<b>${voters.length}</b>` + voters.slice(0, 6).map(v => `<i>${S.seats[v].bot ? '🤖' : S.seats[v].a}</i>`).join('') : ''; }
      const mk = e.querySelector('.mk'); let m = '';
      if (S.step === 'night' && myRole === 'W' && wv[i]) m = '🐺'.repeat(wv[i].length); else if (S.step === 'night' && myRole === 'D' && priv.pick === i) m = '🛡️'; else if (S.step === 'night' && myRole === 'S' && priv.pick === i) m = '🔮';
      if (S.step === 'day' && S.votes[me] === i) m = '☝️'; mk.textContent = m;
      let can = !!pickMode && !s.dead;
      if (pickMode === 'kill') can = can && myRole === 'W' && !mates.has(i) && i !== me; if (pickMode === 'see') can = can && i !== me; if (pickMode === 'save') can = can && i !== (priv && priv.last); if (pickMode === 'shoot') can = can && i !== me;
      e.classList.toggle('dead', !!s.dead); e.classList.toggle('me', i === me); e.classList.toggle('wolfmate', mates.has(i) || (S.roles && S.roles[i] === 'W')); e.classList.toggle('pick', can); e.classList.toggle('sel', WWV.sel === i); e.classList.toggle('hunted', S.step === 'hunter' && S.hunter === i);
      e.onclick = can ? () => { if (pickMode === 'vote') { myAct({ t: 'vote', v: i }); sfx('pop'); return; } WWV.sel = WWV.sel === i ? -1 : i; sfx('pop'); renderGame(); } : null;
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    // chat (public or wolf)
    const ch = $('#wwChat'), wolfMode = S.step === 'night' && myRole === 'W'; const msgs = wolfMode ? (priv.wc || []) : (S.chat || []);
    const ck = (wolfMode ? 'w' : 'p') + msgs.map(c => c.join(':')).join('|');
    if (ch.dataset.k !== ck) { ch.dataset.k = ck; ch.innerHTML = ''; if (wolfMode) ch.appendChild(el('div', 'cm sys', '🐺 دردشة سرية — لا يراها إلا المستذئبون')); msgs.forEach(([i, t]) => { const s = S.seats[i]; const d = el('div', 'cm' + (i === me ? ' mine' : '') + (wolfMode ? ' wolf' : '')); const a = el('b'); a.textContent = (s ? (s.bot ? '' : s.a + ' ') + s.n : '') + ': '; d.append(a, document.createTextNode(t)); ch.appendChild(d); }); ch.scrollTop = ch.scrollHeight; }
    const inp = $('#wwChatIn'), canChat = S.ph !== 'play' ? me >= 0 : alive && (S.step !== 'night' || myRole === 'W');
    inp.disabled = !canChat; inp.placeholder = !alive && S.ph === 'play' ? '🤐 الموتى لا يتكلمون' : S.step === 'night' && myRole !== 'W' ? '🌙 القرية نائمة…' : wolfMode ? '🐺 همسة للمستذئبين…' : 'اتّهم، دافع، أقنع…';
    $('#wwChatBox').classList.toggle('wolf', wolfMode);
    const lg = $('#wwLog'), lk = S.log.join('\n'); if (lg.dataset.k !== lk) { lg.dataset.k = lk; lg.innerHTML = ''; S.log.slice().reverse().forEach((t, i) => { const d = el('div', i === 0 ? 'new' : ''); d.textContent = t; lg.appendChild(d); }); }
    if (S.ph === 'play' && myRole && WWV.intro !== APP.code + S.round) { WWV.intro = APP.code + S.round; wwIntro(priv, S); }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(), me = wwMe(S); let m1 = '', m2 = '', bar = false; const priv = getPriv(), r = priv && priv.role, alive = me >= 0 && !S.seats[me].dead;
    if (S.ph === 'wait') { m1 = 'بانتظار سكّان القرية'; m2 = S.seats.length < 5 ? `${S.seats.length}/5 — يلزم 5 لاعبين على الأقل` : `${S.seats.length} لاعبين — المضيف يبدأ اللعبة`; }
    else if (S.ph === 'over') { m1 = S.why; m2 = 'كُشفت كل الأدوار'; }
    else {
      if (S.step === 'night') { m1 = !alive ? '🌙 الليل ' + S.day + ' — تراقب من عالم الأرواح 👻' : r === 'W' ? '🐺 اختاروا ضحية الليلة' : r === 'S' ? (priv.pick >= 0 ? '🔮 رأيت الحقيقة… انتظر الصباح' : '🔮 اختر لاعباً لتكشف حقيقته') : r === 'D' ? '🩺 اختر لاعباً لتحميه الليلة' : '🌙 القرية نائمة… أغمض عينيك 😴'; }
      else if (S.step === 'dawn') m1 = '🌅 طلع الصباح…';
      else if (S.step === 'day') { const left = S.seats.filter((s, i) => !s.dead && (S.votes[i] === null || S.votes[i] === undefined)).length; m1 = `☀️ اليوم ${S.day}: من هو المستذئب؟`; m2 = left ? `بقي ${left} لم يصوّتوا` : 'اكتمل التصويت…'; }
      else if (S.step === 'dusk') m1 = '🌆 يحلّ المساء…';
      else if (S.step === 'hunter') m1 = S.hunter === me ? '🏹 أنت الصيّاد! اختر هدف سهمك الأخير' : '🏹 الصيّاد يصوّب سهمه…';
      else if (S.step === 'shot') m1 = '🏹 انطلق السهم!';
      if (S.end) { m2 = (m2 ? m2 + ' — ' : '') + Math.ceil(tl / 1000) + ' ث'; bar = true; }
    }
    timerMsg($('#wwMsg'), m1, m2, bar);
  },
  controls(box, S, priv, pending) {
    const me = wwMe(S), row = el('div', 'crow'); box.appendChild(row); const B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (S.ph === 'wait') { row.appendChild(el('div', 'status', APP.eng ? (S.seats.length < 5 ? `يلزم ${5 - S.seats.length} لاعبين إضافيين — ادعُ أصدقاءك أو أضف لاعبين آليين من ⚙️` : 'القرية جاهزة؟') : 'بانتظار المضيف...')); if (APP.eng) B('ابدأ اللعبة 🌕', 'gold', () => myAct({ t: 'go' }), S.seats.length < 5); return; }
    if (S.ph === 'over') { row.appendChild(el('div', 'status', S.why)); if (APP.eng) B('لعبة جديدة ▶', 'green', () => myAct({ t: 'again' })); return; }
    if (me < 0) { row.appendChild(el('div', 'status', '👀 أنت تشاهد')); return; }
    const r = priv && priv.role;
    if (r) { const rb = el('button', 'btn ghost sm rolebtn', '🔒 اضغط مطوّلاً لرؤية دورك'); const on = () => { rb.textContent = `دورك: ${WW_R[r].n} ${WW_R[r].i}`; rb.classList.add(r === 'W' ? 'r-F' : 'r-L'); }, off = () => { rb.textContent = '🔒 اضغط مطوّلاً لرؤية دورك'; rb.classList.remove('r-F', 'r-L'); }; rb.onpointerdown = on; rb.onpointerup = off; rb.onpointerleave = off; row.appendChild(rb); }
    if (S.step === 'hunter' && S.hunter === me) { const t2 = S.seats[WWV.sel]; if (t2) B(`🏹 أطلق السهم على ${t2.n}`, 'red', () => { myAct({ t: 'shoot', v: WWV.sel }); WWV.sel = -1; }); else row.appendChild(el('div', 'status', '🏹 أنت الصيّاد! اختر هدف سهمك الأخير')); return; }
    if (S.seats[me].dead) { row.appendChild(el('div', 'status', '🪦 لقد متّ — تابع بصمت 🤐')); return; }
    const t = S.seats[WWV.sel];
    if (S.step === 'night') {
      if (r === 'W') { if (t) B(`🐺 افترس ${t.n}`, 'red', () => { myAct({ t: 'kill', v: WWV.sel }); WWV.sel = -1; }); else row.appendChild(el('div', 'status', 'اضغط على لاعب لتختاره ضحية — زملاؤك يرون اختيارك')); return; }
      if (r === 'S') { if (priv.pick >= 0) { const res = (priv.seen || []).find(x => x[0] === priv.pick); row.appendChild(el('div', 'status', res ? `🔮 ${S.seats[priv.pick].n} ${res[1] ? 'مستذئب! 🐺' : 'بريء 🧑‍🌾'}` : '')); } else if (t) B(`🔮 اكشف حقيقة ${t.n}`, 'purple', () => { myAct({ t: 'see', v: WWV.sel }); WWV.sel = -1; }); else row.appendChild(el('div', 'status', 'اضغط على لاعب لتكشف حقيقته')); return; }
      if (r === 'D') { if (t) B(`🛡️ احمِ ${t.n}`, 'blue', () => { myAct({ t: 'save', v: WWV.sel }); WWV.sel = -1; }); else row.appendChild(el('div', 'status', priv.pick >= 0 ? `🛡️ تحمي الليلة: ${S.seats[priv.pick].n}` : 'اضغط على لاعب لتحميه')); return; }
      row.appendChild(el('div', 'status', '😴 نَم جيداً… وتمنَّ أن تستيقظ')); return;
    }
    if (S.step === 'day') { const v = S.votes[me]; row.appendChild(el('div', 'status', v === null || v === undefined ? 'اضغط على من تشكّ به لتصوّت ضده' : v === -1 ? '🤷 امتنعت عن التصويت' : `☝️ صوّتّ ضد ${S.seats[v].n} — يمكنك تغيير صوتك`)); B('🤷 امتناع', 'ghost sm', () => myAct({ t: 'vote', v: -1 }), v === -1); return; }
    if (S.step === 'hunter' && S.hunter === me) { if (t) B(`🏹 أطلق السهم على ${t.n}`, 'red', () => { myAct({ t: 'shoot', v: WWV.sel }); WWV.sel = -1; }); else row.appendChild(el('div', 'status', 'اختر هدفك')); return; }
    row.appendChild(el('div', 'status', '…'));
  }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function wwIntro(priv, S) {
  const R = WW_R[priv.role], mates = (priv.mates || []).map(k => S.seats[k].n);
  modal(`<div class="shintro wwintro"><h3>🌕 دورك في القرية</h3><div class="wwrole r-${priv.role}"><div class="ri">${R.i}</div><b>${R.n}</b><small>${R.d}</small></div>${priv.role === 'W' ? `<p class="mates">${mates.length ? '🐺 قطيعك: ' + mates.map(esc).join('، ') : '🐺 أنت المستذئب الوحيد… اصطد بذكاء'}</p>` : '<p>لا تثق بأحد… 👀</p>'}<p class="hint">لا تُظهر شاشتك لأحد 🤫</p></div><div class="mbtns"><button class="btn gold" id="wwOk">فهمت</button></div>`, b => { b.querySelector('#wwOk').onclick = closeModal; sfx('flip'); });
}
