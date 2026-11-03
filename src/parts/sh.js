/* =====================================================================
   SECRET HITLER (سيكرت هتلر) — social deduction, 5–10 players
   Rules adapted from "Secret Hitler" by Goat, Wolf, & Cabbage (CC BY-NC-SA 4.0)
   ===================================================================== */
const SH_ROLE_CT = { 5: [3, 1], 6: [4, 1], 7: [4, 2], 8: [5, 2], 9: [5, 3], 10: [6, 3] };
function shPowers(n) { if (n <= 6) return [null, null, 'peek', 'kill', 'kill']; if (n <= 8) return [null, 'inv', 'spec', 'kill', 'kill']; return ['inv', 'inv', 'spec', 'kill', 'kill']; }
const SH_POW_ICON = { peek: '👁️', inv: '🔍', spec: '🗳️', kill: '💀' };
const SH_POW_NAME = { peek: 'كشف القوانين الثلاثة التالية', inv: 'التحقيق في ولاء لاعب', spec: 'انتخابات خاصة', kill: 'إعدام لاعب' };
const SH_ROLE_NAME = { L: 'ليبرالي', F: 'فاشي', H: 'هتلر' };
const shClean = s => String(s || '').replace(/[\u0000-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁯﻿]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);

class SHEngine extends BaseEngine {
  constructor(pub, hostP, round, cfg) {
    super('sh', pub, hostP, round, cfg);
    Object.assign(this.S, { ph: 'wait', lib: 0, fas: 0, track: 0, pres: -1, chan: -1, lastP: -1, lastC: -1, step: '', voted: [], vres: null, deckN: 17, discN: 0, log: [], chat: [], win: null, why: '', roles: null, rot: -1, spec: -1, vetoNo: 0, pw: [], invd: [], cid: 0, enact: null });
    this.roles = []; this.deck = []; this.disc = []; this.hand = null; this.votes = []; this.peekC = null; this.invRes = {}; this.chatAt = {}; this.botPending = {};
    this.syncBots();
  }
  newSeat(x, bot) { return Object.assign({ p: x.p, n: x.n, a: x.a, dead: 0 }, bot ? { bot: 1 } : {}); }
  syncBots() { const S = this.S; if (S.ph === 'play') return; let bots = S.seats.filter(s => s.bot); while (bots.length < this.cfg.bots && S.seats.length < 10) { const b = this.botSeat({}); S.seats.push(Object.assign(b, { dead: 0 })); bots = S.seats.filter(s => s.bot); } while (bots.length > this.cfg.bots) { const b = bots.pop(); S.seats.splice(S.seats.indexOf(b), 1); } }
  syncPlayers(list) {
    const S = this.S; list = this.filterPlayers(list); let ch = this.markSeats();
    if (S.ph !== 'play') {
      const n0 = S.seats.length; S.seats = S.seats.filter(s => s.bot || !s.out); if (S.seats.length !== n0) ch = true;
      for (const x of list) { if (S.seats.find(s => s.p === x.p)) continue; if (S.seats.length >= 10) { const b = S.seats.filter(s => s.bot).pop(); if (!b) break; S.seats.splice(S.seats.indexOf(b), 1); } S.seats.push(this.newSeat(x)); ch = true; }
    } else this.schedBots();
    if (this.updWatch(list)) ch = true;
    if (ch) this.commit();
  }
  onCfg() { if (this.S.ph !== 'play') this.syncBots(); else this.timerStep(); }
  onKick(p, i) { const S = this.S; if (i < 0) return false; if (S.ph === 'play') { S.seats[i].out = 1; S.seats[i].kicked = 1; this.schedBots(); return false; } S.seats.splice(i, 1); return false; }
  log(t) { const L = this.S.log; L.push(t); if (L.length > 6) L.shift(); }
  alive() { return this.S.seats.map((s, i) => i).filter(i => !this.S.seats[i].dead); }
  auto(i) { const s = this.S.seats[i]; return s && (s.bot || s.out); }
  priv(p) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p); if (i < 0 || S.ph === 'wait' || !this.roles.length) return null;
    const role = this.roles[i], n = S.seats.length, o = { r: S.round, role };
    if (role === 'F' || (role === 'H' && n <= 6)) o.mates = this.roles.map((r, k) => (r !== 'L' && k !== i) ? [k, r] : null).filter(Boolean);
    if (S.step === 'pdisc' && i === S.pres && this.hand) o.hand = this.hand.slice();
    if ((S.step === 'cdisc' || S.step === 'veto') && i === S.chan && this.hand) o.hand = this.hand.slice();
    if (S.step === 'power' && S.power === 'peek' && i === S.pres && this.peekC) o.peek = this.peekC.slice();
    if (this.invRes[i]) o.inv = this.invRes[i];
    return o;
  }
  /* ---------- flow ---------- */
  start() {
    const S = this.S; if (S.ph === 'play') return; this.syncBots();
    S.seats = S.seats.filter(s => s.bot || !s.out); const n = S.seats.length; if (n < 5 || n > 10) return;
    S.round++; S.seats.forEach(s => { s.dead = 0; });
    const [nl, nf] = SH_ROLE_CT[n]; this.roles = pkShuffle([...Array(nl).fill('L'), ...Array(nf).fill('F'), 'H']);
    this.deck = pkShuffle([...Array(6).fill('L'), ...Array(11).fill('F')]); this.disc = []; this.hand = null; this.invRes = {}; this.peekC = null;
    Object.assign(S, { ph: 'play', lib: 0, fas: 0, track: 0, lastP: -1, lastC: -1, chan: -1, vres: null, win: null, why: '', roles: null, spec: -1, vetoNo: 0, invd: [], log: [], chat: [], enact: null, pw: shPowers(n) });
    S.pres = Math.floor(Math.random() * n); S.rot = S.pres; this.counts();
    this.log(`🎭 وُزّعت الأدوار سراً على ${n} لاعبين`); this.log(`🎩 ${S.seats[S.pres].n} هو أول رئيس`);
    this.setStep('nominate');
  }
  counts() { this.S.deckN = this.deck.length; this.S.discN = this.disc.length; }
  timerStep() { const S = this.S; if (this.cfg.turn && S.ph === 'play' && ['nominate', 'vote', 'pdisc', 'cdisc', 'veto', 'power'].includes(S.step)) this.timer(this.cfg.turn * 1000 * (S.step === 'nominate' ? 1.5 : 1)); else this.untimer(); }
  setStep(st) { const S = this.S; S.step = st; if (st === 'vote') { S.voted = S.seats.map(() => 0); S.vres = null; this.votes = []; } this.timerStep(); this.commit(); this.schedBots(); }
  eligible(i) { const S = this.S, s = S.seats[i]; if (!s || s.dead || i === S.pres || i === S.lastC) return false; if (this.alive().length > 5 && i === S.lastP) return false; return true; }
  nextAlive(i) { const n = this.S.seats.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!this.S.seats[j].dead) return j; } return i; }
  nextPres() {
    const S = this.S; S.chan = -1; S.vres = null; S.power = null; S.enact = null;
    if (S.spec >= 0) { S.pres = S.spec; S.spec = -1; } else { S.pres = this.nextAlive(S.rot); S.rot = S.pres; }
    this.log(`🎩 الرئيس المرشّح الآن: ${S.seats[S.pres].n}`); this.setStep('nominate');
  }
  draw(k) { if (this.deck.length < k) { this.deck = pkShuffle(this.deck.concat(this.disc)); this.disc = []; this.log('🔀 أعيد خلط القوانين المهملة'); } const c = this.deck.splice(0, k); this.counts(); return c; }
  nominate(i) { const S = this.S; if (!this.eligible(i)) return; S.chan = i; this.log(`🎩 ${S.seats[S.pres].n} رشّح ${S.seats[i].n} مستشاراً`); this.setStep('vote'); }
  vote(i, ja) {
    const S = this.S; if (S.step !== 'vote' || S.seats[i].dead || S.voted[i]) return; this.votes[i] = !!ja; S.voted[i] = 1; this.checkVote();
  }
  checkVote() {
    const S = this.S, al = this.alive(); if (al.some(k => !S.voted[k])) { this.commit(); return; }
    S.vres = S.seats.map((s, k) => s.dead ? null : (this.votes[k] ? 1 : 0)); const yes = al.filter(k => this.votes[k]).length, pass = yes > al.length / 2;
    S.step = 'result'; this.untimer(); this.log(`🗳️ التصويت: ${yes} نعم — ${al.length - yes} لا ${pass ? '✔ نجحت الحكومة' : '✘ فشلت'}`); this.commit();
    this.later(() => {
      if (pass) {
        S.track = 0; S.lastP = S.pres; S.lastC = S.chan;
        if (S.fas >= 3 && this.roles[S.chan] === 'H') return this.finish('F', `🎩 انتُخب هتلر مستشاراً بعد 3 قوانين فاشية — فاز الفاشيون!`);
        this.hand = this.draw(3); this.setStep('pdisc');
      } else { S.track++; if (S.track >= 3) return this.chaos(); this.nextPres(); }
    }, 3200);
  }
  chaos() { const S = this.S; S.track = 0; const c = this.draw(1)[0]; S.lastP = -1; S.lastC = -1; this.log('😵 فشلت 3 حكومات متتالية! الشعب الغاضب يمرّر القانون التالي'); this.enact(c, true); }
  enact(c, chaos) {
    const S = this.S; if (c === 'L') S.lib++; else S.fas++; S.enact = { c, id: ++S.cid }; this.hand = null; this.counts();
    this.log(c === 'L' ? `🕊️ مُرّر قانون ليبرالي (${S.lib}/5)` : `☠️ مُرّر قانون فاشي (${S.fas}/6)`);
    if (S.lib >= 5) return this.finish('L', '🕊️ مُرّرت 5 قوانين ليبرالية — فاز الليبراليون!');
    if (S.fas >= 6) return this.finish('F', '☠️ مُرّرت 6 قوانين فاشية — فاز الفاشيون!');
    S.step = 'enacted'; this.untimer(); this.commit();
    this.later(() => {
      const pw = c === 'F' && !chaos ? S.pw[S.fas - 1] : null;
      if (pw) { S.power = pw; if (pw === 'peek') { if (this.deck.length < 3) { this.deck = pkShuffle(this.deck.concat(this.disc)); this.disc = []; } this.peekC = this.deck.slice(0, 3); this.counts(); } this.log(`${SH_POW_ICON[pw]} الرئيس ${S.seats[S.pres].n} حصل على صلاحية: ${SH_POW_NAME[pw]}`); return this.setStep('power'); }
      this.nextPres();
    }, 2600);
  }
  finish(w, why) { const S = this.S; S.ph = 'over'; S.win = w; S.why = why; S.roles = this.roles.slice(); S.step = 'over'; this.untimer(); this.log(why); this.commit(); }
  pdisc(k) { const S = this.S; if (!this.hand || !(k >= 0 && k < 3)) return; this.disc.push(this.hand.splice(k, 1)[0]); this.counts(); this.log(`📜 الرئيس أرسل قانونين إلى المستشار`); this.setStep('cdisc'); }
  cdisc(k) { const S = this.S; if (!this.hand || !(k >= 0 && k < 2)) return; this.disc.push(this.hand.splice(k, 1)[0]); this.enact(this.hand[0], false); }
  power(i, tgt) {
    const S = this.S, pw = S.power, s = S.seats[tgt];
    if (pw === 'peek') { this.peekC = null; this.log(`👁️ ${S.seats[i].n} اطّلع على القوانين الثلاثة التالية`); return this.nextPres(); }
    if (!s || s.dead || tgt === i) return;
    if (pw === 'inv') { if (S.invd.includes(tgt)) return; S.invd.push(tgt); (this.invRes[i] = this.invRes[i] || []).push([tgt, this.roles[tgt] === 'L' ? 'L' : 'F']); this.log(`🔍 ${S.seats[i].n} حقّق في ولاء ${s.n}`); return this.nextPres(); }
    if (pw === 'spec') { S.spec = tgt; this.log(`🗳️ ${S.seats[i].n} اختار ${s.n} رئيساً في انتخابات خاصة`); return this.nextPres(); }
    if (pw === 'kill') {
      s.dead = 1; this.log(`💀 أُعدم ${s.n}`);
      if (this.roles[tgt] === 'H') return this.finish('L', `💀 أُعدم هتلر (${s.n}) — فاز الليبراليون!`);
      if (S.lastC === tgt) S.lastC = -1; if (S.lastP === tgt) S.lastP = -1;
      return this.nextPres();
    }
  }
  handle(p, a) {
    const S = this.S, i = S.seats.findIndex(s => s.p === p), s = S.seats[i];
    if (S.ph !== 'play') { if (p === this.hostP && (a.t === 'go' || a.t === 'again')) { S.ph = 'wait'; this.start(); } if (a.t === 'chat' && s) this.chat(i, a.v); return; }
    if (i < 0) return;
    if (a.t === 'chat') return this.chat(i, a.v);
    if (s.dead) return;
    const v = Math.floor(+a.v);
    if (a.t === 'nom' && S.step === 'nominate' && i === S.pres) return this.nominate(v);
    if (a.t === 'vote' && S.step === 'vote') return this.vote(i, a.v === 1 || a.v === true);
    if (a.t === 'disc' && S.step === 'pdisc' && i === S.pres) return this.pdisc(v);
    if (a.t === 'disc' && S.step === 'cdisc' && i === S.chan) return this.cdisc(v);
    if (a.t === 'veto' && S.step === 'cdisc' && i === S.chan && S.fas >= 5 && !S.vetoNo) { this.log(`✋ المستشار ${s.n} يقترح الفيتو`); return this.setStep('veto'); }
    if (a.t === 'vetoAns' && S.step === 'veto' && i === S.pres) {
      if (a.v === 1) { this.disc.push(...this.hand); this.hand = null; this.counts(); this.log('✋ وافق الرئيس على الفيتو — أُلغي القانونان'); S.track++; if (S.track >= 3) return this.chaos(); return this.nextPres(); }
      S.vetoNo = 1; this.log('❌ رفض الرئيس الفيتو — على المستشار تمرير قانون'); return this.setStep('cdisc');
    }
    if (a.t === 'pow' && S.step === 'power' && i === S.pres) return this.power(i, v);
  }
  chat(i, txt) { const S = this.S, now = Date.now(); const t = shClean(txt); if (!t || now - (this.chatAt[i] || 0) < 900) return; this.chatAt[i] = now; S.chat.push([i, t]); if (S.chat.length > 7) S.chat.shift(); this.commit(); }
  /* ---------- bots / auto ---------- */
  schedBots() {
    const S = this.S; if (S.ph !== 'play') return; const acts = [];
    if (S.step === 'vote') S.seats.forEach((s, i) => { if (!s.dead && !S.voted[i] && this.auto(i)) acts.push(i); });
    else if (['nominate', 'pdisc', 'veto', 'power'].includes(S.step) && this.auto(S.pres)) acts.push(S.pres);
    else if (S.step === 'cdisc' && this.auto(S.chan)) acts.push(S.chan);
    acts.forEach(i => { const tok = S.step + ':' + S.round + ':' + S.cid + ':' + S.pres + ':' + S.chan + ':' + S.track + ':' + i; if (this.botPending[i] === tok) return; this.botPending[i] = tok; this.later(() => { if (this.botPending[i] === tok) { delete this.botPending[i]; this.botAct(i); } }, 1200 + Math.random() * 2200); });
  }
  isF(i) { return this.roles[i] !== 'L'; }
  botAct(i) {
    const S = this.S; if (S.ph !== 'play') return; const s = S.seats[i]; if (!s || s.dead) return; const r = Math.random(), me = this.roles[i];
    if (S.step === 'nominate' && i === S.pres) { const el = S.seats.map((_, k) => k).filter(k => this.eligible(k)); if (!el.length) return; let pick = el[Math.floor(r * el.length)]; if (me !== 'L') { const mates = el.filter(k => this.isF(k)); const h = el.find(k => this.roles[k] === 'H'); if (S.fas >= 3 && h !== undefined) pick = h; else if (mates.length && Math.random() < .6) pick = mates[0]; } return this.nominate(pick); }
    if (S.step === 'vote' && !S.voted[i]) { let ja; const gov = [S.pres, S.chan]; if (me === 'L') ja = Math.random() < (S.track >= 2 ? .85 : .62); else ja = gov.some(k => this.isF(k)) ? Math.random() < .9 : Math.random() < .45; if (me !== 'L' && S.fas >= 3 && this.roles[S.chan] === 'H') ja = true; return this.vote(i, ja); }
    if (S.step === 'pdisc' && i === S.pres && this.hand) { const want = me === 'L' ? 'F' : (Math.random() < .75 ? 'L' : 'F'); let k = this.hand.indexOf(want); if (k < 0) k = 0; return this.pdisc(k); }
    if (S.step === 'cdisc' && i === S.chan && this.hand) { if (S.fas >= 5 && !S.vetoNo && me === 'L' && this.hand.every(c => c === 'F') && Math.random() < .7) return this.handle(s.p, { t: 'veto' }); const want = me === 'L' ? 'F' : (Math.random() < .8 ? 'L' : 'F'); let k = this.hand.indexOf(want); if (k < 0) k = 0; return this.cdisc(k); }
    if (S.step === 'veto' && i === S.pres) return this.handle(s.p, { t: 'vetoAns', v: me === 'L' ? 1 : (Math.random() < .3 ? 1 : 0) });
    if (S.step === 'power' && i === S.pres) {
      if (S.power === 'peek') return this.power(i, -1);
      let c = S.seats.map((_, k) => k).filter(k => k !== i && !S.seats[k].dead && !(S.power === 'inv' && S.invd.includes(k)));
      if (me !== 'L' && S.power === 'kill') { const nonMates = c.filter(k => !this.isF(k)); if (nonMates.length) c = nonMates; }
      if (!c.length) return this.nextPres();
      return this.power(i, c[Math.floor(Math.random() * c.length)]);
    }
  }
  tick() {
    const S = this.S; if (S.ph !== 'play' || !S.end || Date.now() < S.end) return; this.untimer();
    if (S.step === 'vote') { S.seats.forEach((s, i) => { if (!s.dead && !S.voted[i]) { this.votes[i] = false; S.voted[i] = 1; } }); this.log('⏱️ انتهى الوقت — من لم يصوّت احتُسب «لا»'); this.checkVote(); return; }
    const actor = S.step === 'cdisc' ? S.chan : S.pres; this.log('⏱️ انتهى الوقت — اختيار تلقائي'); this.botAct(actor);
  }
}

/* ---------------- view ---------------- */
const SHV = { sel: -1, reveal: false, enactId: 0, voteShown: '', settled: '', chatDraft: '', introRound: null };
const shMe = S => S ? S.seats.findIndex(s => s.p === APP.myPeer) : -1;
function shPolicy(c, cls) { const e = el('div', 'shpol ' + (c === 'L' ? 'lib' : 'fas') + (cls ? ' ' + cls : '')); e.innerHTML = c === 'L' ? '<span>🕊️</span><b>ليبرالي</b><i>قانون</i>' : '<span>☠️</span><b>فاشي</b><i>قانون</i>'; return e; }
function shRoleCard(role) { const e = el('div', 'shrole r-' + role); e.innerHTML = { L: '<div class="ri">🕊️</div><b>ليبرالي</b><small>ابحث عن الفاشيين وأوقفهم</small>', F: '<div class="ri">☠️</div><b>فاشي</b><small>ساعد هتلر سراً على الوصول للحكم</small>', H: '<div class="ri">🎩</div><b>هتلر</b><small>اكسب ثقة الليبراليين ولا تنكشف</small>' }[role]; return e; }
GAMES.sh = {
  key: 'sh', title: 'سيكرت هتلر', Engine: SHEngine, hidden: true, hudIcon: '🎭',
  soloIcon: '🤖', soloLabel: 'مع لاعبين آليين', soloDesc: 'جرّب اللعبة مع 4 إلى 9 لاعبين آليين', hostDesc: 'من 5 إلى 10 لاعبين، ويمكن إكمال العدد بلاعبين آليين',
  cfg: [
    { k: 'turn', label: '⏱️ وقت كل خطوة', d: 60, lo: 0, hi: 600, opts: [30, 45, 60, 90, 120, 180, 0], fmt: v => v ? (v >= 60 ? (v / 60) + ' دقيقة' : v + ' ثانية') : 'بدون حد' },
    { k: 'bots', label: '🤖 عدد اللاعبين الآليين', d: 6, lo: 0, hi: 9, opts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fmt: v => v ? v : 'بدون' },
  ],
  rules: `<h4>📜 القوانين</h4><ul>
    <li>تُوزَّع الأدوار سراً: <b>ليبراليون</b> (الأغلبية)، و<b>فاشيون</b>، وبينهم <b>هتلر</b>. الفاشيون يعرفون بعضهم، والليبراليون لا يعرفون أحداً.</li>
    <li>في كل جولة يرشّح <b>الرئيس</b> لاعباً ليكون <b>مستشاراً</b>، ويصوّت الجميع «نعم» أو «لا».</li>
    <li>إذا نجحت الحكومة: يسحب الرئيس 3 قوانين ويحذف واحداً سراً، ثم يحذف المستشار واحداً ويمرّر الأخير.</li>
    <li>القوانين الفاشية تمنح الرئيس صلاحيات خطيرة: كشف القوانين، والتحقيق في الولاء، وانتخابات خاصة، والإعدام.</li>
    <li>🕊️ <b>يفوز الليبراليون</b> بتمرير 5 قوانين ليبرالية أو بإعدام هتلر.</li>
    <li>☠️ <b>يفوز الفاشيون</b> بتمرير 6 قوانين فاشية، أو بانتخاب هتلر مستشاراً بعد 3 قوانين فاشية.</li>
    <li>3 حكومات فاشلة متتالية تجعل الشعب يمرّر القانون التالي تلقائياً. وبعد 5 قوانين فاشية يصبح الفيتو متاحاً.</li>
    <li>تحدّثوا واتّهموا وادافعوا عن أنفسكم: الكذب جزء من اللعبة! 🎭</li>
    <li style="opacity:.7;font-size:12px">القوانين مأخوذة من لعبة Secret Hitler لـ Goat, Wolf, & Cabbage، والمرخّصة تحت CC BY-NC-SA 4.0.</li></ul>`,
  reset() { $('#shSeats').innerHTML = ''; $('#shChat').innerHTML = ''; SHV.sel = -1; SHV.reveal = false; },
  busy(S) { return S.ph === 'play' && shMe(S) >= 0; },
  hud(S) { const i = shMe(S); if (i < 0) return null; const s = S.seats[i]; return s.dead ? '💀 ميت' : (i === S.pres ? '🎩 رئيس' : i === S.chan ? '🏛️ مستشار' : 'مواطن'); },
  localKey() { return SHV.sel + '|' + SHV.reveal; },
  onState(prev, S) {
    const me = shMe(S);
    if (prev && S.round !== prev.round) { SHV.sel = -1; }
    if (prev && S.step !== prev.step) { SHV.sel = -1; if ((S.step === 'nominate' && S.pres === me) || (S.step === 'vote') || (S.step === 'pdisc' && S.pres === me) || (S.step === 'cdisc' && S.chan === me) || (S.step === 'power' && S.pres === me)) sfx('turn'); }
    if (S.enact && SHV.enactId !== S.enact.id) { const first = SHV.enactId === 0 && !prev; SHV.enactId = S.enact.id; if (!first) { banner(S.enact.c === 'L' ? '🕊️ قانون ليبرالي' : '☠️ قانون فاشي', S.enact.c === 'L' ? 'bluet' : 'redt'); sfx(S.enact.c === 'L' ? 'win' : 'lose'); } }
    if (S.vres && prev && !prev.vres) sfx('flip');
    if (S.ph === 'over') { const key = APP.code + ':' + S.round; if (SHV.settled !== key) { SHV.settled = key; setTimeout(() => { banner(S.win === 'L' ? '🕊️ فاز الليبراليون' : '☠️ فاز الفاشيون', S.win === 'L' ? 'bluet' : 'redt'); const my = S.roles && me >= 0 ? S.roles[me] : null; const won = my && ((S.win === 'L') === (my === 'L')); sfx(won ? 'bj' : 'lose'); }, 300); } }
  },
  render(S, priv) {
    if (!S) { timerMsg($('#shMsg'), '⏳ بانتظار المضيف...', '', false); return; }
    const me = shMe(S), n = S.seats.length, pw = S.pw && S.pw.length ? S.pw : shPowers(Math.max(5, n));
    // tracks
    const lt = $('#shLib'), ft = $('#shFas');
    const lk = S.lib + '', fk = S.fas + '|' + pw.join(',');
    if (lt.dataset.k !== lk) { lt.dataset.k = lk; lt.innerHTML = ''; for (let k = 0; k < 5; k++) { const sl = el('div', 'slot' + (k === 4 ? ' win' : '')); if (k < S.lib) sl.appendChild(shPolicy('L', k === S.lib - 1 ? 'new' : '')); else sl.innerHTML = k === 4 ? '<em>🏆</em>' : ''; lt.appendChild(sl); } }
    if (ft.dataset.k !== fk) { ft.dataset.k = fk; ft.innerHTML = ''; for (let k = 0; k < 6; k++) { const sl = el('div', 'slot' + (k === 5 ? ' win' : '') + (k >= 3 ? ' danger' : '')); if (k < S.fas) sl.appendChild(shPolicy('F', k === S.fas - 1 ? 'new' : '')); else sl.innerHTML = k === 5 ? '<em>☠️</em>' : (pw[k] ? `<em title="${SH_POW_NAME[pw[k]]}">${SH_POW_ICON[pw[k]]}</em>` : '') + (k === 4 ? '<small>فيتو</small>' : ''); ft.appendChild(sl); } }
    $('#shTrack').innerHTML = '<span>تعثّر الانتخابات</span>' + [0, 1, 2].map(k => `<i class="${k < S.track ? 'on' : ''}"></i>`).join('') + `<span class="piles">📚 ${S.deckN} • 🗑️ ${S.discN}</span>`;
    $('#shHitlerZone').classList.toggle('on', S.fas >= 3 && S.ph === 'play');
    // seats
    const box = $('#shSeats'), keep = new Set(), mates = {}; (priv && priv.mates || []).forEach(([k, r]) => mates[k] = r); const invs = {}; (priv && priv.inv || []).forEach(([k, r]) => invs[k] = r);
    const canPick = (S.step === 'nominate' && S.pres === me) || (S.step === 'power' && S.pres === me && S.power !== 'peek');
    S.seats.forEach((s, i) => {
      keep.add(s.p); let e = SEATS.get(s.p);
      if (!e) { e = el('div', 'shs', '<div class="emo"></div><div class="net"></div><div class="plac"></div><div class="av"></div><div class="nm"></div><div class="tag"></div><div class="ballot"></div>'); box.appendChild(e); SEATS.set(s.p, e); }
      if (e.parentNode !== box) box.appendChild(e); e.style.order = i;
      e.querySelector('.av').textContent = s.dead ? '💀' : s.a; e.querySelector('.nm').textContent = i === me ? s.n + ' (أنت)' : s.n;
      const isP = S.ph === 'play' && i === S.pres, isC = S.ph === 'play' && i === S.chan && ['vote', 'result', 'pdisc', 'cdisc', 'veto', 'enacted', 'power'].includes(S.step);
      const pl = e.querySelector('.plac'); pl.className = 'plac' + (isP ? ' pres' : isC ? ' chan' : ''); pl.textContent = isP ? '🎩 الرئيس' : isC ? (S.step === 'vote' || S.step === 'result' ? '🏛️ مرشّح' : '🏛️ المستشار') : '';
      let tag = ''; const rr = S.roles ? S.roles[i] : (mates[i] || null);
      if (rr) tag = rr === 'H' ? '🎩 هتلر' : rr === 'F' ? '☠️ فاشي' : '🕊️ ليبرالي';
      else if (invs[i]) tag = invs[i] === 'L' ? '🔍 ليبرالي' : '🔍 فاشي';
      if (!tag && S.ph === 'play' && (i === S.lastP || i === S.lastC) && !isP && !isC) tag = '⏸️ ممنوع من الترشح';
      if (s.kicked) tag = 'طُرد'; else if (s.out && !s.bot) tag = (tag ? tag + ' • ' : '') + 'غادر (آلي)';
      const tg = e.querySelector('.tag'); tg.textContent = tag; tg.className = 'tag' + (rr ? ' r-' + rr : invs[i] ? ' r-' + invs[i] : '');
      const bl = e.querySelector('.ballot'); if (S.vres && S.vres[i] !== null && S.vres[i] !== undefined) { bl.className = 'ballot show ' + (S.vres[i] ? 'ja' : 'nein'); bl.textContent = S.vres[i] ? 'نعم' : 'لا'; } else if (S.step === 'vote' && S.voted[i]) { bl.className = 'ballot voted'; bl.textContent = '✉️'; } else { bl.className = 'ballot'; bl.textContent = ''; }
      const pickable = canPick && !s.dead && i !== me && (S.step === 'nominate' ? APP.eng ? APP.eng.eligible(i) : shEligibleLocal(S, i) : !(S.power === 'inv' && S.invd.includes(i)));
      e.classList.toggle('dead', !!s.dead); e.classList.toggle('me', i === me); e.classList.toggle('pick', pickable); e.classList.toggle('sel', SHV.sel === i); e.classList.toggle('mate', !!mates[i] || (S.roles && S.roles[i] !== 'L'));
      e.onclick = pickable ? () => { SHV.sel = SHV.sel === i ? -1 : i; sfx('pop'); renderGame(); } : null;
    });
    for (const [p, e] of SEATS) if (!keep.has(p)) { e.remove(); SEATS.delete(p); }
    // legislative / peek hand
    const hz = $('#shHand'); let cards = null, mode = '';
    if (priv && priv.hand && ((S.step === 'pdisc' && me === S.pres) || (S.step === 'cdisc' && me === S.chan) || (S.step === 'veto' && me === S.chan))) { cards = priv.hand; mode = S.step === 'veto' ? 'view' : 'disc'; }
    else if (priv && priv.peek && S.step === 'power' && me === S.pres) { cards = priv.peek; mode = 'view'; }
    const hk = cards ? cards.join('') + mode + S.step + S.cid : '';
    if (hz.dataset.k !== hk) { hz.dataset.k = hk; hz.innerHTML = ''; hz.classList.toggle('on', !!cards);
      if (cards) { const t = el('div', 'hh'); t.textContent = mode === 'disc' ? (S.step === 'pdisc' ? '🎩 اختر قانوناً لتحذفه سراً — يذهب الباقيان للمستشار' : '🏛️ اختر قانوناً لتحذفه — يُمرَّر الآخر') : (S.step === 'veto' ? 'بانتظار قرار الرئيس بشأن الفيتو...' : '👁️ هذه هي القوانين الثلاثة التالية (بالترتيب)'); hz.appendChild(t); const row = el('div', 'hrow');
        cards.forEach((c, k) => { const pc = shPolicy(c, 'big'); pc.style.animationDelay = (k * 120) + 'ms'; if (mode === 'disc') { pc.classList.add('can'); pc.onclick = () => { if (APP.pendingV !== null) return; pc.classList.add('gone'); sfx('flip'); setTimeout(() => myAct({ t: 'disc', v: k }), 250); }; } row.appendChild(pc); }); hz.appendChild(row); } }
    // chat
    const ch = $('#shChat'), ck = (S.chat || []).map(c => c.join(':')).join('|');
    if (ch.dataset.k !== ck) { ch.dataset.k = ck; ch.innerHTML = ''; (S.chat || []).forEach(([i, t]) => { const s = S.seats[i]; const d = el('div', 'cm' + (i === me ? ' mine' : '')); const a = el('b'); a.textContent = (s ? s.a + ' ' + s.n : '') + ': '; d.append(a, document.createTextNode(t)); ch.appendChild(d); }); ch.scrollTop = ch.scrollHeight; }
    $('#shChatBox').style.display = APP.mode === 'multi' && me >= 0 ? '' : 'none';
    // log
    const lg = $('#shLog'), lk2 = S.log.join('\n'); if (lg.dataset.k !== lk2) { lg.dataset.k = lk2; lg.innerHTML = ''; S.log.slice().reverse().forEach((t, i) => { const d = el('div', i === 0 ? 'new' : ''); d.textContent = t; lg.appendChild(d); }); }
    // role intro
    if (S.ph === 'play' && priv && priv.role && SHV.introRound !== APP.code + S.round) { SHV.introRound = APP.code + S.round; shIntro(priv, S); }
    this.tick(S);
  },
  tick(S) {
    const tl = timeLeft(), me = shMe(S); let m1 = '', m2 = '', bar = false; const P = S.seats[S.pres], C = S.seats[S.chan];
    if (S.ph === 'wait') { m1 = 'بانتظار اكتمال اللاعبين'; m2 = S.seats.length < 5 ? `${S.seats.length}/5 — يلزم 5 لاعبين على الأقل` : `${S.seats.length} لاعبين — المضيف يبدأ اللعبة`; }
    else if (S.ph === 'over') { m1 = S.why; m2 = 'كُشفت كل الأدوار'; }
    else {
      const M = { nominate: me === S.pres ? '🎩 أنت الرئيس: اختر مستشاراً' : `🎩 ${P.n} يختار مستشاراً`, vote: `🗳️ صوّتوا على حكومة ${P.n} و${C ? C.n : ''}`, result: '🗳️ نتيجة التصويت', pdisc: me === S.pres ? '🎩 احذف قانوناً واحداً' : `🎩 الرئيس ${P.n} يختار القوانين...`, cdisc: me === S.chan ? '🏛️ احذف قانوناً ومرّر الآخر' : `🏛️ المستشار ${C ? C.n : ''} يقرّر...`, veto: me === S.pres ? '✋ المستشار يطلب الفيتو — هل توافق؟' : '✋ طُلب الفيتو...', enacted: S.enact && S.enact.c === 'L' ? '🕊️ مُرّر قانون ليبرالي' : '☠️ مُرّر قانون فاشي', power: me === S.pres ? `${SH_POW_ICON[S.power]} صلاحيتك: ${SH_POW_NAME[S.power]}` : `${SH_POW_ICON[S.power]} الرئيس يستخدم صلاحية: ${SH_POW_NAME[S.power]}` };
      m1 = M[S.step] || ''; if (S.step === 'vote') { const left = S.seats.filter((s, i) => !s.dead && !S.voted[i]).length; m2 = `بقي ${left} لم يصوّتوا`; } if (S.end) { m2 = (m2 ? m2 + ' — ' : '') + Math.ceil(tl / 1000) + ' ث'; bar = true; }
    }
    timerMsg($('#shMsg'), m1, m2, bar);
  },
  controls(box, S, priv, pending) {
    const me = shMe(S), row = el('div', 'crow'); box.appendChild(row); const B = (t, c, f, d) => mkBtn(row, t, c, f, d, pending);
    if (S.ph === 'wait') { row.appendChild(el('div', 'status', APP.eng ? (S.seats.length < 5 ? `يلزم ${5 - S.seats.length} لاعبين إضافيين — ادعُ أصدقاءك أو أضف لاعبين آليين من ⚙️` : 'الجميع جاهز؟') : 'بانتظار المضيف...')); if (APP.eng) B('ابدأ اللعبة 🎭', 'gold', () => myAct({ t: 'go' }), S.seats.length < 5 || S.seats.length > 10); return; }
    if (S.ph === 'over') { row.appendChild(el('div', 'status', S.why)); if (APP.eng) B('لعبة جديدة ▶', 'green', () => myAct({ t: 'again' })); return; }
    if (me < 0) { row.appendChild(el('div', 'status', '👀 أنت تشاهد')); return; }
    // role peek (hold)
    if (priv && priv.role) { const rb = el('button', 'btn ghost sm rolebtn', SHV.reveal ? `دورك: ${SH_ROLE_NAME[priv.role]}` : '🔒 اضغط مطوّلاً لرؤية دورك'); const on = () => { SHV.reveal = true; rb.textContent = `دورك: ${SH_ROLE_NAME[priv.role]} ${priv.role === 'L' ? '🕊️' : priv.role === 'H' ? '🎩' : '☠️'}`; rb.classList.add('r-' + priv.role); }, off = () => { SHV.reveal = false; rb.textContent = '🔒 اضغط مطوّلاً لرؤية دورك'; rb.classList.remove('r-L', 'r-F', 'r-H'); }; rb.onpointerdown = on; rb.onpointerup = off; rb.onpointerleave = off; row.appendChild(rb); }
    const s = S.seats[me];
    if (s.dead) { row.appendChild(el('div', 'status', '💀 أنت ميت — لا يمكنك الكلام عن دورك، تابع بصمت')); return; }
    if (S.step === 'nominate' && me === S.pres) { const t = S.seats[SHV.sel]; if (t) B(`🏛️ رشّح ${t.n} مستشاراً`, 'gold', () => myAct({ t: 'nom', v: SHV.sel })); else row.appendChild(el('div', 'status', 'اضغط على لاعب لترشيحه')); return; }
    if (S.step === 'vote') { if (S.voted[me]) row.appendChild(el('div', 'status', '✉️ صوّتّ — بانتظار الباقين')); else { const ja = el('button', 'btn vote ja', '<b>نعم</b><small>Ja!</small>'), ne = el('button', 'btn vote nein', '<b>لا</b><small>Nein</small>'); ja.disabled = ne.disabled = pending; ja.onclick = () => { myAct({ t: 'vote', v: 1 }); sfx('pop'); }; ne.onclick = () => { myAct({ t: 'vote', v: 0 }); sfx('pop'); }; row.append(ja, ne); } return; }
    if (S.step === 'cdisc' && me === S.chan) { row.appendChild(el('div', 'status', 'اختر من البطاقات في الأعلى')); if (S.fas >= 5 && !S.vetoNo) B('✋ اقترح الفيتو', 'purple sm', () => myAct({ t: 'veto' })); return; }
    if (S.step === 'veto' && me === S.pres) { B('✋ وافق على الفيتو', 'blue', () => myAct({ t: 'vetoAns', v: 1 })); B('❌ ارفض', 'red', () => myAct({ t: 'vetoAns', v: 0 })); return; }
    if (S.step === 'power' && me === S.pres) {
      if (S.power === 'peek') { B('👁️ تم — أكمل', 'gold', () => myAct({ t: 'pow', v: -1 })); return; }
      const t = S.seats[SHV.sel]; if (t) B(`${SH_POW_ICON[S.power]} ${S.power === 'kill' ? 'أعدم' : S.power === 'inv' ? 'حقّق في' : 'اختر رئيساً:'} ${t.n}`, S.power === 'kill' ? 'red' : 'gold', () => myAct({ t: 'pow', v: SHV.sel })); else row.appendChild(el('div', 'status', 'اضغط على لاعب'));
      return;
    }
    if (S.step === 'pdisc' && me === S.pres) { row.appendChild(el('div', 'status', 'اختر من البطاقات في الأعلى')); return; }
    row.appendChild(el('div', 'status', 'ناقشوا، واتّهموا، ودافعوا عن أنفسكم... 🎭'));
  }
};
function shEligibleLocal(S, i) { const s = S.seats[i]; if (!s || s.dead || i === S.pres || i === S.lastC) return false; if (S.seats.filter(x => !x.dead).length > 5 && i === S.lastP) return false; return true; }
function shIntro(priv, S) {
  const mates = (priv.mates || []).map(([k, r]) => `${S.seats[k].bot ? "" : S.seats[k].a + " "}${S.seats[k].n} (${SH_ROLE_NAME[r]})`);
  modal(`<div class="shintro"><h3>🎭 دورك السري</h3><div id="shRoleSlot"></div>${priv.role !== 'L' ? `<p class="mates">${priv.role === 'H' ? (mates.length ? 'زملاؤك الفاشيون: ' : 'لا تعرف من هم الفاشيون — هم يعرفونك') : 'فريقك: '}${mates.join('، ')}</p>` : '<p>أنت لا تعرف أحداً... كن حذراً!</p>'}<p class="hint">لا تُظهر شاشتك لأحد 🤫 — يمكنك رؤية دورك لاحقاً بالضغط المطوّل على الزر أسفل الشاشة.</p></div><div class="mbtns"><button class="btn gold" id="shOk">فهمت</button></div>`, b => { b.querySelector('#shRoleSlot').appendChild(shRoleCard(priv.role)); b.querySelector('#shOk').onclick = closeModal; sfx('flip'); });
}
