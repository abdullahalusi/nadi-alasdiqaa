/* =====================================================================
   TEXAS HOLD'EM (No-Limit)
   ===================================================================== */
const PK_RV = r => '23456789TJQKA'.indexOf(r) + 2;
const PK_NAMES = ['ورقة عالية', 'زوج', 'زوجان', 'ثلاثة متشابهة', 'ستريت', 'فلاش', 'فل هاوس', 'أربعة متشابهة', 'ستريت فلاش'];
function pkEval5(cs) {
  const v = cs.map(c => PK_RV(c[0])).sort((a, b) => b - a), su = cs.map(c => c[1]), fl = su.every(x => x === su[0]);
  const cnt = {}; v.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
  const g = Object.entries(cnt).map(([k, c]) => [+k, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let st = 0; if (g.length === 5) { if (v[0] - v[4] === 4) st = v[0]; else if (v[0] === 14 && v[1] === 5) st = 5; }
  let cat, tb;
  if (st && fl) { cat = 8; tb = [st]; } else if (g[0][1] === 4) { cat = 7; tb = [g[0][0], g[1][0]]; } else if (g[0][1] === 3 && g[1][1] === 2) { cat = 6; tb = [g[0][0], g[1][0]]; }
  else if (fl) { cat = 5; tb = v; } else if (st) { cat = 4; tb = [st]; } else if (g[0][1] === 3) { cat = 3; tb = g.map(x => x[0]); }
  else if (g[0][1] === 2 && g[1][1] === 2) { cat = 2; tb = g.map(x => x[0]); } else if (g[0][1] === 2) { cat = 1; tb = g.map(x => x[0]); } else { cat = 0; tb = v; }
  let sc = cat; for (let i = 0; i < 5; i++) sc = sc * 15 + (tb[i] || 0); return sc;
}
function pkBest(cs) {
  const n = cs.length; if (n < 5) return -1; if (n === 5) return pkEval5(cs);
  let best = -1;
  if (n === 6) { for (let a = 0; a < 6; a++) { const s = pkEval5(cs.filter((_, i) => i !== a)); if (s > best) best = s; } return best; }
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const s = pkEval5(cs.filter((_, i) => i !== a && i !== b)); if (s > best) best = s; }
  return best;
}
function pkBestCards(cs) {
  const n = cs.length; let best = -1, bc = null;
  const idx = []; const rec = (st, pick) => { if (pick.length === 5) { const five = pick.map(i => cs[i]); const v = pkEval5(five); if (v > best) { best = v; bc = five; } return; } for (let i = st; i < n; i++) { pick.push(i); rec(i + 1, pick); pick.pop(); } };
  rec(0, idx); return { sc: best, cards: bc || [] };
}
const pkCat = sc => Math.floor(sc / 759375); // 15^5
function pkName(sc) { const c = pkCat(sc); if (c === 8 && Math.floor(sc / 50625) % 15 === 14) return 'رويال فلاش 👑'; return PK_NAMES[c]; }
function pkDeck() { const d = []; for (const r of '23456789TJQKA') for (const s of SUITS) d.push(r + s); return d; }
function pkShuffle(d) { const r = new Uint32Array(d.length); crypto.getRandomValues(r); for (let i = d.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function pkEquity(hole, board, opps, N) {
  const known = new Set([...hole, ...board]); const rest = pkDeck().filter(c => !known.has(c)); let score = 0;
  opps = Math.max(1, opps);
  for (let it = 0; it < N; it++) {
    const d = rest.slice(); const need = 5 - board.length + opps * 2;
    for (let i = 0; i < need; i++) { const j = i + Math.floor(Math.random() * (d.length - i)); [d[i], d[j]] = [d[j], d[i]]; }
    const bd = board.concat(d.slice(0, 5 - board.length)); let k = 5 - board.length;
    const me = pkBest(hole.concat(bd)); let best = 0, tie = 0;
    for (let o = 0; o < opps; o++) { const s = pkBest([d[k], d[k + 1]].concat(bd)); k += 2; if (s > best) best = s; }
    if (me > best) score += 1; else if (me === best) score += .5;
  }
  return score / N;
}

class PKEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) { super('pk', pub, hostP, round, cfg); Object.assign(this.S, { ph: 'wait', dl: -1, dlp: null, board: [], cur: 0, minR: 0, turn: -1, street: 0, res: null, hand: 0 }); this.holes = {}; this.deck = []; this.syncBots(); }
  bb() { return this.cfg.sb * 2; }
  newSeat(x) { const ch = this.bank[x.p] !== undefined ? this.bank[x.p] : this.cfg.start; return { p: x.p, n: x.n, a: x.a, ch, bet: 0, tot: 0, f: 0, ai: 0, ac: 0, act: '', sh: null, hn: '', win: 0, inh: 0, w: ch <= 0 ? 1 : 0 }; }
  syncBots() {
    const S = this.S; if (S.ph === 'hand') return;
    let bots = S.seats.filter(s => s.bot);
    while (bots.length < this.cfg.bots && S.seats.length < 6) { S.seats.push(this.botSeat({ ch: this.cfg.start, bet: 0, tot: 0, f: 0, ai: 0, ac: 0, act: '', sh: null, hn: '', win: 0, inh: 0, w: 0 })); bots = S.seats.filter(s => s.bot); }
    while (bots.length > this.cfg.bots) { const b = bots.pop(); S.seats.splice(S.seats.indexOf(b), 1); }
  }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph !== 'hand') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => { if (s.out && !s.bot) { this.bank[s.p] = s.ch; return false; } return true; }); if (S.seats.length !== n0) ch = true;
      for (const x of list) { if (S.seats.find(s => s.p === x.p)) continue; if (S.seats.length >= 6) { const b = S.seats.filter(s => s.bot).pop(); if (!b) break; S.seats.splice(S.seats.indexOf(b), 1); } S.seats.push(this.newSeat(x)); ch = true; }
      if (this.autoStart()) ch = true;
    } else if (S.turn >= 0 && S.seats[S.turn] && S.seats[S.turn].out) { this.doAct(S.turn, { t: 'fold' }); return; }
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  eligible() { return this.S.seats.filter(s => !s.out && (s.ch > 0 || s.bot)).length; }
  autoStart() { const S = this.S; if (S.ph !== 'wait') return false; const ok = this.eligible() >= 2; if (ok && !S.end) { this.timer(3500); return true; } if (!ok && S.end) { this.untimer(); return true; } return false; }
  onCfg() { const S = this.S; if (S.ph !== 'hand') { this.syncBots(); this.autoStart(); } else if (S.turn >= 0) { if (this.cfg.turn) this.timer(this.cfg.turn * 1000); else this.untimer(); } }
  onChips(s) { if (s.ch > 0) s.w = 0; if (this.S.ph === 'wait') this.autoStart(); }
  onKick(p, i) {
    const S = this.S; if (i < 0) return false; const s = S.seats[i];
    if (S.ph === 'hand' && s.inh && !s.f) { s.out = 1; s.kicked = 1; if (S.turn === i) { this.doAct(i, { t: 'fold' }); return true; } s.f = 1; s.act = 'طُرد'; const live = S.seats.filter(x => x.inh && !x.f); if (live.length === 1) { this.winFold(S.seats.indexOf(live[0])); return true; } return false; }
    if (S.ph === 'hand') { s.out = 1; s.kicked = 1; return false; }
    S.seats.splice(i, 1); this.autoStart(); return false;
  }
  priv(p) { const h = this.holes[p]; return h ? { r: this.S.round, h } : null; }
  put(s, amt) { amt = Math.max(0, Math.min(amt, s.ch)); s.ch -= amt; s.bet += amt; s.tot += amt; if (s.ch <= 0) { s.ch = 0; s.ai = 1; } }
  nxt(i) { const S = this.S, n = S.seats.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (S.seats[j].inh && !S.seats[j].f) return j; } return i; }
  needs(s) { return s.inh && !s.f && !s.ai && (!s.ac || s.bet < this.S.cur); }
  startHand() {
    const S = this.S; if (S.ph === 'hand') return; this.untimer();
    S.seats = S.seats.filter(s => { if (s.out && !s.bot) { this.bank[s.p] = s.ch; return false; } return true; }); this.syncBots();
    S.seats.forEach(s => { if (s.bot && s.ch <= 0) s.ch = this.cfg.start; Object.assign(s, { bet: 0, tot: 0, f: 0, ai: 0, ac: 0, act: '', sh: null, hn: '', win: 0, inh: 0, w: s.ch <= 0 ? 1 : 0 }); });
    const parts = S.seats.map((s, i) => i).filter(i => S.seats[i].ch > 0 && !S.seats[i].out);
    if (parts.length < 2) { S.ph = 'wait'; S.res = null; S.board = []; S.turn = -1; this.holes = {}; this.autoStart(); this.commit(); return; }
    parts.forEach(i => S.seats[i].inh = 1);
    S.hand++; S.round++;
    this.deck = pkShuffle(pkDeck()); this.holes = {};
    parts.forEach(i => this.holes[S.seats[i].p] = [this.deck.pop(), this.deck.pop()]);
    let prev = S.seats.findIndex(s => s.p === S.dlp); if (prev < 0) prev = S.seats.length - 1;
    const dl = this.nxt(prev); S.dl = dl; S.dlp = S.seats[dl].p;
    let sb, bb; if (parts.length === 2) { sb = dl; bb = this.nxt(dl); } else { sb = this.nxt(dl); bb = this.nxt(sb); }
    this.put(S.seats[sb], this.cfg.sb); S.seats[sb].act = 'صغير ' + fmt(S.seats[sb].bet);
    this.put(S.seats[bb], this.bb()); S.seats[bb].act = 'كبير ' + fmt(S.seats[bb].bet);
    S.cur = this.bb(); S.minR = this.bb(); S.street = 0; S.board = []; S.res = null; S.ph = 'hand'; S.turn = -1;
    const first = parts.length === 2 ? sb : this.nxt(bb);
    this.commit();
    this.later(() => this.goFrom(first), 1300);
  }
  goFrom(i) { const S = this.S, n = S.seats.length; for (let k = 0; k < n; k++) { const j = (i + k) % n; if (this.needs(S.seats[j])) return this.setTurn(j); } this.endStreet(); }
  setTurn(j) {
    const S = this.S; S.turn = j; const s = S.seats[j];
    if (this.cfg.turn && !s.bot) this.timer(this.cfg.turn * 1000); else this.untimer();
    this.commit();
    if (s.bot) this.later(() => this.botAct(j), 900 + Math.random() * 1100);
    else if (s.out) this.later(() => this.doAct(j, { t: 'fold' }), 300);
  }
  handle(p, a) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p); if (i < 0) return;
    if (S.ph !== 'hand') { if (a.t === 'go' && p === this.hostP && S.ph === 'wait' && this.eligible() >= 2) this.startHand(); return; }
    if (i !== S.turn) return; this.doAct(i, a);
  }
  doAct(i, a) {
    const S = this.S, s = S.seats[i]; if (S.ph !== 'hand' || S.turn !== i) return; const toCall = S.cur - s.bet;
    if (a.t === 'fold') { s.f = 1; s.act = 'انسحب'; }
    else if (a.t === 'check') { if (toCall > 0) return; s.act = 'تمرير'; }
    else if (a.t === 'call') { if (toCall <= 0) s.act = 'تمرير'; else { this.put(s, toCall); s.act = s.ai ? 'كل شيء!' : 'مجاراة'; } }
    else if (a.t === 'raise' || a.t === 'allin') {
      const max = s.bet + s.ch; let v = a.t === 'allin' ? max : Math.floor(+a.v || 0); if (v >= max) v = max;
      if (v <= S.cur) { if (v !== max) return; this.put(s, v - s.bet); s.act = 'كل شيء!'; }
      else { if (v < S.cur + S.minR && v < max) return; const by = v - S.cur; this.put(s, v - s.bet); if (by >= S.minR) { S.minR = by; S.seats.forEach(o => { if (o !== s) o.ac = 0; }); } S.cur = v; s.act = s.ai ? 'كل شيء!' : 'رفع ' + fmt(v); }
    } else return;
    s.ac = 1; this.untimer(); S.turn = -1;
    const live = S.seats.filter(x => x.inh && !x.f);
    if (live.length === 1) return this.winFold(S.seats.indexOf(live[0]));
    const n = S.seats.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (this.needs(S.seats[j])) return this.setTurn(j); }
    this.endStreet();
  }
  endStreet() {
    const S = this.S; S.seats.forEach(s => { s.bet = 0; s.ac = 0; if (s.inh && !s.f && !s.ai) s.act = ''; }); S.cur = 0; S.minR = this.bb(); S.turn = -1; this.untimer();
    S.street++;
    if (S.street === 1) S.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop()); else if (S.street <= 3) S.board.push(this.deck.pop());
    if (S.street >= 4) return this.showdown();
    const canAct = S.seats.filter(s => s.inh && !s.f && !s.ai);
    this.commit();
    if (canAct.length <= 1) { this.later(() => this.endStreet(), 1500); return; }
    this.later(() => this.goFrom((S.dl + 1) % S.seats.length), 900);
  }
  winFold(i) {
    const S = this.S, s = S.seats[i], total = S.seats.reduce((m, x) => m + x.tot, 0);
    s.ch += total; s.win = total; S.seats.forEach(x => { x.bet = 0; this.bank[x.p] = x.ch; });
    S.res = { fold: 1, txt: `${s.n} يربح ${fmt(total)}`, w: [s.p], win: [{ p: s.p, n: s.n, a: s.a, amt: total }] }; S.ph = 'show'; S.turn = -1; this.timer(5500); this.commit();
  }
  showdown() {
    const S = this.S, live = [], sc = {};
    const bestC = {}; S.seats.forEach((s, i) => { if (s.inh && !s.f) { live.push(i); const r = pkBestCards(this.holes[s.p].concat(S.board)); sc[i] = r.sc; bestC[i] = r.cards; s.sh = this.holes[s.p]; s.hn = pkName(sc[i]); } });
    const wins = S.seats.map(() => 0), total = S.seats.reduce((m, x) => m + x.tot, 0);
    const levels = [...new Set(live.map(i => S.seats[i].tot))].sort((a, b) => a - b); let prev = 0, dist = 0;
    for (const L of levels) {
      let pot = 0; S.seats.forEach(s => pot += Math.max(0, Math.min(s.tot, L) - prev));
      const el2 = live.filter(i => S.seats[i].tot >= L); const best = Math.max(...el2.map(i => sc[i])); const W = el2.filter(i => sc[i] === best);
      const share = Math.floor(pot / W.length); W.forEach((i, k) => wins[i] += share + (k === 0 ? pot - share * W.length : 0)); dist += pot; prev = L;
    }
    if (total > dist) { const best = Math.max(...live.map(i => sc[i])); wins[live.find(i => sc[i] === best)] += total - dist; }
    const ws = []; S.seats.forEach((s, i) => { s.bet = 0; if (wins[i]) { s.ch += wins[i]; s.win = wins[i]; ws.push(s); } this.bank[s.p] = s.ch; });
    const top = ws.sort((a, b) => b.win - a.win);
    S.res = { txt: top.map(s => `${s.n} +${fmt(s.win)}`).join(' • ') + (top[0] ? ' — ' + top[0].hn : ''), w: top.map(s => s.p), win: top.map(s => ({ p: s.p, n: s.n, a: s.a, amt: s.win, hn: s.hn, best: bestC[S.seats.indexOf(s)] })) };
    S.ph = 'show'; S.turn = -1; this.timer(10000); this.commit();
  }
  botAct(i) {
    const S = this.S, s = S.seats[i]; if (S.ph !== 'hand' || S.turn !== i) return;
    const hole = this.holes[s.p], opp = S.seats.filter((o, j) => j !== i && o.inh && !o.f).length;
    const eq = pkEquity(hole, S.board, opp, 220), pot = S.seats.reduce((m, o) => m + o.tot, 0), toCall = S.cur - s.bet, r = Math.random(), max = s.bet + s.ch;
    const raiseTo = f => Math.min(max, S.cur + Math.max(S.minR, Math.floor(pot * f / this.cfg.sb) * this.cfg.sb));
    if (toCall <= 0) { if (eq > 0.6 && r < 0.7) return this.doAct(i, { t: 'raise', v: raiseTo(0.5 + r * 0.5) }); if (r < 0.08) return this.doAct(i, { t: 'raise', v: raiseTo(0.5) }); return this.doAct(i, { t: 'check' }); }
    const odds = toCall / (pot + toCall);
    if (eq > 0.8 && r < 0.6) return this.doAct(i, { t: 'raise', v: raiseTo(0.9) });
    if (eq > odds + 0.05 || (toCall <= this.bb() && eq > 0.28) || r < 0.05) return this.doAct(i, { t: 'call' });
    return this.doAct(i, { t: 'fold' });
  }
  tick() {
    const S = this.S, now = Date.now();
    if (S.ph === 'wait' && S.end && now >= S.end) { this.untimer(); if (this.eligible() >= 2) this.startHand(); else this.commit(); }
    else if (S.ph === 'hand' && S.turn >= 0 && S.end && now >= S.end) { const s = S.seats[S.turn]; this.doAct(S.turn, { t: S.cur - s.bet > 0 ? 'fold' : 'check' }); }
    else if (S.ph === 'show' && S.end && now >= S.end) { this.untimer(); S.ph = 'wait'; this.startHand(); }
  }
}

/* ---------- poker view ---------- */
const PKV = { raise: 0, settled: '', bets: new Map() };
function pkSlots(n, rot) { const out = []; for (let k = 0; k < n; k++) { const th = (90 + (k * 360 / n)) * Math.PI / 180; out.push({ x: 50 + 43 * Math.cos(th), y: 50 + 35 * Math.sin(th) }); } return out; }
function pkMyCards(S, s, priv) { if (s.sh) return s.sh; if (!s.inh) return []; if (s.p === APP.myPeer && priv && priv.r === S.round) return priv.h; return ['XX', 'XX']; }
GAMES.pk = {
  key: 'pk', title: 'بوكر تكساس', Engine: PKEngine, chips: true, hidden: true,
  soloIcon: '🤖', soloLabel: 'ضد الكمبيوتر', soloDesc: 'العب ضد لاعبين آليين', hostDesc: 'حتى 6 لاعبين، ويمكن إضافة لاعبين آليين',
  cfg: [
    { k: 'start', label: '💰 نقود البداية لكل لاعب', d: 1000, lo: 10, hi: 1e8, step: 10 },
    { k: 'sb', label: '🪙 الرهان الإجباري الصغير (الكبير ضعفه)', d: 5, lo: 1, hi: 1e6, opts: [1, 2, 5, 10, 25, 50, 100, 500] },
    { k: 'turn', label: '⏱️ وقت الدور لكل لاعب', d: 20, lo: 0, hi: 300, opts: [10, 15, 20, 30, 45, 60, 90, 0], fmt: secs },
    { k: 'bots', label: '🤖 عدد اللاعبين الآليين', d: 3, lo: 0, hi: 5, opts: [0, 1, 2, 3, 4, 5], fmt: v => v ? v : 'بدون' },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>كل لاعب يأخذ ورقتين مخفيتين، وتُكشف 5 أوراق مشتركة على مراحل: ثلاث ثم واحدة ثم واحدة.</li>
    <li>أفضل 5 أوراق من 7 تفوز. الترتيب من الأعلى: ستريت فلاش، أربعة، فل هاوس، فلاش، ستريت، ثلاثة، زوجان، زوج، ورقة عالية.</li>
    <li>في دورك: <b>انسحب</b>، <b>مرّر</b> (إن لم يكن هناك رهان)، <b>جارِ</b>، أو <b>ارفع</b>.</li>
    <li>أوراقك مشفّرة ولا يراها إلا أنت (والمضيف بصفته الموزّع).</li></ul>`,
  reset() { $('#pkSeats').innerHTML = ''; $('#pkBoard').innerHTML = ''; PKV.bets.forEach(e => e.remove()); PKV.bets.clear(); },
  busy(S) { const s = mySeat(S); return S.ph === 'hand' && s && s.inh && !s.f; },
  hud(S) { const s = mySeat(S); return s ? fmt(s.ch) : null; },
  chipsEdited(prev, S, a, b) { return S.ph !== 'hand' && prev.ph !== 'hand' && S.round === prev.round && a.ch !== b.ch; },
  localKey() { return ''; },
  onState(prev, S) {
    if (prev && S.turn >= 0 && S.seats[S.turn] && S.seats[S.turn].p === APP.myPeer && prev.turn !== S.turn) sfx('turn');
    if (prev && S.ph === 'hand' && prev.round !== S.round) { PKV.raise = 0; }
    if (S.ph === 'show') { const key = APP.code + ':' + S.round; if (PKV.settled !== key) { PKV.settled = key; setTimeout(() => { S.seats.forEach(s => { if (s.win) showNet(s.p, s.win); }); const me = mySeat(S), w0 = S.res && S.res.win && S.res.win[0]; if (me && me.win) { banner('فزت! +' + fmt(me.win), 'gold'); sfx('win'); coinBurst(me.p, $('#pkPot')); } else { if (w0 && !S.res.fold && w0.hn) banner(w0.hn, 'wht'); if (me && me.inh) sfx('lose'); } S.seats.forEach(s => { if (s.win && s.p !== (me && me.p)) coinBurst(s.p, $('#pkPot')); }); }, 300); } }
  },
  render(S, priv) {
    if (!S) { timerMsg($('#pkMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    syncHand($('#pkBoard'), S.board);
    const showRes = S.ph === 'show' && S.res && S.res.win ? S.res : null, hiSet = new Set(showRes && !showRes.fold && showRes.win[0] && showRes.win[0].best || []);
    const hl = box => [...box.children].forEach(c => { const on = hiSet.size && hiSet.has(c.dataset.c); c.classList.toggle('hl', !!on); c.classList.toggle('dim', !!hiSet.size && !on && box.id === 'pkBoard'); });
    hl($('#pkBoard'));
    const wp = $('#pkWin'), wk = showRes ? APP.code + ':' + S.round : '';
    if (wp.dataset.k !== wk) {
      wp.dataset.k = wk; wp.innerHTML = ''; wp.classList.toggle('on', !!showRes);
      if (showRes) {
        wp.appendChild(el('div', 'pw-title', showRes.win.length > 1 ? '🏆 تقاسم الفوز' : '🏆 الفائز'));
        showRes.win.forEach(w => {
          const r = el('div', 'pw-row'); const av = el('div', 'pw-av'); av.textContent = w.a; const info = el('div', 'pw-info');
          const nm = el('div', 'pw-nm'); nm.textContent = (w.p === APP.myPeer ? 'أنت' : w.n); const amt = el('div', 'pw-amt'); amt.textContent = '+' + fmt(w.amt);
          const hn = el('div', 'pw-hn'); hn.textContent = showRes.fold ? 'انسحب الجميع — فاز دون كشف الأوراق' : w.hn;
          info.append(nm, hn); r.append(av, info, amt); wp.appendChild(r);
          if (!showRes.fold && w.best && w.best.length) { const bc = el('div', 'pw-cards'); w.best.forEach(c => bc.appendChild(makeCard(c))); r.insertBefore(bc, amt); }
        });
        wp.classList.remove('pop'); void wp.offsetWidth; wp.classList.add('pop');
      }
    }
    const pot = S.seats.reduce((m, s) => m + s.tot, 0) - S.seats.reduce((m, s) => m + s.bet, 0);
    $('#pkPot').innerHTML = S.ph !== 'show' && (pot > 0 || S.ph === 'hand') ? `<span class="coin"></span> الرهانات: <b>${fmt(Math.max(0, pot))}</b>` : '';
    const n = S.seats.length, myIdx = S.seats.findIndex(s => s.p === APP.myPeer), slots = pkSlots(n), box = $('#pkSeats'), table = $('#pkTable'), keep = new Set();
    S.seats.forEach((s, i) => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'pk-seat', '<div class="emo"></div><div class="net"></div><div class="hand cards"></div><div class="hn"></div><div class="plate"><div class="av"></div><div class="pinfo"><div class="nm"></div><div class="pch"></div></div><div class="dbtn">D</div></div><div class="actlbl"></div>'); box.appendChild(e); SEATS.set(s.p, e); }
      const di = myIdx >= 0 ? (i - myIdx + n) % n : i, pos = slots[di];
      e.style.left = pos.x + '%'; e.style.top = pos.y + '%';
      e.classList.toggle('me', s.p === APP.myPeer); e.classList.toggle('f', !!s.f); e.classList.toggle('out', !!s.out || (!s.inh && S.ph === 'hand'));
      e.classList.toggle('turn', S.turn === i); e.classList.toggle('win', S.ph === 'show' && s.win > 0);
      e.querySelector('.av').textContent = s.a; e.querySelector('.nm').textContent = s.p === APP.myPeer ? s.n + ' (أنت)' : s.n;
      e.querySelector('.pch').textContent = s.w && S.ph !== 'hand' ? 'نفدت نقوده' : '💰 ' + fmt(s.ch);
      e.querySelector('.dbtn').style.display = S.dl === i && S.ph !== 'wait' ? '' : 'none';
      const al = e.querySelector('.actlbl'); al.textContent = s.kicked ? 'طُرد' : s.act || ''; al.style.opacity = (s.act || s.kicked) ? 1 : 0;
      syncHand(e.querySelector('.cards'), pkMyCards(S, s, priv));
      hl(e.querySelector('.cards'));
      let hn = s.hn || ''; if (!hn && s.p === APP.myPeer && priv && priv.r === S.round && S.board.length >= 3 && s.inh && !s.f) hn = pkName(pkBest(priv.h.concat(S.board)));
      const isW = showRes && showRes.w.includes(s.p); const hnEl = e.querySelector('.hn'); hnEl.textContent = (isW && !showRes.fold ? '👑 ' : '') + hn; hnEl.style.opacity = hn ? 1 : 0; hnEl.classList.toggle('w', !!isW); hnEl.classList.toggle('l', !!(showRes && !isW && s.sh));
      let cr = e.querySelector('.crown'); if (!cr) { cr = el('div', 'crown', '👑'); e.appendChild(cr); } cr.classList.toggle('on', !!isW);
      // bet chips toward center
      let b = PKV.bets.get(s.p); if (!b) { b = el('div', 'pk-bet', '<div class="stack"></div><span class="amt"></span>'); table.appendChild(b); PKV.bets.set(s.p, b); }
      b.style.left = (50 + (pos.x - 50) * 0.58) + '%'; b.style.top = (48 + (pos.y - 50) * 0.5) + '%';
      if (b.dataset.a !== String(s.bet)) { b.dataset.a = s.bet; renderStack(b.querySelector('.stack'), s.bet); b.querySelector('.amt').textContent = s.bet ? fmt(s.bet) : ''; }
      b.style.opacity = s.bet ? 1 : 0;
      e.querySelector('.av').classList.toggle('ring', S.turn === i && !!S.end);
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    for (const [p, b] of PKV.bets) if (!keep.has(p)) { b.remove(); PKV.bets.delete(p); }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(); let m1 = '', m2 = '', bar = false;
    if (S.ph === 'wait') { const el2 = S.seats.filter(s => !s.out && (s.ch > 0 || s.bot)).length; if (el2 < 2) { m1 = 'بانتظار اللاعبين'; m2 = 'يلزم لاعبان على الأقل لديهما نقود'; } else { m1 = 'اليد التالية تبدأ قريباً'; m2 = APP.localEnd ? `خلال ${Math.ceil(tl / 1000)} ث` : ''; bar = !!APP.localEnd; } }
    else if (S.ph === 'hand') { const st = ['قبل الكشف', 'الفلوب', 'التيرن', 'الريفر'][Math.min(S.street, 3)]; if (S.turn >= 0) { const s = S.seats[S.turn]; m1 = s.p === APP.myPeer ? '🎯 دورك!' : 'دور ' + s.n; m2 = st + (S.end ? ` — ${Math.ceil(tl / 1000)} ث` : ''); bar = !!S.end; } else { m1 = st; m2 = ''; } }
    else if (S.ph === 'show') { m1 = ''; m2 = `يد جديدة خلال ${Math.ceil(tl / 1000)} ث`; }
    timerMsg($('#pkMsg'), m1, m2, bar);
    if (S.turn >= 0 && S.end) { const s = S.seats[S.turn], e = s && SEATS.get(s.p); if (e) e.querySelector('.av').style.setProperty('--p', timePct().toFixed(3)); }
  },
  controls(box, S, priv, pending) {
    const s = mySeat(S), row = el('div', 'crow'); box.appendChild(row); const B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (!s) { statusRow(box, '👀 أنت تشاهد — ستنضم في اليد القادمة'); row.remove(); return; }
    if (S.ph === 'hand' && S.turn >= 0 && S.seats[S.turn] === s) {
      const toCall = S.cur - s.bet, max = s.bet + s.ch, minT = Math.min(max, S.cur + S.minR), pot = S.seats.reduce((m, x) => m + x.tot, 0);
      B('🏳️ انسحب', 'red', () => myAct({ t: 'fold' }));
      if (toCall <= 0) B('✋ مرّر', 'ghost', () => myAct({ t: 'check' })); else B(`📞 جارِ ${fmt(Math.min(toCall, s.ch))}`, 'green', () => myAct({ t: 'call' }));
      if (s.ch > toCall) {
        const r2 = el('div', 'crow raisebox'); box.appendChild(r2);
        if (!PKV.raise || PKV.raise < minT || PKV.raise > max) PKV.raise = minT;
        const rng = el('input'); rng.type = 'range'; rng.min = minT; rng.max = max; rng.step = Math.max(1, this.cfgSb(S)); rng.value = PKV.raise;
        const rb = el('button', 'btn gold', ''); const upd = () => { PKV.raise = Math.min(max, Math.max(minT, +rng.value)); rb.innerHTML = PKV.raise >= max ? '🔥 كل شيء ' + fmt(max) : '⬆️ ارفع إلى ' + fmt(PKV.raise); };
        rng.oninput = upd; upd(); rb.disabled = pending; rb.onclick = () => myAct(PKV.raise >= max ? { t: 'allin' } : { t: 'raise', v: PKV.raise });
        const q = (t, v) => { const b = el('button', 'btn ghost sm', t); b.onclick = () => { rng.value = Math.min(max, Math.max(minT, Math.round(v))); upd(); }; r2.appendChild(b); };
        q('½', S.cur + pot / 2); q('الكل في الوسط', S.cur + pot); q('الحد الأقصى', max);
        r2.appendChild(rng); r2.appendChild(rb);
      }
      return;
    }
    let t = '';
    if (S.ph === 'wait') t = s.w || s.ch <= 0 ? (APP.eng ? 'نفدت نقودك — عدّلها من الإعدادات ⚙️' : 'نفدت نقودك 😅 اطلب من المضيف نقوداً') : 'بانتظار بدء اليد...';
    else if (S.ph === 'hand') t = !s.inh ? '👀 تجلس خارج هذه اليد' : s.f ? 'انسحبت من هذه اليد' : s.ai ? '🔥 دخلت بكل شيء — بالتوفيق' : 'انتظر دورك...';
    else if (S.ph === 'show') t = s.win ? `🎉 ربحت ${fmt(s.win)}` : (s.inh ? 'خسرت هذه اليد' : 'انتهت اليد');
    const st = el('div', 'status'); st.textContent = t; row.appendChild(st);
    if (APP.eng && S.ph === 'wait' && S.seats.filter(x => !x.out && (x.ch > 0 || x.bot)).length >= 2) B('ابدأ اليد ▶', 'green sm', () => myAct({ t: 'go' }));
    if (APP.eng && (s.w || s.ch <= 0) && S.ph !== 'hand') B('⚙️ الإعدادات', 'gold sm', openSettings);
  },
  cfgSb(S) { return (S.cfg && S.cfg.sb) || 1; }
};
