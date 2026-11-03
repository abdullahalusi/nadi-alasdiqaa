/* =====================================================================
   DOMINOES (double-six, draw / block)
   ===================================================================== */
const DM_PIPS = { h: { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 1, 2, 6, 7, 8] }, v: { 0: [], 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] } };
const dmParse = t => t.split('-').map(Number);
const dmPips = hand => hand.reduce((m, t) => { const [a, b] = dmParse(t); return m + a + b; }, 0);
function dmTile(a, b, orient, cls) {
  const e = el('div', 'dmt ' + orient + (cls ? ' ' + cls : ''));
  if (a == null) { e.classList.add('back'); return e; }
  [a, b].forEach(v => { const h = el('div', 'hf'); const on = new Set(DM_PIPS[orient][v]); for (let i = 0; i < 9; i++) h.appendChild(el('i', on.has(i) ? 'pp' : '')); e.appendChild(h); });
  return e;
}

class DMEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) { super('dm', pub, hostP, round, cfg); Object.assign(this.S, { ph: 'wait', chain: [], turn: -1, bone: 0, last: null, res: null, rev: null, match: 1, passes: 0, lastWinP: null }); this.hands = {}; this.yard = []; this.syncBots(); }
  newSeat(x) { return { p: x.p, n: x.n, a: x.a, sc: this.bank[x.p] || 0, cnt: 0, pass: 0 }; }
  syncBots() { const S = this.S; if (S.ph === 'play') return; let bots = S.seats.filter(s => s.bot); while (bots.length < this.cfg.bots && S.seats.length < 4) { S.seats.push(this.botSeat({ sc: 0, cnt: 0, pass: 0 })); bots = S.seats.filter(s => s.bot); } while (bots.length > this.cfg.bots) { const b = bots.pop(); S.seats.splice(S.seats.indexOf(b), 1); } }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph !== 'play') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => { if (s.out && !s.bot) { this.bank[s.p] = s.sc; return false; } return true; }); if (n0 !== S.seats.length) ch = true;
      for (const x of list) { if (S.seats.find(s => s.p === x.p)) continue; if (S.seats.length >= 4) { const b = S.seats.filter(s => s.bot).pop(); if (!b) break; S.seats.splice(S.seats.indexOf(b), 1); } S.seats.push(this.newSeat(x)); ch = true; }
      if (this.autoStart()) ch = true;
    } else if (S.turn >= 0 && S.seats[S.turn] && S.seats[S.turn].out) { this.nextTurn(S.turn); return; }
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  autoStart() { const S = this.S; if (S.ph !== 'wait') return false; const ok = S.seats.filter(s => !s.out).length >= 2; if (ok && !S.end) { this.timer(3500); return true; } if (!ok && S.end) { this.untimer(); return true; } return false; }
  onCfg() { const S = this.S; if (S.ph !== 'play') { this.syncBots(); this.autoStart(); } else if (S.turn >= 0) { if (this.cfg.turn && !S.seats[S.turn].bot) this.timer(this.cfg.turn * 1000); else this.untimer(); } }
  resetScores() { this.S.seats.forEach(s => { s.sc = 0; this.bank[s.p] = 0; }); this.commit(); }
  onKick(p, i) {
    const S = this.S; if (i < 0) return false; const s = S.seats[i];
    if (S.ph === 'play') { s.out = 1; s.kicked = 1; if (S.seats.filter(x => !x.out).length < 2) { this.abort(); return true; } if (S.turn === i) { this.nextTurn(i); return true; } return false; }
    S.seats.splice(i, 1); this.autoStart(); return false;
  }
  priv(p) { const h = this.hands[p]; return h ? { r: this.S.round, h: h.join(',') } : null; }
  legal(hand) {
    const S = this.S; if (!S.chain.length) return hand.map(t => ({ t, sides: ['R'] }));
    const L = S.chain[0][0], R = S.chain[S.chain.length - 1][1], out = [];
    hand.forEach(t => { const [a, b] = dmParse(t), sd = []; if (a === L || b === L) sd.push('L'); if (a === R || b === R) sd.push('R'); if (sd.length) out.push({ t, sides: sd }); });
    return out;
  }
  startRound() {
    const S = this.S; this.untimer();
    S.seats = S.seats.filter(s => { if (s.out && !s.bot) { this.bank[s.p] = s.sc; return false; } return true; }); this.syncBots();
    if (S.seats.length < 2) { S.ph = 'wait'; S.turn = -1; S.chain = []; this.hands = {}; this.autoStart(); this.commit(); return; }
    S.round++;
    const set = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) set.push(a + '-' + b);
    const r = new Uint32Array(set.length); crypto.getRandomValues(r); for (let i = set.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [set[i], set[j]] = [set[j], set[i]]; }
    this.hands = {}; S.seats.forEach(s => { this.hands[s.p] = set.splice(0, 7); s.cnt = 7; s.pass = 0; });
    this.yard = set; S.bone = set.length; S.chain = []; S.last = null; S.res = null; S.rev = null; S.passes = 0; S.ph = 'play'; S.turn = -1;
    let st = S.seats.findIndex(s => s.p === S.lastWinP);
    if (st < 0) { for (let d = 6; d >= 0 && st < 0; d--) st = S.seats.findIndex(s => this.hands[s.p].includes(d + '-' + d)); }
    if (st < 0) st = 0;
    this.commit(); this.later(() => this.setTurn(st), 1000);
  }
  setTurn(i) {
    const S = this.S; S.turn = i; const s = S.seats[i];
    if (this.cfg.turn && !s.bot) this.timer(this.cfg.turn * 1000); else this.untimer();
    this.commit();
    if (s.bot) this.later(() => this.botMove(i), 900 + Math.random() * 900);
    else if (s.out) this.later(() => this.autoMove(i), 300);
  }
  handle(p, a) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p);
    if (p === this.hostP && a.t === 'go' && S.ph === 'wait' && S.seats.filter(s => !s.out).length >= 2) return this.startRound();
    if (p === this.hostP && a.t === 'again' && S.ph === 'mend') return this.newMatch();
    if (i < 0 || S.ph !== 'play' || S.turn !== i) return;
    if (a.t === 'play' && a.v && typeof a.v === 'object') this.play(i, String(a.v.t), a.v.s === 'L' ? 'L' : 'R');
    else if (a.t === 'draw') this.draw(i);
    else if (a.t === 'pass') this.pass(i);
  }
  play(i, t, side) {
    const S = this.S, s = S.seats[i], hand = this.hands[s.p]; const k = hand.indexOf(t); if (k < 0) return false;
    const lg = this.legal([t]); if (!lg.length || !lg[0].sides.includes(side)) return false;
    hand.splice(k, 1); const [a, b] = dmParse(t);
    if (!S.chain.length) S.chain.push([a, b]);
    else if (side === 'R') { const R = S.chain[S.chain.length - 1][1]; S.chain.push(a === R ? [a, b] : [b, a]); }
    else { const L = S.chain[0][0]; S.chain.unshift(b === L ? [a, b] : [b, a]); }
    s.cnt = hand.length; S.last = { p: s.p, t, s: side, k: S.chain.length }; S.passes = 0; S.seats.forEach(x => x.pass = 0);
    if (!hand.length) { this.roundOver(i, false); return true; }
    this.nextTurn(i); return true;
  }
  draw(i) {
    const S = this.S, s = S.seats[i], hand = this.hands[s.p];
    if (this.cfg.mode !== 0 || this.legal(hand).length || !this.yard.length) return false;
    hand.push(this.yard.pop()); S.bone = this.yard.length; s.cnt = hand.length;
    if (this.cfg.turn && !s.bot) this.timer(this.cfg.turn * 1000);
    this.commit(); return true;
  }
  pass(i) {
    const S = this.S, s = S.seats[i], hand = this.hands[s.p];
    if (this.legal(hand).length || (this.cfg.mode === 0 && this.yard.length)) return false;
    s.pass = 1; S.passes++;
    if (S.passes >= S.seats.filter(x => !x.out).length) { this.roundOver(-1, true); return true; }
    this.nextTurn(i); return true;
  }
  nextTurn(i) {
    const S = this.S, n = S.seats.length; if (S.seats.filter(x => !x.out).length < 2) return this.abort();
    for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!S.seats[j].out) return this.setTurn(j); }
  }
  abort() { const S = this.S; S.ph = 'wait'; S.turn = -1; S.res = { txt: 'توقفت الجولة — لاعبون غير كافين' }; this.untimer(); this.autoStart(); this.commit(); }
  roundOver(i, blocked) {
    const S = this.S, tots = S.seats.map(s => dmPips(this.hands[s.p] || []));
    if (blocked) { const act = S.seats.map((s, k) => k).filter(k => !S.seats[k].out); const mn = Math.min(...act.map(k => tots[k])); const W = act.filter(k => tots[k] === mn); i = W.length === 1 ? W[0] : -1; }
    S.rev = S.seats.map(s => (this.hands[s.p] || []).join(','));
    let pts = 0; if (i >= 0) { pts = tots.reduce((m, v, k) => k === i ? m : m + v, 0); S.seats[i].sc += pts; S.lastWinP = S.seats[i].p; }
    S.seats.forEach(s => this.bank[s.p] = s.sc);
    const w = i >= 0 ? S.seats[i] : null;
    S.res = { w: w ? w.p : null, pts, txt: blocked ? (w ? `انسدّت اللعبة! ${w.n} الأقل نقاطاً +${pts}` : 'انسدّت اللعبة بالتعادل — لا نقاط') : `${w.n} أنهى أحجاره! +${pts}` };
    S.turn = -1;
    if (w && w.sc >= this.cfg.target) { S.ph = 'mend'; S.res.champ = w.p; S.res.txt += ` — ${w.n} فاز بالمباراة 🏆`; this.timer(20000); }
    else { S.ph = 'rend'; this.timer(8000); }
    this.commit();
  }
  newMatch() { const S = this.S; S.seats.forEach(s => { s.sc = 0; this.bank[s.p] = 0; }); S.match++; S.lastWinP = null; S.ph = 'rend'; this.startRound(); }
  autoMove(i) {
    const S = this.S; if (S.ph !== 'play' || S.turn !== i) return; const s = S.seats[i], hand = this.hands[s.p];
    const lg = this.legal(hand); if (lg.length) { this.play(i, lg[0].t, lg[0].sides[0]); return; }
    if (this.cfg.mode === 0 && this.yard.length) { this.draw(i); this.later(() => this.autoMove(i), 350); return; }
    this.pass(i);
  }
  botMove(i) {
    const S = this.S; if (S.ph !== 'play' || S.turn !== i) return; const s = S.seats[i], hand = this.hands[s.p];
    const lg = this.legal(hand);
    if (lg.length) { lg.sort((x, y) => { const [a, b] = dmParse(x.t), [c, d] = dmParse(y.t); return (c + d + (c === d ? 3 : 0)) - (a + b + (a === b ? 3 : 0)); }); const m = lg[0]; this.play(i, m.t, m.sides[Math.floor(Math.random() * m.sides.length)]); return; }
    if (this.cfg.mode === 0 && this.yard.length) { this.draw(i); this.later(() => this.botMove(i), 600); return; }
    this.pass(i);
  }
  tick() {
    const S = this.S, now = Date.now();
    if (S.ph === 'play' && S.turn >= 0 && S.end && now >= S.end) { this.untimer(); this.autoMove(S.turn); }
    else if (S.ph === 'wait' && S.end && now >= S.end) { this.untimer(); if (S.seats.filter(s => !s.out).length >= 2) this.startRound(); else this.commit(); }
    else if (S.ph === 'rend' && S.end && now >= S.end) this.startRound();
    else if (S.ph === 'mend' && S.end && now >= S.end) this.newMatch();
  }
}

/* ---------- domino view ---------- */
const DMV = { sel: null, lastKey: '', settled: '', handKey: '' };
function dmMyHand(priv, S) { return priv && priv.r === S.round && priv.h ? priv.h.split(',').filter(Boolean) : []; }
function dmLegalLocal(S, hand) {
  if (!S.chain.length) return hand.map(t => ({ t, sides: ['R'] }));
  const L = S.chain[0][0], R = S.chain[S.chain.length - 1][1], out = [];
  hand.forEach(t => { const [a, b] = dmParse(t), sd = []; if (a === L || b === L) sd.push('L'); if (a === R || b === R) sd.push('R'); if (sd.length) out.push({ t, sides: sd }); });
  return out;
}
function dmPlay(t, side) { DMV.sel = null; myAct({ t: 'play', v: { t, s: side } }); sfx('card'); }
GAMES.dm = {
  key: 'dm', title: 'دومينو', Engine: DMEngine, scores: true, hidden: true,
  soloIcon: '🤖', soloLabel: 'ضد الكمبيوتر', soloDesc: 'العب ضد لاعبين آليين', hostDesc: 'من 2 إلى 4 لاعبين برابط ترسله لأصدقائك',
  cfg: [
    { k: 'target', label: '🏁 نقاط الفوز بالمباراة', d: 100, lo: 10, hi: 1000, opts: [50, 100, 150, 200, 300] },
    { k: 'turn', label: '⏱️ وقت الدور لكل لاعب', d: 20, lo: 0, hi: 300, opts: [10, 15, 20, 30, 45, 60, 0], fmt: secs },
    { k: 'mode', label: '🎲 نوع اللعب', d: 0, lo: 0, hi: 1, opts: [0, 1], fmt: v => v ? 'بلوك (بدون سحب)' : 'سحب من الكومة' },
    { k: 'bots', label: '🤖 عدد اللاعبين الآليين', d: 1, lo: 0, hi: 3, opts: [0, 1, 2, 3], fmt: v => v ? v : 'بدون' },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>طقم دبل-ستة (28 حجراً)، لكل لاعب 7 أحجار.</li>
    <li>ضع حجراً يطابق أحد طرفي السلسلة. يبدأ الجولة الأولى صاحب أكبر دبل.</li>
    <li><b>سحب</b>: إن لم يكن لديك حجر مناسب تسحب من الكومة. <b>بلوك</b>: تمرّر دورك.</li>
    <li>من ينهي أحجاره أولاً يأخذ مجموع نقاط أحجار الخصوم. إن انسدّت اللعبة يفوز صاحب أقل مجموع.</li>
    <li>أول من يصل إلى نقاط الفوز يربح المباراة.</li></ul>`,
  reset() { $('#dmOpps').innerHTML = ''; $('#dmChain').innerHTML = ''; $('#dmHand').innerHTML = ''; DMV.sel = null; DMV.lastKey = ''; DMV.handKey = ''; },
  busy(S) { return S.ph === 'play' && !!mySeat(S); },
  hud(S) { const s = mySeat(S); return s ? fmt(s.sc) : null; },
  localKey() { return DMV.sel || ''; },
  onState(prev, S) {
    if (prev && S.turn >= 0 && S.seats[S.turn] && S.seats[S.turn].p === APP.myPeer && prev.turn !== S.turn) sfx('turn');
    if (prev && S.round !== prev.round) DMV.sel = null;
    if (prev && S.chain.length !== prev.chain.length) sfx('card');
    if ((S.ph === 'rend' || S.ph === 'mend') && S.res) { const key = APP.code + ':' + S.round + S.ph; if (DMV.settled !== key) { DMV.settled = key; setTimeout(() => { if (S.res.w) showNet(S.res.w, S.res.pts); if (S.res.w === APP.myPeer) { banner(S.ph === 'mend' ? 'بطل المباراة! 🏆' : 'فزت بالجولة!', 'gold'); sfx(S.ph === 'mend' ? 'bj' : 'win'); } else if (S.res.w) sfx('lose'); }, 300); } }
  },
  render(S, priv) {
    if (!S) { timerMsg($('#dmMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    const myIdx = S.seats.findIndex(s => s.p === APP.myPeer), n = S.seats.length, keep = new Set();
    // opponents
    const opps = $('#dmOpps'); const order = []; for (let k = 1; k <= n; k++) order.push((Math.max(0, myIdx) + k) % n); if (myIdx < 0) order.unshift(0), order.pop();
    S.seats.forEach((s, i) => {
      keep.add(s.p); const isMe = s.p === APP.myPeer; let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'dm-opp', '<div class="emo"></div><div class="net"></div><div class="row1"><span class="av"></span><div><div class="nm"></div><div class="sc"></div></div><span class="pass">مرّر</span></div><div class="backs"></div>'); SEATS.set(s.p, e); }
      const host = isMe ? $('#dmMeBar') : opps; if (e.parentNode !== host) host.appendChild(e);
      if (!isMe) e.style.order = order.indexOf(i);
      e.classList.toggle('me', isMe); e.classList.toggle('turn', S.turn === i); e.classList.toggle('out', !!s.out);
      e.querySelector('.av').textContent = s.a; e.querySelector('.nm').textContent = isMe ? s.n + ' (أنت)' : s.n;
      e.querySelector('.sc').textContent = `⭐ ${fmt(s.sc)} / ${fmt(S.cfg.target)}` + (s.kicked ? ' — طُرد' : s.out ? ' — غادر' : '');
      e.querySelector('.pass').style.opacity = s.pass && S.ph === 'play' ? 1 : 0;
      const bk = e.querySelector('.backs'); const rev = S.rev && S.rev[i] !== undefined && (S.ph === 'rend' || S.ph === 'mend') ? S.rev[i].split(',').filter(Boolean) : null;
      const k2 = isMe ? '' : (rev ? 'r' + S.rev[i] : 'c' + (S.ph === 'play' ? s.cnt : 0));
      if (bk.dataset.k !== k2) { bk.dataset.k = k2; bk.innerHTML = ''; if (!isMe) { if (rev) rev.forEach(t => { const [a, b] = dmParse(t); bk.appendChild(dmTile(a, b, 'v', 'mini')); }); else for (let j = 0; j < (S.ph === 'play' ? s.cnt : 0); j++) bk.appendChild(dmTile(null, null, 'v', 'mini')); } }
      e.querySelector('.av').classList.toggle('ring', S.turn === i && !!S.end);
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    // chain
    const ch = $('#dmChain'), key = S.round + ':' + S.chain.map(t => t.join('')).join('.');
    if (ch.dataset.k !== key) {
      ch.dataset.k = key; ch.innerHTML = '';
      const len = S.chain.length, small = innerWidth < 640, t = small ? (len < 6 ? 28 : len < 12 ? 22 : 18) : (len < 12 ? 36 : len < 20 ? 30 : 26);
      ch.style.setProperty('--t', t + 'px');
      // snake layout: rows alternate direction so the chain stays connected
      const W = Math.max(200, ch.parentNode.clientWidth * 0.9 - 20), gap = 3, rows = [[]]; let w = 0;
      S.chain.forEach((tl, k) => { const tw = (tl[0] === tl[1] ? t : 2 * t) + gap; if (w + tw > W && rows[rows.length - 1].length) { rows.push([]); w = 0; } rows[rows.length - 1].push(k); w += tw; });
      const rw = Math.max(...rows.map(r => r.reduce((m, k) => m + (S.chain[k][0] === S.chain[k][1] ? t : 2 * t) + gap, 0)));
      rows.forEach((r, ri) => { const row = el('div', 'dm-row' + (ri % 2 ? ' rev' : '')); row.style.width = rw + 'px';
        r.forEach(k => { const [a, b] = S.chain[k], d = a === b, isNew = S.last && ((S.last.s === 'L' && k === 0) || (S.last.s === 'R' && k === len - 1)) && DMV.lastKey !== key;
          const tile = ri % 2 ? dmTile(b, a, d ? 'v' : 'h', isNew ? 'new' : '') : dmTile(a, b, d ? 'v' : 'h', isNew ? 'new' : ''); if (k === 0) tile.classList.add('endL'); if (k === len - 1) tile.classList.add('endR'); row.appendChild(tile); });
        ch.appendChild(row); });
      if (!len) ch.innerHTML = '<div class="dm-empty">ضع أول حجر هنا</div>';
      DMV.lastKey = key;
    }
    const hand = dmMyHand(priv, S), mine = myIdx >= 0 && S.ph === 'play' && S.turn === myIdx, lg = mine ? dmLegalLocal(S, hand) : [];
    if (DMV.sel && !hand.includes(DMV.sel)) DMV.sel = null;
    ch.classList.toggle('pickL', !!DMV.sel); ch.classList.toggle('pickR', !!DMV.sel);
    // info
    $('#dmInfo').innerHTML = `<span>🏁 الهدف ${fmt(S.cfg.target)}</span>${S.cfg.mode === 0 ? `<span>🁫 الكومة: <b>${S.bone}</b></span>` : '<span>بلوك</span>'}`;
    // my hand
    const hb = $('#dmHand'), hk = hand.join(',') + '|' + lg.map(x => x.t).join(',') + '|' + DMV.sel + '|' + mine;
    if (DMV.handKey !== hk) {
      const prevSet = new Set((DMV.handKey.split('|')[0] || '').split(',')); DMV.handKey = hk; hb.innerHTML = '';
      hand.forEach(t => { const [a, b] = dmParse(t); const L = lg.find(x => x.t === t); const tile = dmTile(a, b, 'v', (mine ? (L ? 'ok' : 'no') : '') + (DMV.sel === t ? ' sel' : '') + (!prevSet.has(t) ? ' new' : ''));
        tile.onclick = () => { if (!L || APP.pendingV !== null) return; if (L.sides.length === 1 || !S.chain.length || S.chain[0][0] === S.chain[S.chain.length - 1][1]) return dmPlay(t, L.sides[0]); DMV.sel = DMV.sel === t ? null : t; sfx('pop'); renderGame(); };
        hb.appendChild(tile); });
      if (!hand.length && myIdx >= 0 && S.ph === 'play') hb.innerHTML = '<div class="hint">⏳ جارٍ استلام أحجارك...</div>';
    }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(); let m1 = '', m2 = '', bar = false;
    if (S.ph === 'wait') { const c = S.seats.filter(s => !s.out).length; if (c < 2) { m1 = 'بانتظار اللاعبين'; m2 = 'يلزم لاعبان على الأقل'; } else { m1 = 'الجولة تبدأ قريباً'; m2 = APP.localEnd ? `خلال ${Math.ceil(tl / 1000)} ث` : ''; bar = !!APP.localEnd; } if (S.res && S.res.txt) m2 = S.res.txt; }
    else if (S.ph === 'play') { if (S.turn >= 0) { const s = S.seats[S.turn]; m1 = s.p === APP.myPeer ? '🎯 دورك!' : 'دور ' + s.n; m2 = S.end ? `${Math.ceil(tl / 1000)} ث` : ''; bar = !!S.end; } else m1 = 'جارٍ توزيع الأحجار...'; }
    else if (S.ph === 'rend') { m1 = S.res ? S.res.txt : ''; m2 = `جولة جديدة خلال ${Math.ceil(tl / 1000)} ث`; }
    else if (S.ph === 'mend') { m1 = S.res ? S.res.txt : ''; m2 = `مباراة جديدة خلال ${Math.ceil(tl / 1000)} ث`; }
    timerMsg($('#dmMsg'), m1, m2, bar);
    if (S.turn >= 0 && S.end) { const s = S.seats[S.turn], e = s && SEATS.get(s.p); if (e) e.querySelector('.av').style.setProperty('--p', timePct().toFixed(3)); }
  },
  controls(box, S, priv, pending) {
    const s = mySeat(S), row = el('div', 'crow'); box.appendChild(row); const B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (!s) { row.appendChild(el('div', 'status', '👀 أنت تشاهد — ستنضم في الجولة القادمة')); return; }
    const i = S.seats.indexOf(s);
    if (S.ph === 'play' && S.turn === i) {
      const hand = dmMyHand(priv, S), lg = dmLegalLocal(S, hand);
      if (DMV.sel) { const L = S.chain[0][0], R = S.chain[S.chain.length - 1][1]; B(`◀ على طرف ${L}`, 'blue', () => dmPlay(DMV.sel, 'L')); B('إلغاء', 'ghost sm', () => { DMV.sel = null; renderGame(); }); B(`على طرف ${R} ▶`, 'blue', () => dmPlay(DMV.sel, 'R')); return; }
      if (!hand.length) { row.appendChild(el('div', 'status', '⏳ جارٍ استلام أحجارك...')); return; }
      if (lg.length) { row.appendChild(el('div', 'status', 'اضغط على حجر مضيء لتلعبه')); return; }
      if (S.cfg.mode === 0 && S.bone > 0) B('🁫 اسحب من الكومة', 'gold', () => { myAct({ t: 'draw' }); sfx('card'); });
      else B('⏭️ مرّر الدور', 'red', () => myAct({ t: 'pass' }));
      return;
    }
    let t = '';
    if (S.ph === 'play') t = S.turn >= 0 ? 'انتظر دورك...' : 'جارٍ التوزيع...';
    else if (S.ph === 'wait') t = 'بانتظار بدء الجولة...';
    else if (S.ph === 'rend') t = S.res && S.res.w === APP.myPeer ? `🎉 فزت بالجولة +${S.res.pts}` : 'انتهت الجولة';
    else if (S.ph === 'mend') t = S.res && S.res.champ === APP.myPeer ? '🏆 أنت بطل المباراة!' : 'انتهت المباراة';
    row.appendChild(el('div', 'status', t));
    if (APP.eng && S.ph === 'wait' && S.seats.filter(x => !x.out).length >= 2) B('ابدأ الجولة ▶', 'green sm', () => myAct({ t: 'go' }));
    if (APP.eng && S.ph === 'mend') B('مباراة جديدة ▶', 'green sm', () => myAct({ t: 'again' }));
  }
};
