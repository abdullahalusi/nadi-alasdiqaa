# Nadi Al-Asdiqaa (نادي الأصدقاء) — project notes

- Arabic (RTL) multiplayer party-games site: Blackjack, Texas Hold'em, Roulette, Dominoes, Codenames (كود نيمز), "لعبة بغداد" (Baghdad property-trading board game).
- Deployed on Cloudflare Workers (free; `wrangler.jsonc`, `worker/index.js` = Worker + one Durable Object `Rooms` relaying rooms in memory) via Workers Builds from branch `main`; every push redeploys. `server.js` is an equivalent standalone Node server (Render alternative) — keep both protocol-compatible. No user data is stored anywhere — everything is session-only by design (owner's explicit request).
- `server.js`: zero-dependency Node server — serves `public/` and a WebSocket relay at `/ws` (rooms = table codes, per-peer presence). Keep it dependency-free.
- `public/index.html` is a BUILD OUTPUT. Edit sources in `src/parts/` then run `python3 src/build.py`.
  - `fw.js` shared framework (lobby, settings, host election, encrypted private hands, kick, emotes); one file per game (`bj.js`, `pk.js`, `rl.js`, `dm.js`, `cn.js` + `cnwords.js`, `bg.js`); `standalone.js` is the WebSocket room client.
  - Host's browser runs the game engine and publishes state in its presence (`st`, keep it under ~3.5 KB UTF-8); hidden cards/tiles go per player in `pv`, encrypted with ECDH+AES-GCM.
- Owner communicates in Arabic.
