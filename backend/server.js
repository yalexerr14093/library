// server.js — entry point
const { initDb, pool } = require("./db");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const routes = require("./routes/index");
const { startCoverBackfillLoop } = require("./services/coverBackfill");
const { setTimeout: sleep } = require("timers/promises");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
let serverInstance = null;

function closeHttpServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

function parseFrontendOrigins() {
  const raw = process.env.FRONTEND_URL || "http://localhost:5173";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const FRONTEND_ORIGINS = new Set(parseFrontendOrigins());
const PRIMARY_FRONTEND = [...FRONTEND_ORIGINS][0] || "http://localhost:5173";

const ALLOW_LOCALHOST_CORS =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCALHOST_CORS === "true";

function isLocalhostOrigin(origin) {
  try {
    const u = new URL(origin);
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // non-browser clients / same-origin
      if (!origin) return callback(null, true);
      if (FRONTEND_ORIGINS.has(origin)) return callback(null, origin);
      if (ALLOW_LOCALHOST_CORS && isLocalhostOrigin(origin)) return callback(null, origin);
      return callback(null, false);
    },
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limit for auth endpoints (basic brute-force protection)
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Корень — не API; без этого браузер показывает «Cannot GET /»
app.get("/", (req, res) => {
  const wantsHtml = (req.get("accept") || "").includes("text/html");
  if (wantsHtml) {
    return res.type("html").send(`<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Книжная полка — API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;line-height:1.5">
  <h1>Книжная полка — API</h1>
  <p>Это сервер приложения (REST). Страница каталога — на фронтенде:</p>
  <p><a href="${PRIMARY_FRONTEND}">${PRIMARY_FRONTEND}</a></p>
  <p>Проверка API: <a href="/api/health">/api/health</a> · <a href="/api/books/genres">/api/books/genres</a></p>
</body></html>`);
  }
  res.json({
    ok: true,
    kind: "api",
    hint: "Интерфейс открывайте на URL фронтенда (см. frontend).",
    frontend: PRIMARY_FRONTEND,
    endpoints: ["/api/health", "/api/books", "/api/books/genres"],
  });
});

app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    console.log(`${signal} received — closing HTTP server...`);
    await Promise.race([closeHttpServer(serverInstance), sleep(2500)]);
    serverInstance = null;

    try {
      await Promise.race([pool.end(), sleep(2000)]);
    } catch {
      // ignore
    }
  } catch (e) {
    console.warn("shutdown warning:", e?.message || e);
  } finally {
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }
}

async function boot() {
  await initDb();

  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        serverInstance = app
          .listen(PORT)
          .once("error", reject)
          .once("listening", () => {
            console.log(`📚 Книжная полка API → http://localhost:${PORT}`);
            startCoverBackfillLoop();
            resolve(serverInstance);
          });
      });
      return;
    } catch (err) {
      if (err?.code === "EADDRINUSE") {
        const wait = Math.min(2000, 150 * attempt);
        console.warn(`Port ${PORT} busy (attempt ${attempt}/20). Retrying in ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Failed to bind port ${PORT} after retries`);
}

boot().catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

if (process.platform === "win32") {
  process.once("SIGBREAK", () => {
    void shutdown("SIGBREAK");
  });
} else {
  // nodemon (non-Windows): uses SIGUSR2 to coordinate restarts
  process.once("SIGUSR2", () => {
    void shutdown("SIGUSR2");
  });
}