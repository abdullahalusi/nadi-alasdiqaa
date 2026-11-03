'use strict';
/*
 * نادي الأصدقاء — خادم اللعب الجماعي
 * لا يحتاج أي مكتبات خارجية: Node.js فقط.
 *  - يقدّم ملفات الموقع من مجلد public
 *  - يربط اللاعبين ببعض عبر WebSocket على المسار /ws (غرف بأسماء أكواد الطاولات)
 * لا يحفظ أي بيانات: كل شيء في الذاكرة ويختفي عند إعادة التشغيل.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

/* ---------------- static files ---------------- */
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  if (url === '/') url = '/index.html';
  const file = path.normalize(path.join(PUBLIC, url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { fs.readFile(path.join(PUBLIC, 'index.html'), (e2, d2) => { if (e2) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' }); res.end(d2); }); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

/* ---------------- minimal WebSocket (RFC 6455) ---------------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 64 * 1024;
function frame(str) {
  const p = Buffer.from(str), n = p.length; let h;
  if (n < 126) { h = Buffer.alloc(2); h[1] = n; }
  else if (n < 65536) { h = Buffer.alloc(4); h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  h[0] = 0x81; return Buffer.concat([h, p]);
}
function ctrl(op, payload) { const p = payload || Buffer.alloc(0); return Buffer.concat([Buffer.from([0x80 | op, p.length]), p]); }

let nextId = 1;
const clients = new Set();
server.on('upgrade', (req, sock) => {
  if ((req.url || '').split('?')[0] !== '/ws' || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const key = req.headers['sec-websocket-key']; if (!key) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const c = { sock, id: 'p' + (nextId++).toString(36) + crypto.randomBytes(5).toString('hex'), rooms: new Set(), by: null, alive: true, rate: 0, buf: Buffer.alloc(0), frag: [], closed: false };
  clients.add(c);
  c.send = s => { if (!c.closed && sock.writable) sock.write(frame(s)); };
  c.close = () => { if (c.closed) return; c.closed = true; clients.delete(c); for (const n of [...c.rooms]) leave(c, n); try { sock.end(ctrl(0x8)); } catch (e) {} setTimeout(() => sock.destroy(), 1000); };
  sock.on('data', d => {
    c.alive = true; c.buf = Buffer.concat([c.buf, d]);
    while (c.buf.length >= 2) {
      const b0 = c.buf[0], b1 = c.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80; let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (c.buf.length < 10) return; const big = c.buf.readBigUInt64BE(2); if (big > BigInt(MAX_FRAME)) return c.close(); len = Number(big); off = 10; }
      if (len > MAX_FRAME) return c.close();
      const need = off + (masked ? 4 : 0) + len; if (c.buf.length < need) return;
      let payload = c.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = c.buf.subarray(off, off + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      c.buf = c.buf.subarray(need);
      if (op === 0x8) return c.close();
      if (op === 0x9) { sock.write(ctrl(0xA, payload)); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x0) { c.frag.push(payload); if (fin) { const msg = Buffer.concat(c.frag).toString('utf8'); c.frag = []; if (msg.length <= MAX_FRAME) onMessage(c, msg); } }
    }
  });
  sock.on('close', () => c.close()); sock.on('error', () => c.close());
  c.send(JSON.stringify({ t: 'hello', me: c.id }));
});

/* ---------------- rooms ---------------- */
const rooms = new Map(); // name -> { peers: Map(id -> {c, presence, at}), timer }
const NAME_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const MAX_PEERS = 30;
function flush(name) {
  const r = rooms.get(name); if (!r) return; r.timer = null;
  const list = []; for (const [id, p] of r.peers) list.push({ peer: id, by: p.c.by, presence: p.presence, at: p.at });
  const msg = JSON.stringify({ t: 'peers', room: name, peers: list });
  for (const p of r.peers.values()) p.c.send(msg);
}
function sched(name) { const r = rooms.get(name); if (r && !r.timer) r.timer = setTimeout(() => flush(name), 30); }
function leave(c, name) {
  const r = rooms.get(name); c.rooms.delete(name); if (!r) return; r.peers.delete(c.id);
  if (!r.peers.size) { clearTimeout(r.timer); rooms.delete(name); } else sched(name);
}
function onMessage(c, raw) {
  if (++c.rate > 150) return; // budget per 2 seconds
  let m; try { m = JSON.parse(raw); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;
  if (m.t === 'ping') return c.send('{"t":"pong"}');
  const name = String(m.room || ''); if (!NAME_RE.test(name)) return;
  if (m.t === 'join') {
    if (typeof m.by === 'string' && m.by.length <= 64) c.by = m.by;
    let r = rooms.get(name); if (!r) { r = { peers: new Map(), timer: null }; rooms.set(name, r); }
    if (!r.peers.has(c.id) && r.peers.size >= MAX_PEERS) return c.send(JSON.stringify({ t: 'full', room: name }));
    const pres = m.presence && typeof m.presence === 'object' && !Array.isArray(m.presence) ? m.presence : {};
    r.peers.set(c.id, { c, presence: pres, at: Date.now() }); c.rooms.add(name);
    c.send(JSON.stringify({ t: 'joined', room: name, me: c.id })); sched(name); return;
  }
  const r = rooms.get(name), me = r && r.peers.get(c.id); if (!me) return;
  if (m.t === 'pres') { if (m.presence && typeof m.presence === 'object' && !Array.isArray(m.presence)) { me.presence = m.presence; me.at = Date.now(); sched(name); } }
  else if (m.t === 'emit') { const msg = JSON.stringify({ t: 'msg', room: name, topic: String(m.topic || '').slice(0, 48), data: m.data, peer: c.id }); for (const p of r.peers.values()) p.c.send(msg); }
  else if (m.t === 'leave') leave(c, name);
}

setInterval(() => { for (const c of clients) c.rate = 0; }, 2000);
setInterval(() => { for (const c of clients) { if (!c.alive) { c.close(); continue; } c.alive = false; try { c.sock.write(ctrl(0x9)); } catch (e) {} } }, 30000);

server.listen(PORT, () => console.log('نادي الأصدقاء يعمل على المنفذ ' + PORT));
