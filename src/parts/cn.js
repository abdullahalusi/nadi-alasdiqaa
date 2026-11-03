/* =====================================================================
   CODENAMES (كود نيمز)
   ===================================================================== */
const CN_TEAM = { r: 'الأحمر', b: 'الأزرق' };
const CN_DOT = { r: '🔴', b: '🔵' };
const cnClue = s => String(s || '').replace(/[\u0000-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁯﻿]/g, '').trim().split(/\s+/).slice(0, 2).join(' ').slice(0, 20);

class CNEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg, local) {
    super('cn', pub, hostP, round, cfg); this.local = !!local; this.key = [];
    Object.assign(this.S, { ph: 'setup', words: [], rev: [], turn: 'r', step: 'clue', clue: null, left: 0, rem: { r: 0, b: 0 }, wins: { r: 0, b: 0 }, log: [], win: null, why: '', key: null, first: 'r', local: this.local ? 1 : 0 });
    if (this.local) this.later(() => this.start(), 50);
  }
  newSeat(x) { return { p: x.p, n: x.n, a: x.a, team: null, role: 'op' }; }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph !== 'play') { const n0 = S.seats.length; S.seats = S.seats.filter(s => !s.out); if (n0 !== S.seats.length) ch = true; }
    for (const x of list) { if (S.seats.length >= 16) break; if (!S.seats.find(s => s.p === x.p)) { const s = this.newSeat(x); if (S.ph === 'play' || !this.local) { const nr = S.seats.filter(q => q.team === 'r').length, nb = S.seats.filter(q => q.team === 'b').length; s.team = nr <= nb ? 'r' : 'b'; } S.seats.push(s); ch = true; } }
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  onKick(p, i) { if (i < 0) return false; const S = this.S; if (S.ph === 'play') { S.seats[i].out = 1; S.seats[i].kicked = 1; } else S.seats.splice(i, 1); return false; }
  priv(p) { const s = this.S.seats.find(x => x.p === p); if (this.S.ph !== 'play') return null; if (this.local || (s && s.role === 'spy')) return { r: this.S.round, k: this.key.join('') }; return null; }
  ready() { const S = this.S; if (this.local) return { ok: true }; const t = k => S.seats.filter(s => !s.out && s.team === k); const miss = [];
    for (const k of ['r', 'b']) { if (!t(k).some(s => s.role === 'spy')) miss.push('قائد للفريق ' + CN_TEAM[k]); if (!t(k).some(s => s.role === 'op')) miss.push('عميل للفريق ' + CN_TEAM[k]); }
    return { ok: !miss.length, miss }; }
  log(t) { const L = this.S.log; L.push(t); if (L.length > 8) L.shift(); }
  start() {
    const S = this.S; if (!this.ready().ok) return;
    const pool = this.cfg.cat ? CN_WORDS[this.cfg.cat - 1][1] : CN_ALL; const w = pkShuffle(pool.slice()).slice(0, 25);
    const first = Math.random() < .5 ? 'r' : 'b', second = first === 'r' ? 'b' : 'r', nx = this.cfg.assassins;
    const key = []; for (let i = 0; i < 9; i++) key.push(first); for (let i = 0; i < 8; i++) key.push(second); for (let i = 0; i < nx; i++) key.push('x'); while (key.length < 25) key.push('n');
    this.key = pkShuffle(key);
    S.round++; S.words = w; S.rev = w.map(() => ''); S.turn = first; S.first = first; S.step = 'clue'; S.clue = null; S.left = 0; S.rem = { [first]: 9, [second]: 8 }; S.log = []; S.win = null; S.why = ''; S.key = null; S.ph = 'play';
    this.log(`بدأت اللعبة — يبدأ الفريق ${CN_TEAM[first]} ${CN_DOT[first]}`);
    this.turnTimer(); this.commit();
  }
  turnTimer() { if (this.cfg.turn) this.timer(this.cfg.turn * 1000); else this.untimer(); }
  switchTurn(why) { const S = this.S; S.turn = S.turn === 'r' ? 'b' : 'r'; S.step = 'clue'; S.clue = null; S.left = 0; if (why) this.log(why); this.turnTimer(); }
  finish(w, why) { const S = this.S; S.ph = 'over'; S.win = w; S.why = why; S.wins[w]++; S.key = this.key.join(''); this.untimer(); this.log(why); }
  can(p, role) { if (this.local) return true; const s = this.S.seats.find(x => x.p === p); return s && !s.out && s.team === this.S.turn && s.role === role; }
  handle(p, a) {
    const S = this.S, s = S.seats.find(x => x.p === p);
    if (S.ph !== 'play') {
      if (!s && !this.local) return;
      if (a.t === 'team' && s && (a.v === 'r' || a.v === 'b')) { s.team = a.v; if (s.role === 'spy' && S.seats.some(o => o !== s && o.team === a.v && o.role === 'spy')) s.role = 'op'; return this.commit(); }
      if (a.t === 'role' && s && s.team && (a.v === 'spy' || a.v === 'op')) { if (a.v === 'spy') S.seats.forEach(o => { if (o.team === s.team && o.role === 'spy') o.role = 'op'; }); s.role = a.v; return this.commit(); }
      if (a.t === 'shuffle' && p === this.hostP) { const ps = pkShuffle(S.seats.filter(o => !o.out)); ps.forEach((o, i) => { o.team = i % 2 ? 'b' : 'r'; o.role = 'op'; }); ['r', 'b'].forEach(k => { const f = ps.find(o => o.team === k); if (f) f.role = 'spy'; }); return this.commit(); }
      if (a.t === 'go' && p === this.hostP) { this.start(); return; }
      if (a.t === 'again' && p === this.hostP) { S.ph = 'setup'; S.words = []; S.rev = []; S.key = null; this.untimer(); return this.commit(); }
      return;
    }
    if (a.t === 'clue' && S.step === 'clue' && this.can(p, 'spy')) {
      const w = cnClue(a.v && a.v.w); let n = Math.floor(+(a.v && a.v.n)); if (!w) return; if (!(n >= 0 && n <= 10)) n = 1;
      if (S.words.some(x => x === w)) return; // clue may not be a word on the board
      S.clue = { w, n, t: S.turn }; S.left = (n === 0 || n === 10) ? 99 : n + 1; S.step = 'guess';
      this.log(`${CN_DOT[S.turn]} ${this.local ? 'القائد' : s.n}: «${w}» × ${n === 10 ? '∞' : n}`); this.turnTimer(); return this.commit();
    }
    if (a.t === 'pick' && S.step === 'guess' && this.can(p, 'op')) {
      const i = Math.floor(+a.v); if (!(i >= 0 && i < 25) || S.rev[i]) return;
      const c = this.key[i], who = this.local ? '' : s.n + ' '; S.rev[i] = c; const tn = S.turn, other = tn === 'r' ? 'b' : 'r';
      if (c === 'x') { this.finish(other, `💀 ${who}كشف القاتل «${S.words[i]}» — فاز الفريق ${CN_TEAM[other]}!`); return this.commit(); }
      if (c === 'r' || c === 'b') S.rem[c]--;
      if (S.rem[tn] === 0) { this.finish(tn, `🏆 الفريق ${CN_TEAM[tn]} وجد كل عملائه!`); return this.commit(); }
      if (S.rem[other] === 0) { this.finish(other, `🏆 الفريق ${CN_TEAM[other]} فاز — كُشف آخر عملائه!`); return this.commit(); }
      if (c === tn) { S.left--; this.log(`${CN_DOT[tn]} ${who}✔ «${S.words[i]}»`); if (S.left <= 0) this.switchTurn('انتهت المحاولات'); }
      else this.switchTurn(`${CN_DOT[tn]} ${who}✘ «${S.words[i]}» ${c === 'n' ? '(محايد)' : '(للفريق ' + CN_TEAM[other] + ')'}`);
      return this.commit();
    }
    if (a.t === 'end' && S.step === 'guess' && this.can(p, 'op')) { this.switchTurn(`${CN_DOT[S.turn]} أنهى الفريق دوره`); return this.commit(); }
    if (a.t === 'again' && p === this.hostP) { S.ph = 'setup'; this.untimer(); return this.commit(); }
  }
  tick() { const S = this.S; if (S.ph === 'play' && S.end && Date.now() >= S.end) { this.switchTurn(`⏱️ انتهى وقت الفريق ${CN_TEAM[S.turn]}`); this.commit(); } }
}

/* ---------- view ---------- */
const CNV = { sel: -1, spyView: false, settled: '', clueW: '', clueN: 1 };
function cnMe(S) { return mySeat(S); }
function cnKey(S, priv) { if (S.key) return S.key; if (priv && priv.r === S.round && priv.k) return priv.k; return null; }
function cnIsSpyView(S, priv) { if (S.ph === 'over') return true; if (S.local) return CNV.spyView; const s = cnMe(S); return !!(s && s.role === 'spy' && cnKey(S, priv)); }
GAMES.cn = {
  key: 'cn', title: 'كود نيمز', Engine: CNEngine, hidden: true, hudIcon: '🕵️',
  soloIcon: '📱', soloLabel: 'جهاز واحد', soloDesc: 'العبوا معاً حول شاشة واحدة', hostDesc: 'فريقان، وكل لاعب على جهازه',
  cfg: [
    { k: 'cat', label: '📚 فئة الكلمات', d: 0, lo: 0, hi: CN_WORDS.length, opts: [0, ...CN_WORDS.map((c, i) => i + 1)], fmt: v => v ? CN_WORDS[v - 1][0] + ` (${CN_WORDS[v - 1][1].length})` : `خليط من كل الفئات (${CN_ALL.length} كلمة)` },
    { k: 'turn', label: '⏱️ وقت دور كل فريق', d: 0, lo: 0, hi: 600, opts: [0, 60, 90, 120, 180, 240, 300], fmt: v => v ? (v >= 60 ? (v / 60) + ' دقيقة' : v + ' ثانية') : 'بدون حد' },
    { k: 'assassins', label: '💀 عدد كلمات القاتل', d: 1, lo: 1, hi: 3, opts: [1, 2, 3] },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>فريقان: <b style="color:#ff6b6b">أحمر</b> و<b style="color:#6fb3ff">أزرق</b>. لكل فريق <b>قائد</b> يرى ألوان الكلمات الـ25، و<b>عملاء</b> لا يرونها.</li>
    <li>القائد يعطي دليلاً من كلمة واحدة ورقماً، مثلاً «بحر 2» يعني أن كلمتين على اللوحة لهما علاقة بالبحر.</li>
    <li>العملاء يخمّنون. الكلمة الصحيحة تمنحهم محاولة أخرى (حتى الرقم + 1). المحايدة أو كلمة الخصم تُنهي الدور.</li>
    <li>💀 من يكشف كلمة <b>القاتل</b> يخسر فوراً. أول فريق يكشف كل كلماته يفوز.</li>
    <li>الفريق الذي يبدأ له 9 كلمات، والآخر 8.</li></ul>`,
  reset() { $('#cnGrid').innerHTML = ''; $('#cnTeams').innerHTML = ''; CNV.sel = -1; CNV.spyView = false; },
  busy(S) { return S.ph === 'play'; },
  hud(S) { const s = cnMe(S); if (S.local) return 'جهاز واحد'; if (!s || !s.team) return 'بدون فريق'; return CN_DOT[s.team] + ' ' + (s.role === 'spy' ? 'قائد' : 'عميل'); },
  localKey() { return CNV.sel + '|' + CNV.spyView; },
  onState(prev, S) {
    if (prev && S.round !== prev.round) { CNV.sel = -1; CNV.spyView = false; }
    if (prev && S.ph === 'play' && prev.rev) { S.rev.forEach((c, i) => { if (c && !prev.rev[i]) { sfx(c === 'x' ? 'lose' : 'flip'); if (CNV.sel === i) CNV.sel = -1; } }); }
    if (prev && prev.turn !== S.turn && S.ph === 'play') { const s = cnMe(S); if (s && s.team === S.turn) sfx('turn'); }
    if (S.ph === 'over') { const key = APP.code + ':' + S.round; if (CNV.settled !== key) { CNV.settled = key; const s = cnMe(S); setTimeout(() => { banner('فاز ' + CN_TEAM[S.win] + '!', S.win === 'r' ? 'redt' : 'bluet'); if (S.local || (s && s.team === S.win)) sfx('bj'); else sfx('lose'); }, 300); } }
    if (S.ph === 'play' && S.step === 'clue') CNV.sel = -1;
  },
  render(S, priv) {
    if (!S) { timerMsg($('#cnMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    const me = cnMe(S), key = cnKey(S, priv), spy = cnIsSpyView(S, priv);
    $('#st-cn').dataset.turn = S.ph === 'play' ? S.turn : (S.ph === 'over' ? S.win : '');
    // teams panel
    const tbox = $('#cnTeams'), keep = new Set();
    ['r', 'b'].forEach(k => {
      let col = tbox.querySelector('.cnteam.' + k);
      if (!col) { col = el('div', 'cnteam ' + k, `<div class="th"><span class="tn"></span><span class="rm"></span></div><div class="spy"></div><div class="ops"></div><div class="wins"></div>`); tbox.appendChild(col); }
      col.querySelector('.tn').textContent = CN_DOT[k] + ' الفريق ' + CN_TEAM[k];
      col.querySelector('.rm').textContent = S.ph === 'setup' ? '' : S.rem[k];
      col.querySelector('.wins').textContent = (S.wins[k] ? '🏆 ' + S.wins[k] : '');
      col.classList.toggle('active', S.ph === 'play' && S.turn === k);
    });
    if (S.local) tbox.classList.add('local'); else tbox.classList.remove('local');
    S.seats.forEach(s => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'cnp', '<div class="emo"></div><div class="net"></div><span class="av"></span><span class="nm"></span>'); SEATS.set(s.p, e); }
      const col = s.team ? tbox.querySelector('.cnteam.' + s.team + ' ' + (s.role === 'spy' ? '.spy' : '.ops')) : $('#cnBench');
      if (e.parentNode !== col) col.appendChild(e);
      e.classList.toggle('me', s.p === APP.myPeer); e.classList.toggle('out', !!s.out); e.classList.toggle('isSpy', s.role === 'spy' && !!s.team);
      e.querySelector('.av').textContent = s.a; e.querySelector('.nm').textContent = (s.role === 'spy' && s.team ? '🕵️ ' : '') + (s.p === APP.myPeer ? s.n + ' (أنت)' : s.n);
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    tbox.querySelectorAll('.spy').forEach(x => { if (!x.querySelector('.cnp')) x.dataset.empty = 'لا يوجد قائد'; else delete x.dataset.empty; });
    $('#cnBench').style.display = S.seats.some(s => !s.team) && !S.local ? '' : 'none';
    // clue banner
    const cb = $('#cnClue');
    if (S.ph === 'play' && S.clue) { cb.className = 'cnclue on ' + S.clue.t; cb.innerHTML = ''; const w = el('b'); w.textContent = S.clue.w; cb.append('الدليل: ', w, el('span', 'cnn', '× ' + (S.clue.n === 10 ? '∞' : S.clue.n)), el('small', '', S.left >= 99 ? 'محاولات مفتوحة' : `متبقٍّ ${S.left} محاولة`)); }
    else cb.className = 'cnclue';
    // grid
    const g = $('#cnGrid');
    if (S.ph === 'setup') { g.classList.add('empty'); if (g.dataset.k !== 'setup') { g.dataset.k = 'setup'; g.innerHTML = ''; for (let i = 0; i < 25; i++) g.appendChild(el('div', 'cnc ghost', '<div class="in"><div class="fr"><span class="w">؟</span></div></div>')); } }
    else {
      g.classList.remove('empty'); const gk = APP.code + ':' + S.round;
      if (g.dataset.k !== gk) { g.dataset.k = gk; g.innerHTML = ''; S.words.forEach((w, i) => { const c = el('div', 'cnc', '<div class="in"><div class="fr"><span class="w"></span><i class="kd"></i></div><div class="bk"><span class="ag"></span><span class="w2"></span></div></div>'); c.querySelector('.w').textContent = w; c.querySelector('.w2').textContent = w; c.style.animationDelay = (i * 25) + 'ms'; c.onclick = () => cnClick(i); g.appendChild(c); }); }
      const canPick = S.ph === 'play' && S.step === 'guess' && (S.local ? !CNV.spyView : (me && me.team === S.turn && me.role === 'op'));
      [...g.children].forEach((c, i) => {
        const r = S.rev[i], k = key ? key[i] : '';
        c.classList.toggle('rv', !!r); ['r', 'b', 'n', 'x'].forEach(t => { c.classList.toggle('c-' + t, (r || '') === t); c.classList.toggle('k-' + t, !r && spy && k === t); });
        c.querySelector('.ag').textContent = r ? { r: '🕵️', b: '🕵️', n: '🧍', x: '💀' }[r] : '';
        c.classList.toggle('sel', CNV.sel === i); c.classList.toggle('can', canPick && !r);
        c.classList.toggle('missed', S.ph === 'over' && !r);
      });
    }
    // log
    const lg = $('#cnLog'); const lk = (S.log || []).join('\n'); if (lg.dataset.k !== lk) { lg.dataset.k = lk; lg.innerHTML = ''; (S.log || []).slice().reverse().forEach((t, i) => { const d = el('div', i === 0 ? 'new' : ''); d.textContent = t; lg.appendChild(d); }); }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(); let m1 = '', m2 = '', bar = false; const me = cnMe(S);
    if (S.ph === 'setup') { m1 = 'اختاروا الفرق والقادة'; const miss = []; if (!S.local) for (const k of ['r', 'b']) { const t = S.seats.filter(s => !s.out && s.team === k); if (!t.some(s => s.role === 'spy')) miss.push('قائد ' + CN_TEAM[k]); if (!t.some(s => s.role === 'op')) miss.push('عميل ' + CN_TEAM[k]); } m2 = miss.length ? 'ينقص: ' + miss.join('، ') : 'جاهزون! المضيف يبدأ اللعبة'; }
    else if (S.ph === 'play') { const t = CN_TEAM[S.turn]; m1 = S.step === 'clue' ? `${CN_DOT[S.turn]} قائد ${t} يفكّر في دليل...` : `${CN_DOT[S.turn]} عملاء ${t} يخمّنون`; if (!S.local && me && me.team === S.turn) m1 = S.step === 'clue' ? (me.role === 'spy' ? '🎯 دورك: أعطِ فريقك دليلاً' : '⏳ قائدكم يفكّر...') : (me.role === 'op' ? '🎯 دوركم: اختاروا كلمة' : '⏳ فريقك يخمّن...'); m2 = S.end ? `${Math.ceil(tl / 1000)} ث` : ''; bar = !!S.end; }
    else if (S.ph === 'over') { m1 = S.why; m2 = `${CN_DOT.r} ${S.wins.r} — ${S.wins.b} ${CN_DOT.b}`; }
    timerMsg($('#cnMsg'), m1, m2, bar);
  },
  controls(box, S, priv, pending) {
    const me = cnMe(S), row = el('div', 'crow'); box.appendChild(row); const B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (S.ph === 'setup') {
      if (S.local) { B('ابدأ اللعبة ▶', 'green', () => myAct({ t: 'go' })); return; }
      if (!me) { row.appendChild(el('div', 'status', '👀 أنت تشاهد')); return; }
      B('🔴 الفريق الأحمر', 'red' + (me.team === 'r' ? '' : ' dimb'), () => myAct({ t: 'team', v: 'r' }));
      B('🔵 الفريق الأزرق', 'blue' + (me.team === 'b' ? '' : ' dimb'), () => myAct({ t: 'team', v: 'b' }));
      if (me.team) B(me.role === 'spy' ? '🙋 كن عميلاً' : '🕵️ كن القائد', 'purple sm', () => myAct({ t: 'role', v: me.role === 'spy' ? 'op' : 'spy' }));
      if (APP.eng) { const r2 = el('div', 'crow'); box.appendChild(r2); mkBtn(r2, '🔀 توزيع عشوائي', 'ghost sm', () => myAct({ t: 'shuffle' }), false, pending); const rd = APP.eng.ready(); mkBtn(r2, 'ابدأ اللعبة ▶', 'gold', () => myAct({ t: 'go' }), !rd.ok, pending); }
      return;
    }
    if (S.ph === 'over') {
      row.appendChild(el('div', 'status', S.win ? `🏆 فاز الفريق ${CN_TEAM[S.win]}` : ''));
      if (APP.eng) B('جولة جديدة ▶', 'green', () => S.local ? APP.eng.start() : myAct({ t: 'again' }));
      return;
    }
    const isSpyTurn = S.step === 'clue' && (S.local || (me && me.team === S.turn && me.role === 'spy'));
    const isOpTurn = S.step === 'guess' && (S.local || (me && me.team === S.turn && me.role === 'op'));
    if (S.local) { const t = el('button', 'btn sm ' + (CNV.spyView ? 'gold' : 'ghost')); t.innerHTML = CNV.spyView ? '🙈 إخفاء المفتاح' : '👁️ عرض المفتاح (للقائد فقط)'; t.onclick = () => { CNV.spyView = !CNV.spyView; CNV.sel = -1; renderGame(); }; row.appendChild(t); }
    if (isSpyTurn && (!S.local || CNV.spyView)) {
      const r2 = el('div', 'crow cluebox'); box.appendChild(r2);
      const inp = el('input'); inp.placeholder = 'اكتب الدليل (كلمة واحدة)'; inp.maxLength = 20; inp.value = CNV.clueW; inp.oninput = () => CNV.clueW = inp.value;
      const sel = el('select'); for (let n = 0; n <= 10; n++) { const o = el('option'); o.value = n; o.textContent = n === 10 ? '∞' : n; if (n === CNV.clueN) o.selected = true; sel.appendChild(o); } sel.onchange = () => CNV.clueN = +sel.value;
      const go = el('button', 'btn gold', '📣 أرسل الدليل'); go.disabled = pending;
      const send = () => { const w = cnClue(inp.value); if (!w) { toast('اكتب الدليل أولاً'); return; } if (S.words.includes(w)) { toast('لا يمكن أن يكون الدليل كلمة من اللوحة'); return; } myAct({ t: 'clue', v: { w, n: CNV.clueN } }); CNV.clueW = ''; if (S.local) { CNV.spyView = false; } };
      go.onclick = send; inp.onkeydown = e => { if (e.key === 'Enter') send(); };
      r2.append(inp, sel, go); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 30);
      return;
    }
    if (S.local && S.step === 'clue') { row.appendChild(el('div', 'status', 'يا قائد ' + CN_TEAM[S.turn] + ': اضغط «عرض المفتاح» واكتب دليلك بعيداً عن أعين العملاء')); return; }
    if (isOpTurn && !(S.local && CNV.spyView)) {
      if (CNV.sel >= 0 && !S.rev[CNV.sel]) B(`🔍 اكشف «${S.words[CNV.sel]}»`, 'gold', () => { const i = CNV.sel; CNV.sel = -1; myAct({ t: 'pick', v: i }); });
      else row.appendChild(el('div', 'status', 'اضغط على كلمة لاختيارها'));
      B('⏭️ إنهاء الدور', 'ghost sm', () => myAct({ t: 'end' }));
      return;
    }
    let t = 'انتظر...'; if (S.local && CNV.spyView && S.step === 'guess') t = 'أخفِ المفتاح قبل أن يخمّن العملاء';
    else if (me && me.team && me.team !== S.turn) t = 'دور الفريق الآخر...'; else if (me && me.role === 'spy' && S.step === 'guess') t = 'فريقك يخمّن — لا تلمّح! 🤐'; else if (me && !me.team) t = 'أنت بدون فريق — ستنضم في الجولة القادمة';
    row.appendChild(el('div', 'status', t));
  }
};
function cnClick(i) {
  const S = APP.S; if (!S || S.ph !== 'play' || S.step !== 'guess' || S.rev[i]) return;
  const me = cnMe(S); if (!(S.local ? !CNV.spyView : (me && me.team === S.turn && me.role === 'op'))) return;
  if (CNV.sel === i) { CNV.sel = -1; myAct({ t: 'pick', v: i }); return; }
  CNV.sel = i; sfx('pop'); renderGame();
}
