const { pool } = require("../db");
const fetchCoverFromGoogle = require("../utils/fetchCover");
const findGoogleBookId = require("../utils/findGoogleBook");

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function extractGoogleBooksIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;

    const m = url.match(/\/books\/content\/images\/frontcover\/([^/?#]+)/i);
    if (m?.[1]) return m[1];
  } catch {
    // ignore
  }
  return null;
}

function normalizeGoogleCoverUrl(url) {
  const id = extractGoogleBooksIdFromUrl(url);
  if (!id) return url;
  return `https://books.google.com/books/content/images/frontcover/${id}?fife=w400-h600&source=gbs_api`;
}

async function probeImageDimensions(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 4500);
  const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
  clearTimeout(t);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 24) return null;

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height, bytes: buf.length };
  }

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) return null;
      const marker = buf[offset + 1];
      // Start Of Frame markers
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height, bytes: buf.length };
      }
      const segLen = buf.readUInt16BE(offset + 2);
      if (segLen < 2) return null;
      offset += 2 + segLen;
    }
    return null;
  }

  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    const width = buf.readUInt16LE(6);
    const height = buf.readUInt16LE(8);
    return { width, height, bytes: buf.length };
  }

  // WEBP (VP8 / VP8L / VP8X)
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    let p = 12;
    while (p + 8 <= buf.length) {
      const chunkId = buf.toString("ascii", p, p + 4);
      const chunkSize = buf.readUInt32LE(p + 4);
      const dataStart = p + 8;
      const dataEnd = dataStart + chunkSize;

      if (chunkId === "VP8 " && dataEnd + 10 <= buf.length) {
        // Lossy: width/height are 14-bit at end of frame header (simplified)
        const w = buf.readUInt16LE(dataEnd - 6) & 0x3fff;
        const h = buf.readUInt16LE(dataEnd - 4) & 0x3fff;
        return { width: w, height: h, bytes: buf.length };
      }
      if (chunkId === "VP8L" && dataStart + 5 <= buf.length) {
        const b0 = buf[dataStart];
        const w = 1 + (((buf[dataStart + 2] & 0x3f) << 8) | buf[dataStart + 1]);
        const h = 1 + (((buf[dataStart + 4] & 0xf) << 10) | (buf[dataStart + 3] << 2) | ((buf[dataStart + 2] & 0xc0) >> 6));
        return { width: w, height: h, bytes: buf.length };
      }
      if (chunkId === "VP8X" && dataStart + 14 <= buf.length) {
        const w = 1 + buf.readUIntLE(dataStart + 4, 3);
        const h = 1 + buf.readUIntLE(dataStart + 7, 3);
        return { width: w, height: h, bytes: buf.length };
      }

      p = dataEnd + (chunkSize % 2); // RIFF chunks are padded to even
    }
    return null;
  }

  return null;
}

function median(nums) {
  const a = nums.filter(n => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

async function computeBaselineFromDb(sampleLimit = 40) {
  const { rows } = await pool.query(
    `SELECT cover_url
     FROM books
     WHERE cover_url IS NOT NULL
       AND cover_url LIKE 'https://%'
     ORDER BY random()
     LIMIT $1`,
    [sampleLimit]
  );

  const dims = [];
  for (const r of rows) {
    try {
      const d = await Promise.race([
        probeImageDimensions(r.cover_url),
        new Promise((_, reject) => setTimeout(() => reject(new Error("baseline probe timeout")), 5000)),
      ]);
      if (d?.width && d?.height) dims.push(d);
      if (dims.length >= 12) break;
    } catch {
      // ignore
    }
  }

  const mw = median(dims.map(d => d.width));
  const mh = median(dims.map(d => d.height));
  if (!mw || !mh) {
    // sensible defaults for Google Books thumbnails
    return { mw: 128, mh: 192, tolW: 0.35, tolH: 0.35, minBytes: 5000 };
  }

  return {
    mw,
    mh,
    tolW: 0.35,
    tolH: 0.35,
    minBytes: 5000,
  };
}

function isCloseEnough(dim, baseline) {
  if (!dim) return false;
  if (dim.bytes < baseline.minBytes) return false;
  const wOk = Math.abs(dim.width - baseline.mw) / baseline.mw <= baseline.tolW;
  const hOk = Math.abs(dim.height - baseline.mh) / baseline.mh <= baseline.tolH;
  // also guard extreme aspect ratios
  const ar = dim.width / dim.height;
  const targetAr = baseline.mw / baseline.mh;
  const arOk = Math.abs(ar - targetAr) / targetAr <= 0.45;
  return wOk && hOk && arOk;
}

function scoreAgainstBaseline(dim, baseline) {
  if (!dim?.width || !dim?.height) return Number.POSITIVE_INFINITY;
  const dw = Math.abs(dim.width - baseline.mw) / baseline.mw;
  const dh = Math.abs(dim.height - baseline.mh) / baseline.mh;
  const targetAr = baseline.mw / baseline.mh;
  const ar = dim.width / dim.height;
  const dar = Math.abs(ar - targetAr) / targetAr;
  // bytes are a weak tie-breaker (bigger usually better), but keep it small vs geometry
  const bytePenalty = dim.bytes < baseline.minBytes ? 10 : 0;
  return dw + dh + (0.75 * dar) + bytePenalty;
}

async function pickBestCoverUrl(urls, baseline) {
  const uniq = [...new Set(urls.filter(Boolean))];
  const scored = [];

  for (const url of uniq) {
    const dim = await probeImageDimensions(url).catch(() => null);
    if (!dim?.width || !dim?.height) continue;
    if (dim.width < 80 || dim.height < 120) continue;
    if (dim.bytes < Math.min(baseline.minBytes, 2500)) continue;
    scored.push({ url, dim, strict: isCloseEnough(dim, baseline), score: scoreAgainstBaseline(dim, baseline) });
  }

  if (!scored.length) return null;

  const strict = scored.filter(s => s.strict).sort((a, b) => a.score - b.score);
  const poolPick = strict.length ? strict : scored;
  poolPick.sort((a, b) => a.score - b.score);
  return poolPick[0].url;
}

async function tryPickCover(title, author, baseline) {
  const directRaw = await fetchCoverFromGoogle(title, author);
  const direct = directRaw ? normalizeGoogleCoverUrl(directRaw) : null;

  const gidFromDirect = direct ? extractGoogleBooksIdFromUrl(directRaw || direct) : null;
  const gid = (await findGoogleBookId(title, author)) || gidFromDirect;
  if (!gid && !direct) return null;

  const candidates = [];
  if (direct) candidates.push(direct);
  if (gid) {
    candidates.push(
      `https://books.google.com/books/content/images/frontcover/${gid}?fife=w400-h600&source=gbs_api`,
      `https://books.google.com/books/content/images/frontcover/${gid}?fife=w300-h450&source=gbs_api`,
      `https://books.google.com/books/content/images/frontcover/${gid}?fife=w200-h300&source=gbs_api`
    );
  }

  const best = await pickBestCoverUrl(candidates, baseline);
  if (!best) return null;
  return { coverUrl: best, googleBooksId: gid || gidFromDirect };
}

async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
}

/**
 * Background job: fills cover_url (and optionally google_books_id) for books missing covers.
 * It is intentionally rate-limited to reduce Google Books throttling risk.
 */
async function backfillMissingCovers({ limit = 80, delayMs = 900 } = {}) {
  const baseline = await computeBaselineFromDb(40);
  console.log(
    `🖼️ coverBackfill: baseline mw=${baseline.mw?.toFixed?.(1) ?? baseline.mw} mh=${baseline.mh?.toFixed?.(1) ?? baseline.mh}`
  );

  const { rows } = await pool.query(
    `SELECT id, title, author
     FROM books
     WHERE cover_url IS NULL
     ORDER BY id ASC
     LIMIT $1`,
    [limit]
  );

  if (!rows.length) return { processed: 0, updated: 0 };

  let updated = 0;
  for (const b of rows) {
    try {
      const picked = await tryPickCover(b.title, b.author, baseline);
      if (picked?.coverUrl) {
        await pool.query(
          `UPDATE books
           SET cover_url = $2,
               google_books_id = COALESCE(google_books_id, $3)
           WHERE id = $1 AND cover_url IS NULL`,
          [b.id, picked.coverUrl, picked.googleBooksId]
        );
        updated++;
      }
    } catch (e) {
      console.warn(`coverBackfill: skip id=${b.id}`, e?.message || e);
    }
    await sleep(delayMs);
  }

  return { processed: rows.length, updated };
}

function startCoverBackfillLoop() {
  // fire-and-forget; never crash the server
  setImmediate(async () => {
    try {
      console.log("🖼️ coverBackfill: started");
      // first pass quickly after boot
      const r1 = await backfillMissingCovers({ limit: 60, delayMs: 900 });
      console.log(`🖼️ coverBackfill: pass1 processed=${r1.processed} updated=${r1.updated}`);

      // second pass for remaining backlog (still limited)
      const r2 = await backfillMissingCovers({ limit: 120, delayMs: 1100 });
      console.log(`🖼️ coverBackfill: pass2 processed=${r2.processed} updated=${r2.updated}`);
    } catch (e) {
      console.warn("coverBackfill failed:", e?.message || e);
    }
  });
}

module.exports = { startCoverBackfillLoop, backfillMissingCovers };
