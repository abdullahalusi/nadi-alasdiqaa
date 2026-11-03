/*
 * نادي الأصدقاء — خادم اللعب الجماعي على Cloudflare Workers
 * - الملفات (public/) تُقدَّم تلقائياً من Cloudflare
 * - /ws : اتصال WebSocket يمرّ إلى Durable Object واحد يدير كل الطاولات في الذاكرة
 * لا يُحفظ أي شيء: كل البيانات مؤقتة في الذاكرة فقط.
 */
import { DurableObject } from 'cloudflare:workers';

const NAME_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const MAX_PEERS = 30;
const MAX_MSG = 64 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('expected websocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName('main')).fetch(request);
    }
    if (url.pathname === '/healthz') return new Response('ok');
    // any other unknown path -> the game page
    return env.ASSETS.fetch(new Request(new URL('/', url), request));
  }
};

export class Rooms extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rooms = new Map(); // name -> { peers: Map(id -> {c, presence, at}), timer }
    this.n = 1;
  }
  async fetch(request) {
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    server.accept();
    const c = { ws: server, id: 'p' + (this.n++).toString(36) + Math.random().toString(36).slice(2, 10), rooms: new Set(), by: null, rate: 0, rateAt: Date.now(), closed: false };
    c.send = s => { if (c.closed) return; try { server.send(s); } catch (e) { this.drop(c); } };
    server.addEventListener('message', ev => { try { this.onMessage(c, typeof ev.data === 'string' ? ev.data : ''); } catch (e) {} });
    server.addEventListener('close', () => this.drop(c));
    server.addEventListener('error', () => this.drop(c));
    c.send(JSON.stringify({ t: 'hello', me: c.id }));
    return new Response(null, { status: 101, webSocket: client });
  }
  drop(c) { if (c.closed) return; c.closed = true; for (const n of [...c.rooms]) this.leave(c, n); try { c.ws.close(1000, 'bye'); } catch (e) {} }
  flush(name) {
    const r = this.rooms.get(name); if (!r) return; r.timer = null;
    const list = []; for (const [id, p] of r.peers) list.push({ peer: id, by: p.c.by, presence: p.presence, at: p.at });
    const msg = JSON.stringify({ t: 'peers', room: name, peers: list });
    for (const p of r.peers.values()) p.c.send(msg);
  }
  sched(name) { const r = this.rooms.get(name); if (r && !r.timer) r.timer = setTimeout(() => this.flush(name), 30); }
  leave(c, name) {
    const r = this.rooms.get(name); c.rooms.delete(name); if (!r) return; r.peers.delete(c.id);
    if (!r.peers.size) { clearTimeout(r.timer); this.rooms.delete(name); } else this.sched(name);
  }
  onMessage(c, raw) {
    if (!raw || raw.length > MAX_MSG) return;
    const now = Date.now(); if (now - c.rateAt > 2000) { c.rate = 0; c.rateAt = now; } if (++c.rate > 150) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') return c.send('{"t":"pong"}');
    const name = String(m.room || ''); if (!NAME_RE.test(name)) return;
    if (m.t === 'join') {
      if (typeof m.by === 'string' && m.by.length <= 64) c.by = m.by;
      let r = this.rooms.get(name); if (!r) { r = { peers: new Map(), timer: null }; this.rooms.set(name, r); }
      if (!r.peers.has(c.id) && r.peers.size >= MAX_PEERS) return c.send(JSON.stringify({ t: 'full', room: name }));
      const pres = m.presence && typeof m.presence === 'object' && !Array.isArray(m.presence) ? m.presence : {};
      r.peers.set(c.id, { c, presence: pres, at: now }); c.rooms.add(name);
      c.send(JSON.stringify({ t: 'joined', room: name, me: c.id })); this.sched(name); return;
    }
    const r = this.rooms.get(name), me = r && r.peers.get(c.id); if (!me) return;
    if (m.t === 'pres') { if (m.presence && typeof m.presence === 'object' && !Array.isArray(m.presence)) { me.presence = m.presence; me.at = now; this.sched(name); } }
    else if (m.t === 'emit') { const msg = JSON.stringify({ t: 'msg', room: name, topic: String(m.topic || '').slice(0, 48), data: m.data, peer: c.id }); for (const p of r.peers.values()) p.c.send(msg); }
    else if (m.t === 'leave') this.leave(c, name);
  }
}
