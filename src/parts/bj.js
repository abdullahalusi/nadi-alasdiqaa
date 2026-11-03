/* =====================================================================
   BLACKJACK
   ===================================================================== */
class BJEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) { super('bj', pub, hostP, round, cfg); Object.assign(this.S, { ph: 'bet', dealer: { c: [] }, turn: null }); this.shoe = []; this.hole = null; }
  shuffle() { const s = []; for (let d = 0; d < 6; d++) for (const r of RANKS) for (const u of SUITS) s.push(r + u); for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } this.shoe = s; }
  draw() { if (this.shoe.length < 80) this.shuffle(); return this.shoe.pop(); }
  newSeat(x) { const ch = this.bank[x.p] !== undefined ? this.bank[x.p] : this.cfg.start; return { p: x.p, n: x.n, a: x.a, ch, b: 0, hs: [], net: 0, w: ch < this.cfg.min ? 1 : 0 }; }
  active() { return this.S.seats.filter(s => !s.out && !s.w); }
  allBet() { const ss = this.active(); return ss.length > 0 && ss.every(s => s.b > 0); }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph === 'bet') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => { if (s.out) this.bank[s.p] = s.ch; return !s.out; }); if (S.seats.length !== n0) ch = true;
      for (const x of list) { if (S.seats.length >= 6) break; if (!S.seats.find(s => s.p === x.p)) { S.seats.push(this.newSeat(x)); ch = true; } }
      if (S.end && !S.seats.some(s => s.b > 0)) { this.untimer(); ch = true; }
      if (this.allBet() && (!S.end || S.end - Date.now() > 1200)) { this.timer(1200); ch = true; }
    }
    if (this.updWatch(list)) ch = true;
    if (S.ph === 'play' && S.turn) { const s = S.seats[S.turn.s]; if (s && s.out) { this.standCur(); return; } }
    if (ch) this.commit();
  }
  onCfg() { const S = this.S; if (S.ph === 'play' && S.turn) { if (this.cfg.turn) this.timer(this.cfg.turn * 1000); else this.untimer(); } if (S.ph === 'bet') S.seats.forEach(s => this.onChips(s)); }
  onChips(s) { if (this.S.ph === 'bet') { s.w = s.ch < this.cfg.min ? 1 : 0; if (s.b > s.ch || s.w) s.b = 0; } }
  onKick(p, i) { const S = this.S; if (i < 0) return false; if (S.ph === 'bet') { S.seats.splice(i, 1); return false; } S.seats[i].out = 1; S.seats[i].kicked = 1; if (S.ph === 'play' && S.turn && S.turn.s === i) { this.standCur(); return true; } return false; }
  handle(p, a) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p); if (i < 0) return; const s = S.seats[i]; if (s.out) return;
    if (S.ph === 'bet') {
      if (a.t === 'bet') {
        if (s.w) return; let v = Math.floor(+a.v || 0); if (v < 0) v = 0; if (v > s.ch) v = s.ch; if (v > 0 && v < this.cfg.min) return;
        s.b = v;
        if (v > 0 && !S.end) this.timer(this.cfg.betTime * 1000);
        if (this.allBet() && (!S.end || S.end - Date.now() > 1200)) this.timer(1200);
        if (!S.seats.some(x => x.b > 0)) this.untimer();
        this.commit();
      } else if (a.t === 'go' && p === this.hostP) { if (S.seats.some(x => x.b > 0)) this.deal(); }
      return;
    }
    if (S.ph !== 'play' || !S.turn || S.turn.s !== i) return;
    const h = s.hs[S.turn.h]; if (!h || h.d) return;
    const committed = s.hs.reduce((m, x) => m + x.b, 0);
    if (a.t === 'hit') { h.c.push(this.draw()); if (handVal(h.c).t >= 21) h.d = 1; this.nextTurn(); }
    else if (a.t === 'stand') { h.d = 1; this.nextTurn(); }
    else if (a.t === 'dbl') { if (h.c.length !== 2 || s.ch - committed < h.b) return; h.b *= 2; h.x = 1; h.c.push(this.draw()); h.d = 1; this.nextTurn(); }
    else if (a.t === 'split') {
      if (s.hs.length !== 1 || h.c.length !== 2 || cardVal(h.c[0]) !== cardVal(h.c[1]) || s.ch - committed < h.b) return;
      const c2 = h.c.pop(), ace = h.c[0][0] === 'A'; h.sp = 1; h.c.push(this.draw()); const h2 = { c: [c2, this.draw()], b: h.b, sp: 1 }; s.hs.push(h2);
      if (ace) { h.d = 1; h2.d = 1; } else { if (handVal(h.c).t === 21) h.d = 1; if (handVal(h2.c).t === 21) h2.d = 1; }
      this.nextTurn();
    }
  }
  deal() {
    const S = this.S; S.ph = 'play'; this.untimer(); S.dealer = { c: [] };
    S.seats.forEach(s => { s.hs = []; s.net = 0; if (!(s.b > 0) || s.b > s.ch) s.b = 0; });
    const ps = S.seats.filter(s => s.b > 0 && !s.out); ps.forEach(s => s.hs = [{ c: [], b: s.b }]);
    for (let k = 0; k < 2; k++) { ps.forEach(s => s.hs[0].c.push(this.draw())); if (k === 0) S.dealer.c.push(this.draw()); else { this.hole = this.draw(); S.dealer.c.push('XX'); } }
    ps.forEach(s => { if (handVal(s.hs[0].c).t === 21) s.hs[0].d = 1; });
    if (cardVal(S.dealer.c[0]) + cardVal(this.hole) === 21) { S.dealer.c[1] = this.hole; S.ph = 'dealer'; S.turn = null; this.commit(); this.later(() => this.settle(), 2600); return; }
    S.turn = null; this.commit();
    this.later(() => this.nextTurn(), 400 + ps.length * 420);
  }
  nextTurn() {
    const S = this.S; if (S.ph !== 'play') return;
    for (let i = 0; i < S.seats.length; i++) { const s = S.seats[i]; if (!s.hs.length) continue; if (s.out) { s.hs.forEach(h => h.d = 1); continue; }
      for (let j = 0; j < s.hs.length; j++) if (!s.hs[j].d) { S.turn = { s: i, h: j }; if (this.cfg.turn) this.timer(this.cfg.turn * 1000); else this.untimer(); this.commit(); return; } }
    S.turn = null; this.untimer(); this.dealerPlay();
  }
  standCur() { const S = this.S, T = S.turn; if (!T) return; const s = S.seats[T.s]; if (s && s.hs[T.h]) s.hs[T.h].d = 1; this.nextTurn(); }
  dealerPlay() {
    const S = this.S; S.ph = 'dealer'; S.dealer.c[1] = this.hole; this.commit();
    const live = S.seats.some(s => !s.kicked && s.hs.some(h => handVal(h.c).t <= 21 && !isBJ(h)));
    const step = () => { if (live && handVal(S.dealer.c).t < 17) { S.dealer.c.push(this.draw()); this.commit(); this.later(step, 900); } else this.later(() => this.settle(), 800); };
    this.later(step, 1000);
  }
  settle() {
    const S = this.S, d = handVal(S.dealer.c).t, dbj = S.dealer.c.length === 2 && d === 21;
    S.seats.forEach(s => { let net = 0; s.hs.forEach(h => { const v = handVal(h.c).t, bj = isBJ(h); let r;
      if (v > 21) r = 'bust'; else if (bj && !dbj) r = 'bj'; else if (dbj && !bj) r = 'lose'; else if (bj && dbj) r = 'push'; else if (d > 21 || v > d) r = 'win'; else if (v < d) r = 'lose'; else r = 'push';
      h.r = r; net += r === 'bj' ? Math.floor(h.b * 1.5) : r === 'win' ? h.b : r === 'push' ? 0 : -h.b; }); s.net = net; s.ch = Math.max(0, s.ch + net); this.bank[s.p] = s.ch; });
    S.ph = 'done'; S.turn = null; this.timer(6500); this.commit();
  }
  newRound() {
    const S = this.S; S.round++; S.ph = 'bet'; this.untimer(); S.dealer = { c: [] }; S.turn = null;
    S.seats = S.seats.filter(s => { if (s.out) this.bank[s.p] = s.ch; return !s.out; }); S.seats.forEach(s => { s.b = 0; s.hs = []; s.net = 0; s.w = s.ch < this.cfg.min ? 1 : 0; });
    for (const p in this.players) { if (S.seats.length >= 6) break; if (!S.seats.find(s => s.p === p)) S.seats.push(this.newSeat(this.players[p])); }
    this.updWatch(Object.values(this.players));
    this.commit();
  }
  tick() {
    const S = this.S, now = Date.now();
    if (S.ph === 'bet' && S.end && now >= S.end) { if (S.seats.some(s => s.b > 0)) this.deal(); else { this.untimer(); this.commit(); } }
    else if (S.ph === 'play' && S.turn && S.end && now >= S.end) this.standCur();
    else if (S.ph === 'done' && S.end && now >= S.end) this.newRound();
  }
}

const BJ = { betDraft: 0, lastBet: 25, settled: '' };
function bjCommitted(S) { const s = mySeat(S); if (!s) return 0; if (S.ph === 'bet') return s.b || 0; if (S.ph === 'done') return 0; return s.hs.reduce((m, h) => m + h.b, 0); }
function bjAvail(S) { const s = mySeat(S); return s ? s.ch - bjCommitted(S) : 0; }
function bjSlots(n) { const spans = [0, 70, 100, 120, 136, 140]; const sp = spans[Math.min(n, 6) - 1] || 0; const out = []; for (let i = 0; i < n; i++) { const th = (n === 1 ? 90 : 90 - sp / 2 + sp * i / (n - 1)) * Math.PI / 180; out.push({ x: 50 + 40 * Math.cos(th), y: 40 + 32 * Math.sin(th) }); } return out; }

GAMES.bj = {
  key: 'bj', title: 'بلاك جاك', Engine: BJEngine, chips: true,
  soloIcon: '🎴', soloLabel: 'لعب فردي', soloDesc: 'أنت ضد الموزّع، تبدأ فوراً', hostDesc: 'حتى 6 لاعبين برابط ترسله لأصدقائك',
  cfg: [
    { k: 'turn', label: '⏱️ وقت الدور لكل لاعب', d: 30, lo: 0, hi: 300, opts: [10, 15, 20, 30, 45, 60, 90, 0], fmt: secs },
    { k: 'start', label: '💰 نقود البداية لكل لاعب', d: 1000, lo: 5, hi: 1e8, step: 5 },
    { k: 'min', label: '🪙 أقل رهان', d: 5, lo: 1, hi: 1e6, opts: [1, 5, 10, 25, 50, 100, 500, 1000] },
    { k: 'betTime', label: '⏳ وقت المراهنة', d: 15, lo: 5, hi: 120, opts: [5, 10, 15, 20, 30, 45, 60], fmt: secs },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>الهدف: الاقتراب من 21 دون تجاوزها، والتفوق على الموزّع.</li>
    <li>البطاقات المصوّرة = 10، الآس = 1 أو 11. بلاك جاك (آس + 10) يدفع 3 مقابل 2.</li>
    <li>الموزّع يسحب حتى 16 ويقف على 17.</li>
    <li><b>مضاعفة</b>: ضاعف رهانك واسحب ورقة واحدة. <b>تقسيم</b>: افصل ورقتين متساويتين إلى يدين.</li></ul>`,
  reset() { $('#seats').innerHTML = ''; $('#dealerHand').innerHTML = ''; $('#dealerVal').className = 'val'; BJ.betDraft = 0; },
  busy(S) { const s = mySeat(S); return s && s.hs.length && S.ph !== 'done'; },
  hud(S) { const s = mySeat(S); return s ? fmt(bjAvail(S) - (S.ph === 'bet' && !s.b ? BJ.betDraft : 0)) : null; },
  chipsEdited(prev, S, a, b) { return S.ph === 'bet' && prev.ph === 'bet' && a.ch !== b.ch; },
  localKey() { return BJ.betDraft; },
  onState(prev, S) {
    const s = mySeat(S);
    if (prev) { if (S.round !== prev.round) BJ.betDraft = 0; const T = S.turn, pT = prev.turn, ts = T && S.seats[T.s]; if (ts && ts.p === APP.myPeer && (!pT || pT.s !== T.s || pT.h !== T.h)) sfx('turn'); }
    if (s && S.ph === 'bet' && !s.b && BJ.betDraft > s.ch) BJ.betDraft = 0;
    if (S.ph === 'done') {
      const key = APP.code + ':' + S.round; if (BJ.settled === key) return; BJ.settled = key;
      setTimeout(() => {
        S.seats.forEach(x => { if (x.hs.length) showNet(x.p, x.net); });
        if (!s || !s.hs.length) return; const from = $('#dealerHand');
        if (s.hs.some(h => h.r === 'bj')) { banner('بلاك جاك!', 'gold'); sfx('bj'); coinBurst(s.p, from); }
        else if (s.net > 0) { banner('فزت!', 'gold'); sfx('win'); coinBurst(s.p, from); }
        else if (s.net < 0) { if (s.hs.every(h => h.r === 'bust')) banner('احترقت!', 'redt'); sfx('lose'); }
        else banner('تعادل', 'wht');
      }, 350);
    }
  },
  render(S) {
    if (!S) { $('#centerMsg').innerHTML = `<div class="m1">⏳ بانتظار المضيف...</div>`; $('#centerMsg').dataset.k = ''; return; }
    syncHand($('#dealerHand'), S.dealer.c);
    const dv = $('#dealerVal'); if (S.dealer.c.some(c => c !== 'XX')) { const v = handVal(S.dealer.c).t; dv.textContent = (S.dealer.c.includes('XX') ? v + ' + ?' : v); dv.className = 'val on' + (v > 21 ? ' bust' : (S.dealer.c.length === 2 && v === 21 && !S.dealer.c.includes('XX') ? ' bj' : '')); } else dv.className = 'val';
    const n = S.seats.length, slots = bjSlots(n), myIdx = S.seats.findIndex(s => s.p === APP.myPeer), mid = Math.floor(n / 2);
    const box = $('#seats'), keep = new Set();
    S.seats.forEach((s, i) => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'seat'); e.innerHTML = '<div class="emo"></div><div class="hands"></div><div class="betspot"><div class="stack"></div><span class="amt"></span></div><div class="plate"><div class="av"></div><div class="nm"></div></div><div class="wait"></div><div class="net"></div>'; box.appendChild(e); SEATS.set(s.p, e); }
      const di = myIdx >= 0 ? (i - myIdx + mid + n) % n : i, pos = slots[di];
      e.style.left = pos.x + '%'; e.style.top = pos.y + '%';
      e.classList.toggle('me', s.p === APP.myPeer); e.classList.toggle('out', !!s.out);
      e.querySelector('.av').textContent = s.a; e.querySelector('.nm').textContent = (s.p === APP.myPeer ? s.n + ' (أنت)' : s.n);
      const hb = e.querySelector('.hands'); while (hb.children.length > s.hs.length) hb.lastChild.remove();
      s.hs.forEach((h, j) => {
        let w = hb.children[j]; if (!w) { w = el('div', 'hwrap', '<div class="res"></div><div class="hand"></div><div class="val"></div>'); hb.appendChild(w); }
        syncHand(w.querySelector('.hand'), h.c);
        const v = handVal(h.c).t, vb = w.querySelector('.val'); vb.textContent = v + (h.x ? ' ×2' : ''); vb.className = 'val on' + (v > 21 ? ' bust' : isBJ(h) ? ' bj' : '');
        w.classList.toggle('act', !!(S.ph === 'play' && S.turn && S.turn.s === i && S.turn.h === j));
        const rb = w.querySelector('.res'), RL = { win: 'فوز', bj: 'بلاك جاك!', lose: 'خسارة', bust: 'احترق', push: 'تعادل' };
        if (S.ph === 'done' && h.r) { rb.textContent = RL[h.r]; rb.className = 'res on ' + h.r; } else if (v > 21) { rb.textContent = 'احترق'; rb.className = 'res on bust'; } else rb.className = 'res';
      });
      const bs = e.querySelector('.betspot'), amt = s.p === APP.myPeer && S.ph === 'bet' && !s.b ? BJ.betDraft : (S.ph === 'bet' ? s.b : s.hs.reduce((m, h) => m + h.b, 0));
      bs.classList.toggle('draft', s.p === APP.myPeer && S.ph === 'bet' && !s.b && BJ.betDraft > 0);
      if (bs.dataset.a !== String(amt)) { bs.dataset.a = amt; renderStack(bs.querySelector('.stack'), amt); }
      const am = bs.querySelector('.amt'); am.textContent = amt ? fmt(amt) : ''; am.style.display = amt ? '' : 'none';
      e.querySelector('.wait').textContent = s.kicked ? 'طُرد' : s.out ? 'غادر' : s.w ? 'نفدت نقوده' : (S.ph !== 'bet' && !s.hs.length ? 'يشاهد' : (S.ph === 'bet' && s.b ? '✓ جاهز' : '💰 ' + fmt(s.ch)));
      e.querySelector('.av').classList.toggle('ring', !!(S.ph === 'play' && S.turn && S.turn.s === i && S.end));
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    this.tick(S);
  },
  tick(S) {
    const c = $('#centerMsg'), tl = timeLeft(); let m1 = '', m2 = '', bar = false;
    if (S.ph === 'bet') { m1 = 'ضعوا رهاناتكم'; const ready = S.seats.filter(s => s.b > 0).length; if (APP.localEnd) { m2 = `يبدأ التوزيع خلال ${Math.ceil(tl / 1000)} ث — جاهز ${ready}/${S.seats.filter(s => !s.out && !s.w).length}`; bar = true; } else m2 = S.wt ? `${S.wt} يشاهدون` : (APP.mode === 'multi' ? 'بانتظار اللاعبين...' : `أقل رهان ${fmt(S.cfg.min)}`); }
    else if (S.ph === 'play') { const T = S.turn; if (T) { const s = S.seats[T.s]; m1 = s.p === APP.myPeer ? '🎯 دورك!' : 'دور ' + s.n; m2 = S.end ? `${Math.ceil(tl / 1000)} ث` : 'بدون حد للوقت'; bar = !!S.end; } else m1 = 'جارٍ التوزيع...'; }
    else if (S.ph === 'dealer') m1 = 'الموزّع يلعب...';
    else if (S.ph === 'done') { const v = handVal(S.dealer.c).t; m1 = v > 21 ? 'الموزّع احترق! 🔥' : (S.dealer.c.length === 2 && v === 21 ? 'بلاك جاك للموزّع' : 'الموزّع: ' + v); m2 = `جولة جديدة خلال ${Math.ceil(tl / 1000)} ث`; }
    timerMsg(c, m1, m2, bar);
    if (S.ph === 'play' && S.turn && S.end) { const s = S.seats[S.turn.s], e = s && SEATS.get(s.p); if (e) e.querySelector('.av').style.setProperty('--p', timePct().toFixed(3)); }
  },
  controls(box, S, priv, pending) {
    const s = mySeat(S), row = el('div', 'crow'), B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    let mode = 'wait';
    if (!s) mode = 'watch'; else if (S.ph === 'bet') mode = s.w ? 'broke' : (s.b ? 'betdone' : 'bet'); else if (S.ph === 'play' && S.turn && S.seats[S.turn.s] === s) mode = 'turn';
    const minB = S.cfg.min;
    if (mode === 'bet') {
      const ch = s.ch;
      chipPicker(box, 0, ch - BJ.betDraft, (v, btn) => { if (BJ.betDraft + v > ch) return; flyChip(btn, v, SEATS.get(APP.myPeer) && SEATS.get(APP.myPeer).querySelector('.betspot')); BJ.betDraft += v; sfx('chip'); renderGame(); });
      box.appendChild(row);
      row.appendChild(el('div', 'betinfo', `الرهان: <b>${fmt(BJ.betDraft)}</b>`));
      B('مسح', 'ghost sm', () => { BJ.betDraft = 0; renderGame(); }, !BJ.betDraft);
      B('↺ كرر ' + fmt(BJ.lastBet), 'ghost sm', () => { BJ.betDraft = Math.min(BJ.lastBet, ch); sfx('chip'); renderGame(); }, !BJ.lastBet || BJ.lastBet > ch || BJ.lastBet < minB);
      B('🔥 الكل', 'ghost sm', () => { BJ.betDraft = ch; sfx('chip'); renderGame(); }, ch < minB);
      B('ضع الرهان ✔', 'gold', () => { if (BJ.betDraft < minB) { toast('أقل رهان ' + fmt(minB)); return; } BJ.lastBet = BJ.betDraft; myAct({ t: 'bet', v: BJ.betDraft }); BJ.betDraft = 0; }, BJ.betDraft < minB);
      return;
    }
    box.appendChild(row);
    if (mode === 'betdone') {
      row.appendChild(el('div', 'status', `✔ رهانك <b style="color:var(--gold)">${fmt(s.b)}</b> — بانتظار الآخرين`));
      B('تعديل', 'ghost sm', () => { BJ.betDraft = s.b; myAct({ t: 'bet', v: 0 }); });
      if (APP.eng && APP.mode === 'multi') B('وزّع الآن ▶', 'green sm', () => myAct({ t: 'go' }));
    } else if (mode === 'turn') {
      const h = s.hs[S.turn.h], v = handVal(h.c).t, avail = bjAvail(S);
      const canD = h.c.length === 2 && avail >= h.b, canS = s.hs.length === 1 && h.c.length === 2 && cardVal(h.c[0]) === cardVal(h.c[1]) && avail >= h.b;
      B('➕ سحب', 'green', () => myAct({ t: 'hit' }), v >= 21);
      B('✋ ثبات', 'red', () => myAct({ t: 'stand' }));
      B('×2 مضاعفة', 'blue', () => myAct({ t: 'dbl' }), !canD);
      B('✂️ تقسيم', 'purple', () => myAct({ t: 'split' }), !canS);
    } else {
      let t = '';
      if (mode === 'watch') t = '👀 أنت تشاهد — ستنضم في الجولة القادمة';
      else if (mode === 'broke') t = APP.eng ? 'نفدت نقودك — عدّلها من الإعدادات ⚙️' : 'نفدت نقودك 😅 اطلب من المضيف أن يعطيك نقوداً';
      else if (S.ph === 'play') t = S.turn ? 'انتظر دورك...' : 'جارٍ التوزيع...';
      else if (S.ph === 'dealer') t = 'الموزّع يكشف أوراقه...';
      else if (S.ph === 'done') t = s && s.hs.length ? (s.net > 0 ? `🎉 ربحت ${fmt(s.net)}` : s.net < 0 ? `خسرت ${fmt(-s.net)}` : 'تعادل') : 'انتهت الجولة';
      const st = el('div', 'status'); st.textContent = t; row.appendChild(st);
      if (mode === 'broke' && APP.eng) { const b = el('button', 'btn gold sm', '⚙️ الإعدادات'); b.onclick = openSettings; st.appendChild(b); }
    }
  }
};
function flyChip(btn, v, target) {
  if (!target) return; const to = target.getBoundingClientRect(), fr = btn.getBoundingClientRect();
  const c = chipEl(v); c.classList.add('flychip'); c.style.left = fr.left + 'px'; c.style.top = fr.top + 'px'; document.body.appendChild(c);
  requestAnimationFrame(() => { c.style.transform = `translate(${to.left + to.width / 2 - fr.left - 22}px,${to.top + to.height / 2 - fr.top - 22}px) scale(.7)`; c.style.opacity = '.2'; });
  setTimeout(() => c.remove(), 480);
}
