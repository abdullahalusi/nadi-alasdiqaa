/* ================== THEMES ================== */
const THEME_SYMS = { menu: ['♠', '♥', '♦', '♣'], bj: ['♠', '21', '♥', '♣', '♦', 'A'], pk: ['♠', '♦', '♣', '♥', 'K', '🂡'], rl: ['0', '17', '32', '7', '36', '◉'], dm: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'], cn: ['🕵️', '🔍', '❓', '💀', 'A', '؟'], bg: ['🌴', '🏠', '🎲', '🏢', '🚌', '💰'], sh: ['🗳️', '📜', '🎭', '🕯️', '⚖️', '🔍'] };
const THEME_COLS = { menu: ['#ffffff', '#ff5a6a'], bj: ['#bfffd9', '#ff8a9a'], pk: ['#ffd479', '#ff4d6a'], rl: ['#ffd479', '#9fc0ff'], dm: ['#fff1d6', '#ffcf8a'], cn: ['#ff6b6b', '#6fb3ff'], bg: ['#ffd479', '#9fe3d0'], sh: ['#ff6b5b', '#8fb8ff'] };
function setTheme(t) {
  if (document.body.dataset.theme === t) return;
  document.body.dataset.theme = t;
  const b = $('#bgsuits'); b.innerHTML = ''; const syms = THEME_SYMS[t] || THEME_SYMS.menu, cols = THEME_COLS[t] || THEME_COLS.menu;
  for (let i = 0; i < 16; i++) { const e = el('span'); e.textContent = syms[i % syms.length]; e.style.left = (Math.random() * 100) + '%'; e.style.animationDelay = (-Math.random() * 18) + 's'; e.style.animationDuration = (14 + Math.random() * 12) + 's'; e.style.fontSize = (36 + Math.random() * 60) + 'px'; e.style.color = cols[i % 2]; b.appendChild(e); }
}

/* ================== GAME REGISTRY & CONFIG ================== */
const GAMES = {};
const GAME_KEYS = ['bj', 'pk', 'rl', 'dm', 'cn', 'bg', 'sh'];
const CODE_RE = /^(bj|pk|rl|dm|cn|bg|sh)-[a-z0-9]{3,12}$/;
function cfgDefault(g) { const o = {}; GAMES[g].cfg.forEach(f => o[f.k] = f.d); return o; }
function cfgClean(g, c) { c = c || {}; const o = {}; GAMES[g].cfg.forEach(f => { let v = Math.floor(+c[f.k]); if (!isFinite(v)) v = f.d; o[f.k] = Math.min(f.hi, Math.max(f.lo, v)); }); return o; }
function buildCfgFields(box, g, cfg, onChange) {
  box.innerHTML = GAMES[g].cfg.map(f => {
    if (f.opts) { const opts = [...f.opts]; if (!opts.includes(cfg[f.k])) opts.unshift(cfg[f.k]); return `<label>${f.label}<select data-k="${f.k}">${opts.map(v => `<option value="${v}"${v === cfg[f.k] ? ' selected' : ''}>${f.fmt ? f.fmt(v) : fmt(v)}</option>`).join('')}</select></label>`; }
    return `<label>${f.label}<input data-k="${f.k}" type="number" min="${f.lo}" max="${f.hi}" step="${f.step || 1}" value="${cfg[f.k]}"></label>`;
  }).join('');
  const read = () => { const c = {}; box.querySelectorAll('[data-k]').forEach(i => c[i.dataset.k] = +i.value); return cfgClean(g, c); };
  if (onChange) box.querySelectorAll('[data-k]').forEach(i => i.addEventListener('change', () => onChange(read())));
  return read;
}
const secs = v => v ? v + ' ثانية' : 'بدون حد';
const BOT_NAMES = ['سامي', 'ليلى', 'فهد', 'نور', 'ريم', 'زياد'];

/* ================== BASE ENGINE (host / solo) ================== */
class BaseEngine {
  constructor(g, pub, hostP, round, cfg) {
    this.g = g; this.pub = pub; this.hostP = hostP; this.timers = []; this.players = {}; this.last = {}; this.bank = {}; this.botN = 0;
    this.cfg = cfgClean(g, cfg);
    this.S = { g, v: 0, t: 0, round: round || 1, seats: [], end: 0, dur: 0, wt: 0, cfg: this.cfg, ban: [], banBy: [] };
    this.iv = setInterval(() => { try { this.tick(); } catch (e) { console.error(e); } }, 300);
  }
  destroy() { clearInterval(this.iv); this.timers.forEach(clearTimeout); this.timers = []; }
  later(fn, ms) { const id = setTimeout(() => { this.timers = this.timers.filter(x => x !== id); try { fn(); } catch (e) { console.error(e); } }, ms); this.timers.push(id); }
  timer(ms) { this.S.end = Date.now() + ms; this.S.dur = ms; }
  untimer() { this.S.end = 0; this.S.dur = 0; }
  commit() { this.S.v++; this.S.t = Date.now(); this.pub(this.S); }
  banned(x) { return this.S.ban.includes(x.p) || (x.by && this.S.banBy.includes(x.by)); }
  filterPlayers(list) { list = list.filter(x => !this.banned(x)); this.players = {}; list.forEach(x => this.players[x.p] = x); return list; }
  updWatch(list) { const wt = list.filter(x => !this.S.seats.find(s => s.p === x.p)).length; if (wt !== this.S.wt) { this.S.wt = wt; return true; } return false; }
  markSeats() { let ch = false; for (const s of this.S.seats) { if (s.bot) continue; const x = this.players[s.p]; if (x) { if (s.n !== x.n || s.a !== x.a) { s.n = x.n; s.a = x.a; ch = true; } if (s.out && !s.kicked) { s.out = 0; ch = true; } } else if (!s.out) { s.out = 1; ch = true; } } return ch; }
  priv() { return null; }
  tick() {}
  setCfg(c) { this.cfg = cfgClean(this.g, c); this.S.cfg = this.cfg; if (this.onCfg) this.onCfg(); this.commit(); }
  setChips(p, v) { const s = this.S.seats.find(x => x.p === p); v = Math.max(0, Math.min(1e8, Math.floor(+v || 0))); this.bank[p] = v; if (!s) return; s.ch = v; if (this.onChips) this.onChips(s); this.commit(); }
  setAllChips(v) { v = Math.max(0, Math.min(1e8, Math.floor(+v || 0))); this.S.seats.forEach(s => { s.ch = v; this.bank[s.p] = v; if (this.onChips) this.onChips(s); }); this.commit(); }
  kick(p) {
    const S = this.S; if (p === this.hostP) return;
    const x = this.players[p]; S.ban.push(p); if (S.ban.length > 40) S.ban.shift(); if (x && x.by) { S.banBy.push(x.by); if (S.banBy.length > 40) S.banBy.shift(); }
    delete this.players[p];
    const i = S.seats.findIndex(s => s.p === p);
    if (!(this.onKick && this.onKick(p, i))) this.commit();
  }
  botSeat(extra) { const k = this.botN++; return Object.assign({ p: 'bot' + k, n: '🤖 ' + BOT_NAMES[k % BOT_NAMES.length], a: '🤖', bot: 1 }, extra); }
}

/* ================== APP STATE (memory only) ================== */
const APP = {
  screen: '', game: 'bj', roomNS: null, cfgs: {},
  mode: null, code: null, R: null, eng: null, myPeer: null, myBy: null, S: null, lastV: -1, localEnd: 0, localDur: 0,
  actN: 0, pendingV: null, pendingAt: 0, peers: [], hostPeer: null, waitTimer: null, emoSeen: {}, unsubs: [], hostSince: 0, lastHostPeer: null,
  priv: null, lastPvD: null, lastPvSent: ''
};
let P = null;
const SEATS = new Map(); // peer -> element with .emo / .net (for emotes & net popups)

/* ================== AUTH ================== */
let avSel = AVATARS[0];
function buildAvGrid() { const g = $('#avgrid'); g.innerHTML = ''; AVATARS.forEach(a => { const b = el('button', 'avopt' + (a === avSel ? ' sel' : '')); b.type = 'button'; b.textContent = a; b.onclick = () => { avSel = a; buildAvGrid(); sfx('pop'); }; g.appendChild(b); }); }
function openAuth(edit) {
  setTheme('menu');
  avSel = edit && P ? P.av : AVATARS[Math.floor(Math.random() * AVATARS.length)];
  $('#inName').value = edit && P ? P.name : '';
  $('#authTitle').textContent = edit ? 'تغيير الاسم' : 'ادخل باسمك';
  $('#authBtn').textContent = edit ? 'حفظ ✔' : 'ادخل ✨';
  $('#authCancelWrap').style.display = edit ? 'block' : 'none';
  buildAvGrid(); show('scr-auth'); setTimeout(() => $('#inName').focus(), 50);
}
$('#authForm').addEventListener('submit', e => {
  e.preventDefault(); const nm = cleanName($('#inName').value); if (!nm) { toast('اكتب اسمك أولاً'); return; }
  P = { name: nm, av: avSel };
  if (APP.R) APP.R.presence({ nm: P.name, av: P.av }).catch(() => {});
  goMenu(); maybeJoinFromHash();
});
$('#authCancel').onclick = () => goMenu();
$('#btnEdit').onclick = () => openAuth(true);

/* ================== MENU / LOBBY ================== */
function goMenu() { setTheme('menu'); $('#mAv').textContent = P.av; $('#mName').textContent = P.name; show('scr-menu'); }
GAME_KEYS.forEach(g => { const t = $('#tile-' + g); if (t) t.onclick = () => { sfx('pop'); openLobby(g); }; });
function openLobby(g) {
  APP.game = g; setTheme(g); const G = GAMES[g];
  $('#lobTitle').textContent = G.title;
  $('#mSolo').innerHTML = `<div class="mi">${G.soloIcon}</div><b>${G.soloLabel}</b><span>${G.soloDesc}</span>`;
  $('#mHost').innerHTML = `<div class="mi">🫂</div><b>أنشئ طاولة</b><span>${G.hostDesc}</span>`;
  APP.cfgs[g] = APP.cfgs[g] || cfgDefault(g);
  buildCfgFields($('#lobbySettings'), g, APP.cfgs[g], c => APP.cfgs[g] = c);
  $('#lobRules').innerHTML = G.rules; $('#joinCode').placeholder = g + '-xxxxx';
  show('scr-lobby');
}
$('#lobBack').onclick = () => goMenu();
$('#mSolo').onclick = () => startSolo(APP.game);
$('#mHost').onclick = () => { const code = APP.game + '-' + Math.random().toString(36).slice(2, 7); joinTable(code, true); };
$('#joinForm').addEventListener('submit', e => { e.preventDefault(); const c = $('#joinCode').value.trim().toLowerCase().replace(/^.*#/, ''); if (!CODE_RE.test(c)) { toast('الكود غير صحيح'); return; } joinTable(c, false); });

/* ================== CRYPTO (private cards/tiles) ================== */
const CRY = { kp: null, pub: null, keys: {}, ok: !!(window.crypto && crypto.subtle) };
const b64 = u8 => { let s = ''; u8.forEach(x => s += String.fromCharCode(x)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function cryInit() {
  if (CRY.pub) return; if (!CRY.ok) { CRY.pub = 'plain'; return; }
  try { CRY.kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']); const j = await crypto.subtle.exportKey('jwk', CRY.kp.publicKey); CRY.pub = j.x + '.' + j.y; }
  catch (e) { CRY.ok = false; CRY.pub = 'plain'; }
}
async function cryKey(pub) {
  if (CRY.keys[pub]) return CRY.keys[pub]; const [x, y] = pub.split('.');
  const pk = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return CRY.keys[pub] = await crypto.subtle.deriveKey({ name: 'ECDH', public: pk }, CRY.kp.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function cryEnc(peerPub, txt) {
  if (peerPub === 'plain' || CRY.pub === 'plain') return 'P' + btoa(unescape(encodeURIComponent(txt)));
  const k = await cryKey(peerPub); const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(txt)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return b64(out);
}
async function cryDec(hostPub, d) {
  if (d[0] === 'P') return decodeURIComponent(escape(atob(d.slice(1))));
  const k = await cryKey(hostPub); const u = unb64(d); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, k, u.slice(12)); return new TextDecoder().decode(pt);
}
let pvBusy = false, pvAgain = false; const pvCache = {};
async function schedulePv() {
  const E = APP.eng; if (!E || !APP.R || !GAMES[APP.game].hidden) return;
  if (pvBusy) { pvAgain = true; return; } pvBusy = true;
  try {
    await cryInit(); const out = [];
    for (const pr of APP.peers) {
      if (pr.sameTab) continue; const pp = pr.presence || {}; if (!pp.pk || !E.players[pr.peer]) continue;
      const d = E.priv(pr.peer); if (!d) continue; const j = JSON.stringify(d); const c = pvCache[pr.peer];
      if (c && c.j === j && c.pk === pp.pk) { out.push({ p: pr.peer, d: c.d }); continue; }
      const ct = await cryEnc(pp.pk, j); pvCache[pr.peer] = { j, pk: pp.pk, d: ct }; out.push({ p: pr.peer, d: ct });
    }
    const js = JSON.stringify(out);
    if (APP.R && APP.eng === E && js !== APP.lastPvSent) { APP.lastPvSent = js; APP.R.presence({ pv: out, pk: CRY.pub }).catch(() => {}); }
  } catch (e) { console.error(e); }
  pvBusy = false; if (pvAgain) { pvAgain = false; schedulePv(); }
}
async function clientPv(h) {
  const pv = h.presence.pv, hpk = h.presence.pk; if (!Array.isArray(pv) || !hpk) return;
  const mine = pv.find(x => x && x.p === APP.myPeer); if (!mine || mine.d === APP.lastPvD) return; APP.lastPvD = mine.d;
  try { await cryInit(); const j = await cryDec(hpk, mine.d); APP.priv = JSON.parse(j); renderGame(); } catch (e) { console.error(e); }
}
function getPriv() { if (APP.eng) return APP.eng.priv(APP.myPeer); return APP.priv; }

/* ================== TABLE SESSION ================== */
function resetSession() {
  if (APP.eng) APP.eng.destroy(); APP.eng = null;
  APP.unsubs.forEach(u => { try { u(); } catch (e) {} }); APP.unsubs = [];
  if (APP.R) { APP.R.leave().catch(() => {}); } APP.R = null;
  clearTimeout(APP.waitTimer);
  Object.assign(APP, { mode: null, code: null, myPeer: null, S: null, lastV: -1, localEnd: 0, pendingV: null, peers: [], hostPeer: null, emoSeen: {}, lastHostPeer: null, priv: null, lastPvD: null, lastPvSent: '' });
  GAME_KEYS.forEach(g => GAMES[g].reset && GAMES[g].reset()); SEATS.clear(); ctrlKey = '';
  for (const k in pvCache) delete pvCache[k];
}
function enterTable(g, title) {
  APP.game = g; setTheme(g);
  document.querySelectorAll('.stage').forEach(s => s.classList.toggle('on', s.id === 'st-' + g));
  $('#tblName').textContent = title; show('scr-table'); updSettingsBtn(); renderGame();
}
function updSettingsBtn() { $('#btnSettings').style.display = APP.eng ? '' : 'none'; }

function startSolo(g) {
  resetSession(); APP.mode = 'solo'; APP.myPeer = 'me'; APP.code = 'solo-' + Date.now();
  APP.eng = new GAMES[g].Engine(S => onState(S), 'me', 1, APP.cfgs[g] || cfgDefault(g), true);
  enterTable(g, GAMES[g].title + ' — فردي'); $('#btnInvite').style.display = 'none'; $('#peerbar').innerHTML = '';
  APP.eng.syncPlayers([{ p: 'me', n: P.name, a: P.av }]);
}

async function joinTable(code, asHost) {
  if (!P) { openAuth(false); return; }
  const g = code.split('-')[0];
  resetSession();
  if (!APP.roomNS) { try { APP.roomNS = (typeof claude !== 'undefined' && claude.use) ? await claude.use('room') : null; } catch (e) { APP.roomNS = null; } }
  if (!APP.roomNS) { modal(`<h3>اللعب الجماعي غير متاح هنا</h3><p>افتح اللعبة من رابطها على claude.ai وأنت مسجّل الدخول لتلعب مع أصدقائك. يمكنك اللعب الفردي الآن.</p><div class="mbtns"><button class="btn gold" id="mSoloGo">لعب فردي</button><button class="btn ghost" id="mx">إغلاق</button></div>`, b => { b.querySelector('#mSoloGo').onclick = () => { closeModal(); startSolo(g); }; b.querySelector('#mx').onclick = closeModal; }); return; }
  await cryInit();
  let R;
  try { R = await APP.roomNS.join(code); } catch (e) { toast('تعذّر الدخول إلى الطاولة، حاول مجدداً'); return; }
  APP.R = R; APP.mode = 'multi'; APP.code = code; APP.game = g;
  try { if (location.hash !== '#' + code) location.hash = code; } catch (e) {}
  R.presence({ app: 'fc', g, nm: P.name, av: P.av, since: Date.now(), pk: CRY.pub, host: null, st: null, pv: null, act: null, emo: null }).catch(() => {});
  enterTable(g, GAMES[g].title + ' — ' + code); $('#btnInvite').style.display = '';
  if (asHost) becomeHost(1);
  APP.unsubs.push(R.onPeers(ch => onPeers(ch.peers), () => {}));
  APP.unsubs.push(R.onConnection(c => { if (!c) setTimeout(() => { if (APP.R === R && !R.connected()) toast('⚠️ انقطع الاتصال... جارٍ إعادة المحاولة'); }, 2500); }, () => {}));
  if (asHost) setTimeout(() => showInvite(), 600);
  else APP.waitTimer = setTimeout(() => { if (!APP.hostPeer && !APP.eng && APP.R === R) noHostModal(false); }, 7000);
}

function hostPub(S) {
  if (APP.R) {
    const enc = new TextEncoder(), lim = GAMES[APP.game].hidden ? 3000 : 3700; let st = S, b = enc.encode(JSON.stringify(st)).length;
    while (b > lim && st.log && st.log.length > 1) { st = Object.assign({}, st, { log: st.log.slice(Math.ceil(st.log.length / 2)) }); b = enc.encode(JSON.stringify(st)).length; }
    if (b <= lim + 250) APP.R.presence({ st, host: 1 }).catch(() => {}); else console.warn('state too big', b);
    schedulePv();
  }
  onState(S);
}
function becomeHost(round, cfg) {
  if (APP.eng) return; closeModal();
  const g = APP.game;
  APP.eng = new GAMES[g].Engine(hostPub, APP.myPeer, round, cfg || APP.cfgs[g] || cfgDefault(g), false);
  APP.hostSince = Date.now(); APP.priv = null;
  if (APP.R) APP.R.presence({ host: 1, since: APP.hostSince, pk: CRY.pub }).catch(() => {});
  updSettingsBtn();
  if (APP.peers.length) onPeers(APP.peers);
}
function noHostModal(lost) {
  if (APP.eng || APP.screen !== 'scr-table') return;
  modal(`<h3>${lost ? 'غادر المضيف الطاولة 😕' : 'لا يوجد مضيف على هذه الطاولة'}</h3><p>${lost ? 'يمكنك أن تتولى إدارة الطاولة ليكمل الجميع اللعب (تبدأ اللعبة من جديد).' : 'ربما أغلق صاحب الطاولة الصفحة. يمكنك أن تصبح المضيف وتدعو أصدقاءك.'}</p><div class="mbtns"><button class="btn gold" id="mh">👑 كن المضيف</button><button class="btn ghost" id="mw">انتظر</button><button class="btn ghost" id="ml">خروج</button></div>`,
    b => { b.querySelector('#mh').onclick = () => { closeModal(); becomeHost((APP.S ? APP.S.round : 0) + 1, APP.S && APP.S.cfg); }; b.querySelector('#mw').onclick = closeModal; b.querySelector('#ml').onclick = () => { closeModal(); leaveTable(); }; });
}
function kickedOut() {
  const g = APP.game; resetSession(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  openLobby(g);
  modal(`<h3>🚫 تم إخراجك من الطاولة</h3><p>قام المضيف بطردك من هذه الطاولة.</p><div class="mbtns"><button class="btn ghost" id="kx">حسناً</button></div>`, b => b.querySelector('#kx').onclick = closeModal);
}

function onPeers(peers) {
  APP.peers = peers;
  const me = peers.find(p => p.sameTab); if (me) { APP.myPeer = me.peer; APP.myBy = me.by; if (APP.eng) APP.eng.hostP = me.peer; }
  const fc = peers.filter(p => p.presence && p.presence.app === 'fc' && p.presence.g === APP.game);
  const hosts = fc.filter(p => p.presence.host).sort((a, b) => (a.presence.since || 0) - (b.presence.since || 0));
  if (APP.eng) {
    const other = hosts.find(h => !h.sameTab);
    if (other && other.presence.st && (other.presence.since || 0) < APP.hostSince) { APP.eng.destroy(); APP.eng = null; updSettingsBtn(); APP.R.presence({ host: null, st: null, pv: null }).catch(() => {}); }
  }
  if (APP.eng) {
    const E = APP.eng;
    E.syncPlayers(fc.map(p => ({ p: p.peer, by: p.by, n: cleanName(p.presence.nm) || 'لاعب', a: AVATARS.includes(p.presence.av) ? p.presence.av : '🙂' })));
    for (const pr of fc) { if (pr.sameTab) continue; const a = pr.presence.act; if (a && typeof a.n === 'number' && a.n > (E.last[pr.peer] || 0)) { E.last[pr.peer] = a.n; if (a.r === E.S.round) { try { E.handle(pr.peer, a); } catch (e) { console.error(e); } } } }
    APP.hostPeer = APP.myPeer; schedulePv();
  } else {
    const h = hosts.find(h => h.presence.st);
    if (h) {
      APP.hostPeer = h.peer; clearTimeout(APP.waitTimer); if ($('#modal').classList.contains('on') && $('#mh')) closeModal();
      if (h.presence.st.v !== APP.lastV || h.peer !== APP.lastHostPeer) { APP.lastHostPeer = h.peer; onState(h.presence.st); }
      if (GAMES[APP.game].hidden) clientPv(h);
    } else if (APP.hostPeer) { APP.hostPeer = null; setTimeout(() => { if (!APP.hostPeer && !APP.eng) noHostModal(true); }, 2500); }
  }
  for (const pr of fc) { const e = pr.presence.emo; if (e && e.n && APP.emoSeen[pr.peer] !== e.n) { const stale = APP.emoSeen[pr.peer] === undefined && Date.now() - e.n > 4000; APP.emoSeen[pr.peer] = e.n; if (!stale) showEmo(pr.peer, e.e); } }
  renderPeerbar(fc);
}
function renderPeerbar(fc) {
  const pb = $('#peerbar'); pb.innerHTML = '';
  fc.slice(0, 8).forEach(p => { const d = el('div', 'pa' + ((p.presence.host && p.presence.st) || (p.sameTab && APP.eng) ? ' h' : '')); d.textContent = AVATARS.includes(p.presence.av) ? p.presence.av : '🙂'; d.title = cleanName(p.presence.nm); pb.appendChild(d); });
}
function leaveTable() { const g = APP.game; resetSession(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { try { location.hash = ''; } catch (_) {} } openLobby(g); }
$('#btnLeave').onclick = () => {
  const busy = GAMES[APP.game].busy && APP.S && GAMES[APP.game].busy(APP.S);
  const hostWarn = APP.eng && APP.mode === 'multi' ? 'أنت المضيف: إذا خرجت سيُعرض على الباقين أن يتولى أحدهم الإدارة.' : '';
  if (busy || hostWarn) { modal(`<h3>مغادرة الطاولة؟</h3><p>${busy ? 'أنت في منتصف جولة. ' : ''}${hostWarn}</p><div class="mbtns"><button class="btn red" id="ly">مغادرة</button><button class="btn ghost" id="ln">البقاء</button></div>`, b => { b.querySelector('#ly').onclick = () => { closeModal(); leaveTable(); }; b.querySelector('#ln').onclick = closeModal; }); }
  else leaveTable();
};
function copyText(txt, input) { try { navigator.clipboard.writeText(txt).then(() => toast('✔ تم النسخ'), fb); } catch (e) { fb(); } function fb() { if (input) input.select(); toast('انسخ النص يدوياً'); } }
function showInvite() {
  if (APP.mode !== 'multi') return;
  const link = GAME_URL ? GAME_URL + '#' + APP.code : '';
  modal(`<h3>🔗 ادعُ أصدقاءك</h3><p>أرسل لهم الرابط، أو اطلب منهم إدخال هذا الكود في «انضم إلى طاولة صديق»:</p><div class="codebig">${APP.code}</div>${link ? `<input class="linkbox" readonly value="${link}">` : ''}<div class="mbtns">${link ? '<button class="btn gold" id="cpL">نسخ الرابط</button>' : ''}<button class="btn ghost" id="cpC">نسخ الكود</button><button class="btn ghost" id="cx">تم</button></div>`,
    b => { if (link) b.querySelector('#cpL').onclick = () => copyText(link, b.querySelector('.linkbox')); b.querySelector('#cpC').onclick = () => copyText(APP.code); b.querySelector('#cx').onclick = closeModal; });
}
$('#btnInvite').onclick = showInvite;

/* ---- host settings panel (all games) ---- */
function openSettings() {
  const E = APP.eng; if (!E) return; const S = E.S, G = GAMES[APP.game];
  const seatRow = s => `<div class="plrow" data-p="${s.p}"><span style="font-size:22px">${s.a}</span><span class="pn"></span>${G.chips ? `<input type="number" min="0" step="5" value="${s.ch}"><button class="btn green sm" data-a="set">تعيين</button>` : (G.scores ? `<span class="hostbadge">⭐ ${fmt(s.sc || 0)}</span>` : '')}${s.p === E.hostP ? '<span class="hostbadge">👑 أنت</span>' : (s.bot ? '<span class="hostbadge">آلي</span>' : '<button class="btn red sm" data-a="kick">طرد</button>')}</div>`;
  const rows = S.seats.filter(s => !s.out).map(seatRow).join('');
  const watchers = Object.values(E.players).filter(x => !S.seats.find(s => s.p === x.p));
  const wrows = watchers.map(x => `<div class="plrow" data-p="${x.p}"><span style="font-size:22px">${x.a}</span><span class="pn"></span><span class="hostbadge">يشاهد</span><button class="btn red sm" data-a="kick">طرد</button></div>`).join('');
  modal(`<h3>⚙️ إعدادات ${G.title}</h3>
    <div class="sect">إعدادات اللعبة</div><div class="setgrid" id="tSet"></div>
    <div class="mbtns"><button class="btn gold sm" id="saveCfg">حفظ الإعدادات</button></div>
    <div class="sect">${G.chips ? 'نقود اللاعبين والطرد' : 'اللاعبون والطرد'}</div>
    <div class="plist">${rows || '<p>لا يوجد لاعبون بعد</p>'}${wrows}</div>
    ${G.chips ? `<div class="plrow" style="margin-top:10px"><span class="pn">تعيين نفس المبلغ للجميع</span><input type="number" min="0" step="5" id="allV" value="${E.cfg.start}"><button class="btn blue sm" id="setAll">للجميع</button></div>` : ''}
    ${G.scores ? `<div class="mbtns"><button class="btn blue sm" id="rstSc">تصفير النقاط</button></div>` : ''}
    <div class="note">كل شيء مؤقت ولا يُحفظ. اللاعب المطرود لا يستطيع العودة إلى هذه الطاولة.</div>
    <div class="mbtns"><button class="btn ghost" id="sx">إغلاق</button></div>`, b => {
    b.classList.add('wide');
    const read = buildCfgFields(b.querySelector('#tSet'), APP.game, E.cfg);
    b.querySelectorAll('.plrow[data-p]').forEach(r => { const p = r.dataset.p; const x = S.seats.find(s => s.p === p) || E.players[p]; r.querySelector('.pn').textContent = x ? x.n : ''; });
    b.querySelector('#saveCfg').onclick = () => { E.setCfg(read()); APP.cfgs[APP.game] = { ...E.cfg }; toast('✔ تم حفظ الإعدادات'); };
    b.querySelectorAll('[data-a="set"]').forEach(btn => btn.onclick = () => { const r = btn.closest('.plrow'); E.setChips(r.dataset.p, r.querySelector('input').value); toast('✔ تم تعيين النقود'); sfx('chip'); });
    b.querySelectorAll('[data-a="kick"]').forEach(btn => btn.onclick = () => { const r = btn.closest('.plrow'); const nm = r.querySelector('.pn').textContent; E.kick(r.dataset.p); r.remove(); toast('🚫 تم طرد ' + nm); });
    const sa = b.querySelector('#setAll'); if (sa) sa.onclick = () => { E.setAllChips(b.querySelector('#allV').value); openSettings(); toast('✔ تم التعيين للجميع'); };
    const rs = b.querySelector('#rstSc'); if (rs) rs.onclick = () => { E.resetScores(); openSettings(); toast('✔ تم تصفير النقاط'); };
    b.querySelector('#sx').onclick = closeModal;
  });
}
$('#btnSettings').onclick = openSettings;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ---- actions & emotes ---- */
function myAct(a) {
  const S = APP.S; if (!S) return;
  if (APP.eng) { try { APP.eng.handle(APP.myPeer, a); } catch (e) { console.error(e); } return; }
  if (!APP.R) return;
  APP.actN++; APP.pendingV = S.v; APP.pendingAt = Date.now();
  APP.R.presence({ act: { n: APP.actN, r: S.round, t: a.t, v: a.v === undefined ? 0 : a.v } }).catch(() => {});
  ctrlKey = ''; renderControls();
}
function sendEmo(e) { if (APP.R) APP.R.presence({ emo: { e, n: Date.now() } }).catch(() => {}); else showEmo(APP.myPeer, e); }
function showEmo(peer, e) { const s = SEATS.get(peer); if (!s) return; const n = s.querySelector('.emo'); if (!n) return; n.textContent = e; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); sfx('pop'); }
function showNet(p, net) { const s = SEATS.get(p); if (!s) return; const n = s.querySelector('.net'); if (!n) return; n.textContent = (net > 0 ? '+' : '') + fmt(net); n.style.color = net > 0 ? '#7CFC9A' : net < 0 ? '#ff6b6b' : '#ddd'; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); }
function banner(t, cls) { const b = $('#banner'); b.textContent = t; b.className = 'banner ' + cls; void b.offsetWidth; b.classList.add('show'); }
function coinBurst(p, fromEl) {
  const s = SEATS.get(p); if (!s || !fromEl) return; const to = s.getBoundingClientRect(); const from = fromEl.getBoundingClientRect();
  for (let i = 0; i < 14; i++) { const c = el('div', 'coinp'); const sx = from.left + from.width / 2 + (Math.random() - .5) * 80, sy = from.top + from.height / 2; c.style.left = sx + 'px'; c.style.top = sy + 'px'; document.body.appendChild(c);
    const dx = to.left + to.width / 2 - sx + (Math.random() - .5) * 30, dy = to.top + to.height / 2 - sy;
    c.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: `translate(${dx * .5}px,${dy * .5 - 80}px) scale(1.1)`, opacity: 1, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(.8)`, opacity: .9 }], { duration: 900 + Math.random() * 300, delay: i * 45, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).onfinish = () => c.remove(); }
}

/* ================== STATE → VIEW ================== */
function onState(S) {
  const prev = APP.S;
  S = JSON.parse(JSON.stringify(S));
  APP.S = S; APP.lastV = S.v;
  if (APP.mode === 'multi' && !APP.eng && (S.ban || []).includes(APP.myPeer)) { kickedOut(); return; }
  if (S.end) { APP.localEnd = Date.now() + (S.end - S.t); APP.localDur = S.dur || 1; } else APP.localEnd = 0;
  const G = GAMES[APP.game];
  if (prev && prev.cfg && S.cfg && JSON.stringify(prev.cfg) !== JSON.stringify(S.cfg) && !APP.eng) toast('⚙️ المضيف غيّر إعدادات الطاولة');
  if (G.chips && prev) { const a = prev.seats.find(s => s.p === APP.myPeer), b = S.seats.find(s => s.p === APP.myPeer); if (a && b && G.chipsEdited && G.chipsEdited(prev, S, a, b)) toast(`💰 المضيف عدّل نقودك إلى ${fmt(b.ch)}`); }
  if (G.onState) G.onState(prev, S);
  renderGame();
}
const mySeat = S => S && S.seats.find(s => s.p === APP.myPeer);
function timeLeft() { return APP.localEnd ? Math.max(0, APP.localEnd - Date.now()) : 0; }
function timePct() { return APP.localDur ? Math.min(1, timeLeft() / APP.localDur) : 0; }
function renderGame() {
  if (APP.screen !== 'scr-table') return; const G = GAMES[APP.game];
  try { G.render(APP.S, getPriv()); } catch (e) { console.error(e); }
  renderControls(); updHud();
}
function updHud() { const G = GAMES[APP.game]; const h = APP.S ? G.hud(APP.S) : null; $('#tChips').textContent = h == null ? '—' : h; const ic = G.hudIcon || (G.scores ? '⭐' : ''); $('#hudIcon').textContent = ic; $('#hudIcon').className = ic ? 'staric' : 'coin'; }
let ctrlKey = '';
function renderControls() {
  const box = $('#controls'), S = APP.S, G = GAMES[APP.game];
  if (APP.pendingV !== null && S && APP.pendingV !== S.v) APP.pendingV = null;
  const pending = APP.pendingV !== null;
  const key = [APP.game, S ? S.v : -1, pending, G.localKey ? G.localKey() : '', APP.eng ? 1 : 0, JSON.stringify(getPriv() || '')].join('|');
  if (key === ctrlKey) return; ctrlKey = key;
  box.innerHTML = '';
  if (!S) { box.appendChild(el('div', 'status', '⏳ جارٍ الاتصال بالطاولة...')); }
  else { try { G.controls(box, S, getPriv(), pending); } catch (e) { console.error(e); } }
  if (APP.mode === 'multi') { const er = el('div', 'crow'); const eb = el('div', 'emobar'); ['😂', '👍', '🔥', '😱', '👏', '😭', '🤑'].forEach(e => { const b = el('button'); b.textContent = e; b.onclick = () => sendEmo(e); eb.appendChild(b); }); er.appendChild(eb); box.appendChild(er); }
}
function mkBtn(row, txt, cls, fn, dis, pending) { const b = el('button', 'btn ' + cls); b.innerHTML = txt; b.disabled = !!dis || !!pending; b.onclick = fn; row.appendChild(b); return b; }
function statusRow(box, txt) { const st = el('div', 'status'); st.textContent = txt; box.appendChild(st); return st; }
function chipPicker(box, sel, maxV, onPick) { const r = el('div', 'crow'); CHIP_VALUES.forEach(v => { const b = el('button', 'chipbtn' + (sel === v ? ' sel' : '')); b.appendChild(chipEl(v)); b.disabled = v > maxV; b.onclick = ev => onPick(v, ev.currentTarget); r.appendChild(b); }); box.appendChild(r); return r; }
setInterval(() => {
  if (APP.screen !== 'scr-table' || !APP.S) return; const G = GAMES[APP.game];
  if (G.tick) { try { G.tick(APP.S); } catch (e) {} }
  if (APP.pendingV !== null && Date.now() - APP.pendingAt > 3500) { APP.pendingV = null; ctrlKey = ''; renderControls(); }
}, 250);
window.addEventListener('resize', () => { if (APP.screen === 'scr-table') renderGame(); });

/* generic timer bar html */
function timerMsg(box, m1, m2, bar) {
  const key = m1 + '|' + m2 + '|' + bar;
  if (box.dataset.k !== key) { box.dataset.k = key; box.innerHTML = `<div class="m1"></div><div class="m2"></div>${bar ? '<div class="tbarline"><i></i></div>' : ''}`; box.querySelector('.m1').textContent = m1; box.querySelector('.m2').textContent = m2; }
  const i = box.querySelector('.tbarline i'); if (i) i.style.width = (timePct() * 100) + '%';
}
