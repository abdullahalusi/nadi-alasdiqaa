/* ================== STANDALONE ROOM CLIENT (WebSocket) ================== */
(() => {
  const DEV = (() => { try { let d = localStorage.getItem('fc_dev'); if (!d) { d = 'd' + Math.random().toString(36).slice(2, 12); localStorage.setItem('fc_dev', d); } return d; } catch (e) { return 'd' + Math.random().toString(36).slice(2, 12); } })();
  const URL_ = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  let ws = null, me = null, open = false, backoff = 600; const rooms = new Map(), connSubs = new Set();
  const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  function connect() {
    try { ws = new WebSocket(URL_); } catch (e) { return retry(); }
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === 'hello') { me = m.me; open = true; backoff = 600; connSubs.forEach(f => f(true)); rooms.forEach(r => r._rejoin()); }
      else if (m.t === 'joined') { const r = rooms.get(m.room); if (r) r._joined(); }
      else if (m.t === 'peers') { const r = rooms.get(m.room); if (r) r._peers(m.peers); }
      else if (m.t === 'msg') { const r = rooms.get(m.room); if (r) r._msg(m); }
      else if (m.t === 'full') { const r = rooms.get(m.room); if (r) r._fail('limit_reached'); } };
    ws.onclose = () => { const was = open; open = false; rooms.forEach(r => r.ok = false); if (was) connSubs.forEach(f => f(false)); retry(); };
    ws.onerror = () => {};
  }
  function retry() { setTimeout(connect, backoff); backoff = Math.min(8000, backoff * 1.7); }
  setInterval(() => send({ t: 'ping' }), 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!ws || ws.readyState > 1)) { backoff = 300; } });
  connect();
  class Room {
    constructor(name) { this.name = name; this.pres = {}; this.subs = new Set(); this.list = Object.freeze([]); this.waiters = []; this.tmr = null; this.ok = false; this.topics = new Map(); }
    _rejoin() { send({ t: 'join', room: this.name, by: DEV, presence: this.pres }); }
    _joined() { this.ok = true; this.waiters.splice(0).forEach(w => w.res(this)); }
    _fail(code) { this.waiters.splice(0).forEach(w => w.rej({ code, message: code })); rooms.delete(this.name); }
    _peers(arr) {
      this.list = Object.freeze(arr.map(p => Object.freeze({ peer: p.peer, by: p.by || null, isMe: p.peer === me, sameTab: p.peer === me, kind: 'viewer', guest: false, presence: Object.freeze(p.presence || {}), updatedAt: p.at })));
      const ch = { peers: this.list, joined: [], left: [], updated: [] }; this.subs.forEach(f => { try { f(ch); } catch (e) { console.error(e); } });
    }
    _msg(m) { const fs = this.topics.get(m.topic); if (fs) fs.forEach(f => f({ topic: m.topic, data: m.data, peer: m.peer, by: null, isMe: m.peer === me, sameTab: m.peer === me, kind: 'viewer', guest: false })); }
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete this.pres[k]; else this.pres[k] = JSON.parse(JSON.stringify(patch[k])); } if (!this.tmr) this.tmr = setTimeout(() => { this.tmr = null; send({ t: 'pres', room: this.name, presence: this.pres }); }, 35); return Promise.resolve(); }
    onPeers(fn) { this.subs.add(fn); if (this.list.length) setTimeout(() => fn({ peers: this.list, joined: [], left: [], updated: [] }), 0); return () => this.subs.delete(fn); }
    peers() { return this.list; }
    connected() { return open && this.ok; }
    onConnection(fn) { connSubs.add(fn); setTimeout(() => fn(open), 0); return () => connSubs.delete(fn); }
    emit(topic, data) { send({ t: 'emit', room: this.name, topic, data }); return Promise.resolve(); }
    on(topic, fn) { if (!this.topics.has(topic)) this.topics.set(topic, new Set()); this.topics.get(topic).add(fn); return () => this.topics.get(topic).delete(fn); }
    leave() { send({ t: 'leave', room: this.name }); rooms.delete(this.name); this.subs.clear(); return Promise.resolve(); }
  }
  const ROOM = {
    join(name) {
      return new Promise((res, rej) => {
        let r = rooms.get(name); if (r && r.ok) return res(r);
        if (!r) { r = new Room(name); rooms.set(name, r); }
        r.waiters.push({ res, rej }); if (open) r._rejoin();
        setTimeout(() => { if (!r.ok && r.waiters.length) { r.waiters.splice(0).forEach(w => w.rej({ code: 'upstream_error', message: 'timeout' })); rooms.delete(name); } }, 20000);
      });
    }
  };
  window.claude = { use: async n => n === 'room' ? ROOM : null };
})();
