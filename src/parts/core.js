'use strict';
/* ================== CONFIG ================== */
const GAME_URL = 'https://claude.ai/artifact/14RYhiTTH6D3DykoCpqtf7';
const START_CHIPS = 1000;
const AVATARS = ['🦁','🐯','🦊','🐼','🐸','🐵','🦉','🐺','🐲','🦄','🐻','🐨'];
const CHIP_VALUES = [5,25,100,500,1000];

/* ================== HELPERS ================== */
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const LS_UNUSED = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const cleanName = s => String(s || '').replace(/[\u0000-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁯﻿]/g, '').trim().slice(0, 14);
const fmt = n => Math.round(n).toLocaleString('en-US');
function toast(msg, ms = 2600) { const t = el('div', 'toast'); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), ms); }
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); $('#' + id).classList.add('on'); APP.screen = id; }
function modal(html, onMount) { $('#mbox').className = 'mbox'; $('#mbox').innerHTML = html; $('#modal').classList.add('on'); if (onMount) onMount($('#mbox')); }
function closeModal() { $('#modal').classList.remove('on'); }

/* background suits */

/* ================== SOUND ================== */
const SND = { ctx: null, on: true };
function actx() { if (!SND.ctx) { try { SND.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {}); return SND.ctx; }
document.addEventListener('pointerdown', () => actx(), { once: false, passive: true });
function tone(f, t0, dur, type = 'sine', vol = .15) { const c = SND.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, c.currentTime + t0); g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + t0 + dur); o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + .05); }
function noise(dur, freq, vol = .25) { const c = SND.ctx; if (!c) return; const n = c.sampleRate * dur, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; const g = c.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(c.destination); s.start(); }
function sfx(k) { if (!SND.on || !SND.ctx || SND.ctx.state !== 'running') return;
  if (k === 'card') noise(.07, 2600, .35);
  else if (k === 'flip') noise(.05, 3800, .25);
  else if (k === 'chip') { tone(2600, 0, .08, 'triangle', .12); tone(3400, .04, .09, 'triangle', .1); }
  else if (k === 'win') [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .09, .25, 'triangle', .14));
  else if (k === 'bj') [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, i * .08, .3, 'square', .07));
  else if (k === 'lose') { tone(330, 0, .25, 'sawtooth', .06); tone(247, .18, .4, 'sawtooth', .06); }
  else if (k === 'turn') { tone(880, 0, .15, 'sine', .12); tone(1320, .1, .2, 'sine', .1); }
  else if (k === 'pop') tone(660, 0, .1, 'sine', .1);
}
function syncMuteBtns() { ['#btnMute1', '#btnMute2'].forEach(s => { const b = $(s); if (b) b.textContent = SND.on ? '🔊' : '🔇'; }); }
['#btnMute1', '#btnMute2'].forEach(s => $(s).addEventListener('click', () => { SND.on = !SND.on; syncMuteBtns(); actx(); sfx('pop'); }));
syncMuteBtns();

/* ================== CARDS ================== */
const SUITSYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
const PIPS = { 2: [[50, 12], [50, 88]], 3: [[50, 12], [50, 50], [50, 88]], 4: [[25, 12], [75, 12], [25, 88], [75, 88]], 5: [[25, 12], [75, 12], [50, 50], [25, 88], [75, 88]], 6: [[25, 12], [75, 12], [25, 50], [75, 50], [25, 88], [75, 88]], 7: [[25, 12], [75, 12], [50, 31], [25, 50], [75, 50], [25, 88], [75, 88]], 8: [[25, 12], [75, 12], [50, 31], [25, 50], [75, 50], [50, 69], [25, 88], [75, 88]], 9: [[25, 12], [75, 12], [25, 37], [75, 37], [50, 50], [25, 63], [75, 63], [25, 88], [75, 88]], 10: [[25, 12], [75, 12], [50, 25], [25, 37], [75, 37], [25, 63], [75, 63], [50, 75], [25, 88], [75, 88]] };
const rankLabel = r => r === 'T' ? '10' : r;
function faceArt(r, s, red) {
  const c = red ? '#c8102e' : '#1b2a4a', g = '#e0a531', sym = SUITSYM[s];
  let crown;
  if (r === 'K') crown = `<path d="M14 30 L17 13 L24 22 L30 8 L36 22 L43 13 L46 30 Z" fill="${g}" stroke="${c}" stroke-width="1.2"/><rect x="14" y="30" width="32" height="5" fill="${c}"/><circle cx="30" cy="8" r="2.5" fill="${c}"/>`;
  else if (r === 'Q') crown = `<path d="M15 30 Q17 18 22 22 Q26 12 30 18 Q34 12 38 22 Q43 18 45 30 Z" fill="${g}" stroke="${c}" stroke-width="1.2"/><rect x="15" y="30" width="30" height="4" fill="${c}"/><circle cx="22" cy="21" r="2" fill="${c}"/><circle cx="30" cy="16" r="2.3" fill="${c}"/><circle cx="38" cy="21" r="2" fill="${c}"/>`;
  else crown = `<path d="M16 32 Q18 14 30 13 Q42 14 44 32 Z" fill="${c}"/><path d="M40 16 Q50 6 52 18 Q46 14 42 20 Z" fill="${g}"/><rect x="14" y="31" width="32" height="4" rx="2" fill="${g}"/>`;
  return `<svg viewBox="0 0 60 84">${crown}<text x="30" y="66" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="28" fill="${c}">${r}</text><text x="11" y="76" font-size="11" fill="${c}">${sym}</text><text x="49" y="76" text-anchor="end" font-size="11" fill="${c}">${sym}</text><line x1="6" y1="42" x2="54" y2="42" stroke="${g}" stroke-width="1" opacity=".6"/></svg>`;
}
function setFace(card, code) {
  const fr = card.querySelector('.fr');
  if (!code || code === 'XX') { fr.innerHTML = ''; card.classList.remove('red', 'blk'); return; }
  const r = code[0], s = code[1], red = s === 'H' || s === 'D', sym = SUITSYM[s];
  card.classList.add(red ? 'red' : 'blk'); card.classList.remove(red ? 'blk' : 'red');
  let mid = '';
  if (r === 'A') mid = `<div class="ace">${sym}</div>`;
  else if ('JQK'.includes(r)) mid = `<div class="face ${red ? 'red' : 'blk'}">${faceArt(r, s, red)}</div>`;
  else { const n = r === 'T' ? 10 : +r; mid = '<div class="pips">' + PIPS[n].map(([x, y]) => `<span class="pip${y > 55 ? ' f' : ''}" style="left:${x}%;top:${y}%">${sym}</span>`).join('') + '</div>'; }
  const corner = `<b>${rankLabel(r)}</b><small>${sym}</small>`;
  fr.innerHTML = `<div class="cn">${corner}</div>${mid}<div class="cn b">${corner}</div>`;
}
function makeCard(code, faceDown) {
  const c = el('div', 'card'); c.innerHTML = '<div class="in"><div class="fr"></div><div class="bk"></div></div>';
  setFace(c, code); if (faceDown) c.classList.add('down'); return c;
}
// shoe decoration
document.querySelectorAll('.shoe').forEach(sh => { for (let i = 0; i < 3; i++) { const c = makeCard(null, true); c.style.left = (8 + i * 3) + 'px'; c.style.top = (6 - i) + 'px'; sh.appendChild(c); } });
// menu art
(() => { const f = $('#fanArt'); [['AS', -14, 22], ['KH', 10, 82]].forEach(([c, r, x]) => { const k = makeCard(c); k.style.setProperty('--cw', '76px'); k.style.setProperty('--ch', '106px'); k.style.left = x + 'px'; k.style.transform = `rotate(${r}deg)`; f.appendChild(k); }); })();

function chipEl(v, small) { const c = el('div', 'chip c' + v + (small ? ' s' : '')); c.textContent = v >= 1000 ? '1K' : v; return c; }
function chipBreak(a) { const out = []; let r = a; for (const v of [...CHIP_VALUES].reverse()) { while (r >= v && out.length < 8) { out.push(v); r -= v; } } return out; }
function renderStack(node, amount) {
  node.innerHTML = ''; chipBreak(amount).reverse().forEach((v, i) => { const c = chipEl(v, true); c.style.transform = `translateY(${-i * 3}px)`; node.appendChild(c); });
}

/* deal animation queue */
let nextDealAt = 0;
function queueDeal(card, faceUp) {
  card.style.opacity = '0';
  const now = performance.now(); const t = Math.max(now, nextDealAt); nextDealAt = t + 210;
  setTimeout(() => {
    if (!card.isConnected) return;
    const sh = (document.querySelector('.stage.on .shoe') || document.querySelector('.shoe')).getBoundingClientRect(), r = card.getBoundingClientRect();
    const dx = sh.left + sh.width / 2 - (r.left + r.width / 2), dy = sh.top + sh.height / 2 - (r.top + r.height / 2);
    card.style.transition = 'none'; card.style.transform = `translate(${dx}px,${dy}px) rotate(-25deg) scale(.7)`; card.style.opacity = '1';
    card.getBoundingClientRect();
    card.style.transition = 'transform .45s cubic-bezier(.2,.8,.25,1)'; card.style.transform = '';
    sfx('card');
    if (faceUp) setTimeout(() => { if (card.isConnected) { card.classList.remove('down'); } }, 380);
  }, t - now);
}
function syncHand(box, cards) {
  const kids = [...box.children];
  let i = 0;
  for (; i < kids.length && i < cards.length; i++) {
    const k = kids[i], c = cards[i];
    if (k.dataset.c === c) continue;
    if (k.dataset.c === 'XX' && c !== 'XX') { setFace(k, c); k.dataset.c = c; setTimeout(() => k.classList.remove('down'), 30); sfx('flip'); continue; }
    break;
  }
  for (let j = kids.length - 1; j >= i; j--) kids[j].remove();
  for (let j = i; j < cards.length; j++) { const c = cards[j]; const k = makeCard(c === 'XX' ? null : c, true); k.dataset.c = c; box.appendChild(k); queueDeal(k, c !== 'XX'); }
}

/* ================== BLACKJACK RULES ================== */
const RANKS = 'A23456789TJQK', SUITS = 'SHDC';
const cardVal = c => c[0] === 'A' ? 11 : ('TJQK'.includes(c[0]) ? 10 : +c[0]);
function handVal(cs) { let t = 0, a = 0; for (const c of cs) { if (c === 'XX') continue; t += cardVal(c); if (c[0] === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return { t, soft: a > 0 }; }
const isBJ = h => h.c.length === 2 && !h.sp && handVal(h.c).t === 21;

