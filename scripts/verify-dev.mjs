/**
 * Проверяет, что API (корень + health) и Vite реально отвечают.
 * Пример:
 *   API_BASE_URL=http://localhost:3847 WEB_URL=http://localhost:5280/ node scripts/verify-dev.mjs
 */

const API_BASE = (process.env.API_BASE_URL || "http://localhost:3847").replace(/\/$/, "");
const API_ROOT = `${API_BASE}/`;
const API_HEALTH = process.env.API_HEALTH_URL || `${API_BASE}/api/health`;
const WEB = process.env.WEB_URL || "http://localhost:5280/";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForOk(url, { attempts = 45, delayMs = 1000, label } = {}) {
  let lastErr = "";
  for (let i = 0; i < attempts; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2500);
    try {
      const res = await fetch(url, { signal: ac.signal });
      clearTimeout(t);
      if (res.ok) return res;
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      clearTimeout(t);
      lastErr = e?.message || String(e);
    }
    await sleep(delayMs);
  }
  throw new Error(`${label || url}: не ответил за ${attempts * delayMs}ms (${lastErr})`);
}

async function main() {
  const root = await waitForOk(API_ROOT, { label: "API GET /" });
  const ct = root.headers.get("content-type") || "";
  if (!root.ok) throw new Error(`API GET /: HTTP ${root.status}`);
  console.log("API root:", root.status, ct.split(";")[0]);

  const health = await waitForOk(API_HEALTH, { label: "API /api/health" });
  const body = await health.json();
  if (!body?.ok) throw new Error("API /api/health: ожидался { ok: true }");
  console.log("API health:", body);

  const page = await waitForOk(WEB, { label: "Vite" });
  console.log("WEB:", page.status, page.headers.get("content-type") || "");
  console.log("verify:dev OK");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
