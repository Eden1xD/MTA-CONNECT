const express = require("express");
const cors = require("cors");
const Gamedig = require("gamedig");

const app = express();
app.use(cors());

const HOST = "192.99.120.58";
const PORT = 22003;

// Cache pra não ficar consultando UDP a cada refresh
let cache = null;
let cacheAt = 0;
const CACHE_MS = 5000;

app.get("/status", async (req, res) => {
  try {
    const now = Date.now();
    if (cache && (now - cacheAt) < CACHE_MS) {
      return res.json({ ok: true, cached: true, ...cache });
    }

    const state = await Gamedig.query({
      type: "mtasa",
      host: HOST,
      port: PORT,
      // tenta mais tempo pra não dar timeout fácil
      socketTimeout: 3500,
      attemptTimeout: 3500,
      maxAttempts: 2,
    });

    const data = {
      name: state.name || "Servidor MTA",
      map: state.map || "—",
      password: !!state.password,
      ping: state.ping ?? null,
      players: (state.players || []).map(p => ({
        name: p.name || "Player",
        score: p.score ?? 0
      })),
      playersOnline: state.players?.length ?? 0,
      maxPlayers: state.maxplayers ?? state.maxPlayers ?? null,
      connect: `mtasa://${HOST}:${PORT}`,
      ip: `${HOST}:${PORT}`
    };

    cache = data;
    cacheAt = now;

    res.json({ ok: true, cached: false, ...data });
  } catch (err) {
    res.status(200).json({
      ok: false,
      error: "offline_or_timeout",
      message: "Não foi possível consultar (timeout/UDP bloqueado).",
      ip: `${HOST}:${PORT}`,
      connect: `mtasa://${HOST}:${PORT}`
    });
  }
});

const PORT_HTTP = process.env.PORT || 3000;
app.listen(PORT_HTTP, () => console.log("✅ Status API on:", PORT_HTTP));
