/* ================== MENU ART ================== */
(() => {
  const pk = $('#pkArt'); [['AH', -12, 30], ['AS', 8, 80]].forEach(([c, r, x]) => { const k = makeCard(c); k.style.setProperty('--cw', '72px'); k.style.setProperty('--ch', '100px'); k.style.left = x + 'px'; k.style.transform = `rotate(${r}deg)`; pk.appendChild(k); });
  const ch = chipEl(100); pk.appendChild(ch);
  const a = 360 / 37; let s = '<svg class="miniwheel" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="#5a3412"/>';
  RL_ORDER.forEach((n, i) => { const t0 = (i * a - a / 2) * Math.PI / 180, t1 = (i * a + a / 2) * Math.PI / 180, P = (r, t) => `${50 + r * Math.sin(t)},${50 - r * Math.cos(t)}`; s += `<path d="M${P(46, t0)} A46,46 0 0 1 ${P(46, t1)} L${P(30, t1)} A30,30 0 0 0 ${P(30, t0)} Z" fill="${{ green: '#1e9e4a', red: '#c62828', black: '#161616' }[rlColor(n)]}"/>`; });
  s += '<circle cx="50" cy="50" r="30" fill="#b07a2a"/><circle cx="50" cy="50" r="8" fill="#f5c451"/><circle cx="50" cy="12" r="3" fill="#fff"/></svg>';
  $('#rlArt').innerHTML = s;
  const cg = $('#cnArt'); 'rbnrxbnrb'.split('').forEach((c, i) => { const d = el('div', 'cnmini ' + c); d.textContent = ['قمر', 'أسد', 'بحر', 'تاج', 'سر', 'نار', 'عود', 'جسر', 'برق'][i]; cg.appendChild(d); });
  const ba = $('#bgArt'); const cols = ['#8b5a2b', '#7dd3fc', '#f472b6', '#fb923c', '#ef4444', '#facc15', '#22c55e', '#1e3a8a']; for (let i = 0; i < 16; i++) { const r = i < 5 ? 1 : i < 8 ? i - 3 : i < 13 ? 5 : 16 - i + 1; const c = i < 5 ? i + 1 : i < 8 ? 5 : i < 13 ? 13 - i : 1; const d = el('div', 'bam'); d.style.gridRow = r; d.style.gridColumn = c; d.style.borderTop = '5px solid ' + cols[i % 8]; ba.appendChild(d); } const ctr = el('div', 'bac', 'بغداد<span>🎲🎲</span>'); ba.appendChild(ctr);
  const sa = $('#shArt'); sa.appendChild(shPolicy('L')); sa.appendChild(shPolicy('F')); const bj = el('div', 'shballots', '<span class="ja">نعم</span><span class="nein">لا</span>'); sa.appendChild(bj);
  $('#shChatForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#shChatIn'); const v = shClean(i.value); if (!v) return; myAct({ t: 'chat', v }); i.value = ''; });
  $('#wwArt').innerHTML = '<div class="wmoon"></div><div class="wwolf">🐺</div><div class="wvil">🏠🌲🏠</div>';
  $('#wwChatForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#wwChatIn'); const v = wwClean(i.value); if (!v || i.disabled) return; myAct({ t: 'chat', v }); i.value = ''; });
  const dm = $('#dmArt'); dm.appendChild(dmTile(6, 6, 'v')); dm.appendChild(dmTile(3, 5, 'v')); dm.appendChild(dmTile(1, 4, 'v'));
})();

/* ================== BOOT ================== */
function maybeJoinFromHash() {
  const m = /^#((bj|pk|rl|dm|cn|bg|sh|ww)-[a-z0-9]{3,12})$/.exec(location.hash || ''); if (!m || !P) return false;
  if (APP.code === m[1]) return true;
  joinTable(m[1], false); return true;
}
window.addEventListener('hashchange', () => { if (P && APP.screen !== 'scr-table') maybeJoinFromHash(); });
openAuth(false);
if (typeof claude !== 'undefined' && claude.use) claude.use('room').then(r => { if (!APP.roomNS) APP.roomNS = r; }).catch(() => {});
