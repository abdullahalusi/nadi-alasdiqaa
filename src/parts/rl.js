/* =====================================================================
   ROULETTE (European, single zero)
   ===================================================================== */
const RL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RL_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rlColor = n => n === 0 ? 'green' : RL_RED.has(n) ? 'red' : 'black';
const RL_OUT = ['red', 'black', 'odd', 'even', 'low', 'high', 'd1', 'd2', 'd3', 'c1', 'c2', 'c3'];
const rlValid = k => RL_OUT.includes(k) || /^n([0-9]|[12][0-9]|3[0-6])$/.test(k);
function rlMult(k, n) {
  if (k[0] === 'n') return +k.slice(1) === n ? 36 : 0;
  if (n === 0) return 0;
  switch (k) {
    case 'red': return RL_RED.has(n) ? 2 : 0; case 'black': return !RL_RED.has(n) ? 2 : 0;
    case 'odd': return n % 2 ? 2 : 0; case 'even': return n % 2 ? 0 : 2;
    case 'low': return n <= 18 ? 2 : 0; case 'high': return n >= 19 ? 2 : 0;
    case 'd1': return n <= 12 ? 3 : 0; case 'd2': return n >= 13 && n <= 24 ? 3 : 0; case 'd3': return n >= 25 ? 3 : 0;
    case 'c1': return n % 3 === 1 ? 3 : 0; case 'c2': return n % 3 === 2 ? 3 : 0; case 'c3': return n % 3 === 0 ? 3 : 0;
  } return 0;
}
const RL_NAME = { red: 'أحمر', black: 'أسود', odd: 'فردي', even: 'زوجي', low: '1-18', high: '19-36', d1: '1-12', d2: '13-24', d3: '25-36', c1: 'عمود 1', c2: 'عمود 2', c3: 'عمود 3' };

class RLEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) { super('rl', pub, hostP, round, cfg); Object.assign(this.S, { ph: 'bet', hist: [], res: null, spin: null }); }
  newSeat(x) { const ch = this.bank[x.p] !== undefined ? this.bank[x.p] : this.cfg.start; return { p: x.p, n: x.n, a: x.a, ch, bets: {}, b: 0, ok: 0, net: 0 }; }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph === 'bet') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => { if (s.out) this.bank[s.p] = s.ch; return !s.out; }); if (n0 !== S.seats.length) ch = true;
      for (const x of list) { if (S.seats.length >= 8) break; if (!S.seats.find(s => s.p === x.p)) { S.seats.push(this.newSeat(x)); ch = true; } }
      if (this.checkAll()) ch = true;
    }
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  checkAll() { const S = this.S, act = S.seats.filter(s => !s.out && s.ch >= this.cfg.min); if (act.length && act.every(s => s.ok) && (!S.end || S.end - Date.now() > 1500)) { this.timer(1500); return true; } return false; }
  handle(p, a) {
    const S = this.S, s = S.seats.find(x => x.p === p); if (!s || s.out || S.ph !== 'bet') return;
    if (a.t === 'bets') {
      const v = a.v && typeof a.v === 'object' ? a.v : {}; const bets = {}; let tot = 0, k = 0;
      for (const key in v) { if (!rlValid(key)) continue; const amt = Math.floor(+v[key]); if (!(amt > 0)) continue; if (++k > 16) break; bets[key] = amt; tot += amt; }
      if (tot > s.ch || (tot > 0 && tot < this.cfg.min) || (this.cfg.max && tot > this.cfg.max)) return;
      s.bets = bets; s.b = tot; s.ok = tot > 0 ? 1 : 0;
      if (tot > 0 && !S.end) this.timer(this.cfg.betTime * 1000);
      this.checkAll(); if (!S.seats.some(x => x.ok)) this.untimer();
      this.commit();
    } else if (a.t === 'go' && p === this.hostP) { if (S.seats.some(x => x.ok)) this.spin(); }
  }
  spin() {
    const S = this.S; S.ph = 'spin'; this.untimer();
    S.seats.forEach(s => { if (!s.ok) { s.bets = {}; s.b = 0; } });
    const r = new Uint32Array(1); crypto.getRandomValues(r); this.n = r[0] % 37;
    S.spin = { n: this.n, id: S.round }; S.res = null; this.commit();
    this.later(() => this.settle(), 7300);
  }
  settle() {
    const S = this.S, n = this.n;
    S.seats.forEach(s => { let win = 0; for (const k in s.bets) win += s.bets[k] * rlMult(k, n); s.net = win - s.b; s.ch = Math.max(0, s.ch + s.net); this.bank[s.p] = s.ch; });
    S.res = n; S.hist.unshift(n); S.hist = S.hist.slice(0, 14); S.ph = 'done'; this.timer(6000); this.commit();
  }
  newRound() {
    const S = this.S; S.round++; S.ph = 'bet'; this.untimer(); S.spin = null; S.res = null;
    S.seats = S.seats.filter(s => { if (s.out) this.bank[s.p] = s.ch; return !s.out; }); S.seats.forEach(s => { s.bets = {}; s.b = 0; s.ok = 0; s.net = 0; });
    for (const p in this.players) { if (S.seats.length >= 8) break; if (!S.seats.find(s => s.p === p)) S.seats.push(this.newSeat(this.players[p])); }
    this.updWatch(Object.values(this.players)); this.commit();
  }
  onKick(p, i) { if (i < 0) return false; const S = this.S; if (S.ph === 'bet') S.seats.splice(i, 1); else { S.seats[i].out = 1; S.seats[i].kicked = 1; } return false; }
  onChips(s) { if (this.S.ph === 'bet' && s.b > s.ch) { s.bets = {}; s.b = 0; s.ok = 0; } }
  tick() {
    const S = this.S, now = Date.now();
    if (S.ph === 'bet' && S.end && now >= S.end) { if (S.seats.some(s => s.ok)) this.spin(); else { this.untimer(); this.commit(); } }
    else if (S.ph === 'done' && S.end && now >= S.end) this.newRound();
  }
}

/* ---------- roulette view ---------- */
const RLV = { draft: {}, editing: false, undo: [], chip: 25, wAng: 0, bAng: 0, spunId: null, built: false, settled: '' };
function rlBuild() {
  if (RLV.built) return; RLV.built = true;
  const a = 360 / 37, P = (r, deg) => { const t = deg * Math.PI / 180; return [150 + r * Math.sin(t), 150 - r * Math.cos(t)]; };
  let sec = '', txt = '';
  RL_ORDER.forEach((n, i) => {
    const a0 = i * a - a / 2, a1 = i * a + a / 2, col = { green: '#1e9e4a', red: '#c62828', black: '#161616' }[rlColor(n)];
    const [x0, y0] = P(140, a0), [x1, y1] = P(140, a1), [x2, y2] = P(96, a1), [x3, y3] = P(96, a0);
    sec += `<path d="M${x0},${y0} A140,140 0 0 1 ${x1},${y1} L${x2},${y2} A96,96 0 0 0 ${x3},${y3} Z" fill="${col}" stroke="#d9b45a" stroke-width=".7"/>`;
    const [tx, ty] = P(128, i * a); txt += `<text x="${tx}" y="${ty}" transform="rotate(${i * a} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="800" fill="#fff" font-family="Cairo">${n}</text>`;
  });
  let spokes = ''; for (let k = 0; k < 8; k++) { const [x, y] = P(78, k * 45); spokes += `<line x1="150" y1="150" x2="${x}" y2="${y}" stroke="#e8c46a" stroke-width="3" stroke-linecap="round"/>`; }
  $('#rlWheel').innerHTML = `<svg viewBox="0 0 300 300">
    <defs><radialGradient id="rlCone" cx="50%" cy="45%"><stop offset="0" stop-color="#f7d98a"/><stop offset=".45" stop-color="#9a6a2a"/><stop offset="1" stop-color="#4a2a0c"/></radialGradient>
    <radialGradient id="rlRim" cx="50%" cy="40%"><stop offset=".8" stop-color="#6b3d1c"/><stop offset="1" stop-color="#2a1606"/></radialGradient></defs>
    <circle cx="150" cy="150" r="149" fill="url(#rlRim)"/><circle cx="150" cy="150" r="142" fill="#3a2210" stroke="#d9b45a" stroke-width="2"/>
    <g id="rlWG" class="wg">${sec}${txt}<circle cx="150" cy="150" r="96" fill="url(#rlCone)" stroke="#d9b45a" stroke-width="2"/>${spokes}<circle cx="150" cy="150" r="18" fill="#f5c451" stroke="#8a5a1c" stroke-width="3"/><circle cx="150" cy="150" r="6" fill="#fff6d0"/></g>
    <g id="rlBG" class="wg"><circle cx="150" cy="42" r="6.5" fill="#fff" stroke="#bbb" stroke-width="1"/><circle cx="148" cy="40" r="2" fill="#fff"/></g>
    <path d="M150 6 L141 -6 L159 -6 Z" transform="translate(0,10)" fill="#f5c451" stroke="#5a3412" stroke-width="1.5"/></svg>`;
  // board
  const B = $('#rlBoard'); let h = `<div class="rc green" data-k="n0" style="grid-row:1/4;grid-column:1">0</div>`;
  for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) { const n = c * 3 + (3 - r); h += `<div class="rc ${rlColor(n)}" data-k="n${n}" style="grid-row:${r + 1};grid-column:${c + 2}">${n}</div>`; }
  ['c3', 'c2', 'c1'].forEach((k, r) => h += `<div class="rc out" data-k="${k}" style="grid-row:${r + 1};grid-column:14">2:1</div>`);
  ['d1', 'd2', 'd3'].forEach((k, i) => h += `<div class="rc out" data-k="${k}" style="grid-row:4;grid-column:${2 + i * 4}/span 4">${RL_NAME[k]}</div>`);
  [['low', '1-18'], ['even', 'زوجي'], ['red', '<i class="dia r"></i>'], ['black', '<i class="dia b"></i>'], ['odd', 'فردي'], ['high', '19-36']].forEach(([k, t], i) => h += `<div class="rc out" data-k="${k}" style="grid-row:5;grid-column:${2 + i * 2}/span 2">${t}</div>`);
  B.innerHTML = h;
  B.querySelectorAll('.rc').forEach(c => { c.insertAdjacentHTML('beforeend', '<span class="oth"></span><span class="mc"></span>'); c.onclick = () => rlClick(c.dataset.k, c); });
}
function rlMyBets(S) { const s = mySeat(S); if (!s) return {}; return (S.ph === 'bet' && (RLV.editing || !s.ok)) ? RLV.draft : s.bets; }
const rlSum = o => Object.values(o).reduce((m, v) => m + v, 0);
function rlClick(k, cell) {
  const S = APP.S, s = mySeat(S); if (!S || !s || S.ph !== 'bet' || APP.pendingV !== null) return;
  if (s.ok && !RLV.editing) { RLV.draft = { ...s.bets }; RLV.editing = true; RLV.undo = []; }
  const tot = rlSum(RLV.draft), v = RLV.chip;
  if (tot + v > s.ch) { toast('لا تملك نقوداً كافية'); return; }
  if (S.cfg.max && tot + v > S.cfg.max) { toast('الحد الأعلى للرهان ' + fmt(S.cfg.max)); return; }
  if (!RLV.draft[k] && Object.keys(RLV.draft).length >= 16) { toast('حد أقصى 16 خانة'); return; }
  RLV.draft[k] = (RLV.draft[k] || 0) + v; RLV.undo.push([k, v]); sfx('chip');
  cell.classList.remove('tap'); void cell.offsetWidth; cell.classList.add('tap');
  renderGame();
}
function rlSpinAnim(n, instant) {
  const i = RL_ORDER.indexOf(n), a = 360 / 37, wg = $('#rlWG'), bg = $('#rlBG'); if (!wg) return;
  const norm = x => ((x % 360) + 360) % 360;
  let t = RLV.wAng - norm(RLV.wAng) + (instant ? 0 : 360 * 5) + norm(-i * a); if (!instant && t < RLV.wAng + 360 * 4) t += 360;
  let tb = RLV.bAng - norm(RLV.bAng) - (instant ? 0 : 360 * 7);
  [wg, bg].forEach(g => g.style.transition = instant ? 'none' : '');
  wg.style.transform = `rotate(${t}deg)`; bg.style.transform = `rotate(${tb}deg)`; RLV.wAng = t; RLV.bAng = tb;
  if (!instant) { sfx('chip'); let k = 0; const iv = setInterval(() => { if (++k > 22) return clearInterval(iv); if (SND.on && SND.ctx) tone(1800 + Math.random() * 600, 0, .03, 'triangle', .04 * (1 - k / 24)); }, 90 + k * 12); }
}

GAMES.rl = {
  key: 'rl', title: 'روليت', Engine: RLEngine, chips: true,
  soloIcon: '🎡', soloLabel: 'لعب فردي', soloDesc: 'راهن وأدر العجلة وحدك', hostDesc: 'حتى 8 لاعبين يراهنون على نفس العجلة',
  cfg: [
    { k: 'start', label: '💰 نقود البداية لكل لاعب', d: 1000, lo: 5, hi: 1e8, step: 5 },
    { k: 'min', label: '🪙 أقل رهان في الجولة', d: 5, lo: 1, hi: 1e6, opts: [1, 5, 10, 25, 50, 100, 500] },
    { k: 'max', label: '🔝 أعلى رهان في الجولة', d: 0, lo: 0, hi: 1e8, opts: [0, 100, 500, 1000, 5000, 10000, 100000], fmt: v => v ? fmt(v) : 'بدون حد' },
    { k: 'betTime', label: '⏳ وقت المراهنة', d: 20, lo: 5, hi: 120, opts: [10, 15, 20, 30, 45, 60, 90], fmt: secs },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>عجلة أوروبية بصفر واحد (0 إلى 36).</li>
    <li>رقم واحد يدفع <b>35 مقابل 1</b>.</li>
    <li>الدزينة (1-12، 13-24، 25-36) والعمود (2:1) تدفع <b>2 مقابل 1</b>.</li>
    <li>أحمر/أسود، زوجي/فردي، 1-18/19-36 تدفع <b>1 مقابل 1</b>. الصفر يخسّر هذه الرهانات.</li>
    <li>اختر قيمة الرقاقة ثم اضغط على الخانات، ثم «تأكيد الرهان».</li></ul>`,
  reset() { RLV.draft = {}; RLV.editing = false; RLV.undo = []; RLV.spunId = null; $('#rlPlayers').innerHTML = ''; },
  busy(S) { const s = mySeat(S); return s && s.b && S.ph !== 'done'; },
  hud(S) { const s = mySeat(S); if (!s) return null; const pend = S.ph === 'done' ? 0 : rlSum(rlMyBets(S)); return fmt(s.ch - pend); },
  chipsEdited(prev, S, a, b) { return S.ph === 'bet' && prev.ph === 'bet' && a.ch !== b.ch; },
  localKey() { return JSON.stringify(RLV.draft) + RLV.editing + RLV.chip; },
  onState(prev, S) {
    if (prev && S.round !== prev.round) { RLV.draft = {}; RLV.editing = false; RLV.undo = []; }
    const s = mySeat(S); if (s && S.ph === 'bet' && s.ok && !RLV.editing) RLV.draft = {};
    if (S.ph === 'done') {
      const key = APP.code + ':' + S.round; if (RLV.settled !== key) { RLV.settled = key;
        setTimeout(() => { S.seats.forEach(x => { if (x.b) showNet(x.p, x.net); }); if (s && s.b) { if (s.net > 0) { banner('فزت! +' + fmt(s.net), 'gold'); sfx('win'); coinBurst(s.p, $('#rlWheel')); } else if (s.net < 0) sfx('lose'); } }, 200); }
    }
  },
  render(S) {
    rlBuild();
    if (!S) { timerMsg($('#rlMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    // wheel
    if (S.spin && RLV.spunId !== APP.code + ':' + S.spin.id) { RLV.spunId = APP.code + ':' + S.spin.id; rlSpinAnim(S.spin.n, S.ph === 'done'); }
    // history
    $('#rlHist').innerHTML = (S.hist || []).map((n, i) => `<span class="rh ${rlColor(n)}${i === 0 && S.ph === 'done' ? ' last' : ''}">${n}</span>`).join('') || '<span class="hint">لا توجد نتائج بعد</span>';
    // board chips
    const mine = rlMyBets(S), others = {};
    S.seats.forEach(s => { if (s.p === APP.myPeer) return; for (const k in s.bets) (others[k] = others[k] || []).push(s.a); });
    const win = S.ph === 'done' && S.res !== null ? S.res : null;
    $('#rlBoard').querySelectorAll('.rc').forEach(c => {
      const k = c.dataset.k, mc = c.querySelector('.mc'), oth = c.querySelector('.oth'), v = mine[k] || 0;
      if (mc.dataset.v !== String(v)) { mc.dataset.v = v; mc.innerHTML = v ? `<span class="chip s c${chipBreak(v)[0]}"></span><b>${v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'K' : v}</b>` : ''; }
      const o = (others[k] || []).slice(0, 3).join(''); if (oth.textContent !== o) oth.textContent = o;
      c.classList.toggle('win', win !== null && rlMult(k, win) > 0);
      c.classList.toggle('dis', S.ph !== 'bet');
    });
    // players
    const pl = $('#rlPlayers'), keep = new Set();
    S.seats.forEach(s => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'rlp', '<div class="emo"></div><div class="net"></div><span class="av"></span><span class="nm"></span><span class="ch"></span><span class="bt"></span>'); pl.appendChild(e); SEATS.set(s.p, e); }
      e.classList.toggle('me', s.p === APP.myPeer); e.classList.toggle('out', !!s.out);
      e.querySelector('.av').textContent = s.a; e.querySelector('.nm').textContent = s.p === APP.myPeer ? s.n + ' (أنت)' : s.n;
      e.querySelector('.ch').textContent = '💰 ' + fmt(s.ch);
      e.querySelector('.bt').textContent = s.kicked ? 'طُرد' : s.out ? 'غادر' : S.ph === 'done' && s.b ? (s.net >= 0 ? '+' : '') + fmt(s.net) : s.ok ? '✓ ' + fmt(s.b) : (S.ph === 'bet' ? '...' : '');
      e.querySelector('.bt').className = 'bt' + (S.ph === 'done' && s.b ? (s.net > 0 ? ' pos' : s.net < 0 ? ' neg' : '') : '');
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(); let m1 = '', m2 = '', bar = false;
    if (S.ph === 'bet') { m1 = 'ضعوا رهاناتكم'; if (APP.localEnd) { m2 = `تدور العجلة خلال ${Math.ceil(tl / 1000)} ث`; bar = true; } else m2 = 'اختر رقاقة واضغط على الخانات'; }
    else if (S.ph === 'spin') { m1 = 'العجلة تدور... 🎡'; m2 = 'لا مزيد من الرهانات'; }
    else if (S.ph === 'done') { const n = S.res; m1 = `النتيجة: ${n} ${n === 0 ? '🟢' : rlColor(n) === 'red' ? '🔴' : '⚫'}`; m2 = `جولة جديدة خلال ${Math.ceil(tl / 1000)} ث`; }
    timerMsg($('#rlMsg'), m1, m2, bar);
  },
  controls(box, S, priv, pending) {
    const s = mySeat(S), row = el('div', 'crow'), B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (!s) { statusRow(box, '👀 أنت تشاهد — ستنضم في الجولة القادمة'); return; }
    if (S.ph !== 'bet') { statusRow(box, S.ph === 'spin' ? (s.b ? `رهانك ${fmt(s.b)} — بالتوفيق! 🤞` : 'لم تراهن في هذه الجولة') : (s.b ? (s.net > 0 ? `🎉 ربحت ${fmt(s.net)}` : s.net < 0 ? `خسرت ${fmt(-s.net)}` : 'استرجعت رهانك') : 'انتهت الجولة')); return; }
    if (s.ch < S.cfg.min && !s.ok) { const st = statusRow(box, APP.eng ? 'نفدت نقودك — عدّلها من الإعدادات ⚙️' : 'نفدت نقودك 😅 اطلب من المضيف أن يعطيك نقوداً'); if (APP.eng) { const b = el('button', 'btn gold sm', '⚙️ الإعدادات'); b.onclick = openSettings; st.appendChild(b); } return; }
    const editing = RLV.editing || !s.ok;
    if (editing) {
      chipPicker(box, RLV.chip, Infinity, v => { RLV.chip = v; sfx('pop'); ctrlKey = ''; renderControls(); });
      box.appendChild(row);
      const tot = rlSum(RLV.draft);
      row.appendChild(el('div', 'betinfo', `الرهان: <b>${fmt(tot)}</b>`));
      B('↶ تراجع', 'ghost sm', () => { const u = RLV.undo.pop(); if (!u) return; RLV.draft[u[0]] -= u[1]; if (RLV.draft[u[0]] <= 0) delete RLV.draft[u[0]]; renderGame(); }, !RLV.undo.length);
      B('مسح', 'ghost sm', () => { RLV.draft = {}; RLV.undo = []; renderGame(); }, !tot);
      B('×2 ضاعف', 'ghost sm', () => { const t2 = tot * 2; if (t2 > s.ch || (S.cfg.max && t2 > S.cfg.max)) { toast('لا يمكن المضاعفة'); return; } for (const k in RLV.draft) RLV.draft[k] *= 2; RLV.undo = []; sfx('chip'); renderGame(); }, !tot);
      B('تأكيد الرهان ✔', 'gold', () => { if (tot < S.cfg.min) { toast('أقل رهان ' + fmt(S.cfg.min)); return; } myAct({ t: 'bets', v: { ...RLV.draft } }); RLV.editing = false; RLV.undo = []; }, tot < S.cfg.min && !(s.ok && tot === 0));
      if (s.ok && RLV.editing) B('إلغاء التعديل', 'ghost sm', () => { RLV.editing = false; RLV.draft = {}; renderGame(); });
    } else {
      box.appendChild(row);
      row.appendChild(el('div', 'status', `✔ رهانك <b style="color:var(--gold)">${fmt(s.b)}</b> — بانتظار الآخرين`));
      B('تعديل', 'ghost sm', () => { RLV.draft = { ...s.bets }; RLV.editing = true; RLV.undo = []; renderGame(); });
      if (APP.eng && APP.mode === 'multi') B('أدر العجلة الآن 🎡', 'green sm', () => myAct({ t: 'go' }));
    }
  }
};
