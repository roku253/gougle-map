/**
 * Gougle Map ローカル開発サーバー
 * - 静的ファイル配信
 * - POST /api/map-data で data/map-data.json を上書き保存
 * - POST /api/poi-icons で data/poi-icons.json を上書き保存
 * - POST /api/pin-photo で img/pin-photos/ にピン写真を保存
 *
 * 既定ポート 5199（3000/3456 等と競合しにくい番号）。使用中なら 5200〜5209 を試す。
 * 環境変数 GOUGLE_MAP_DEV_PORT で変更可。
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MAP_DATA_PATH = path.join(ROOT, "data", "map-data.json");
const POI_ICONS_PATH = path.join(ROOT, "data", "poi-icons.json");
const PIN_PHOTOS_DIR = path.join(ROOT, "img", "pin-photos");
const HOST = "127.0.0.1";
const BASE_PORT = parseInt(process.env.GOUGLE_MAP_DEV_PORT || "5199", 10);
const MAX_PORT_TRIES = 10;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const PIN_PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function sanitizePinId(pinId) {
  const id = String(pinId || "").trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

function removePinPhotoFiles(pinId) {
  for (const ext of PIN_PHOTO_EXTS) {
    const abs = path.join(PIN_PHOTOS_DIR, pinId + ext);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function createHandler() {
  return async (req, res) => {
    const urlPath = (req.url || "/").split("?")[0];

    if (req.method === "POST" && urlPath === "/api/map-data") {
      try {
        const raw = await readBody(req);
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.pins) || !data.region) {
          sendJson(res, 400, { ok: false, error: "pins と region が必要です" });
          return;
        }
        const normalized = {
          version: data.version || 1,
          settings: data.settings || {
            pinsDefaultMinZoom: 12,
            regionDefaultMinZoom: 12,
            extraDefaultMinZoom: 13,
          },
          pins: data.pins,
          region: data.region,
          fictionExtraLabels: Array.isArray(data.fictionExtraLabels) ? data.fictionExtraLabels : [],
        };
        fs.writeFileSync(MAP_DATA_PATH, JSON.stringify(normalized, null, 2) + "\n", "utf8");
        sendJson(res, 200, { ok: true, path: "data/map-data.json" });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    if (req.method === "POST" && urlPath === "/api/pin-photo") {
      try {
        const raw = await readBody(req);
        const data = JSON.parse(raw);
        const pinId = sanitizePinId(data.pinId);
        if (!pinId) {
          sendJson(res, 400, { ok: false, error: "pinId が不正です" });
          return;
        }
        if (!fs.existsSync(PIN_PHOTOS_DIR)) {
          fs.mkdirSync(PIN_PHOTOS_DIR, { recursive: true });
        }
        if (data.delete) {
          removePinPhotoFiles(pinId);
          sendJson(res, 200, { ok: true, heroImage: null });
          return;
        }
        const m = String(data.dataUrl || "").match(/^data:image\/(\w+);base64,(.+)$/);
        if (!m) {
          sendJson(res, 400, { ok: false, error: "dataUrl が必要です" });
          return;
        }
        const ext = m[1] === "jpeg" ? "jpg" : m[1].toLowerCase();
        if (!["jpg", "png", "webp", "gif"].includes(ext)) {
          sendJson(res, 400, { ok: false, error: "対応形式: JPEG, PNG, WebP, GIF" });
          return;
        }
        removePinPhotoFiles(pinId);
        const rel = `img/pin-photos/${pinId}.${ext}`;
        const abs = path.join(ROOT, rel);
        fs.writeFileSync(abs, Buffer.from(m[2], "base64"));
        sendJson(res, 200, { ok: true, heroImage: rel });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    if (req.method === "POST" && urlPath === "/api/poi-icons") {
      try {
        const raw = await readBody(req);
        const data = JSON.parse(raw);
        if (!data || !data.icons || typeof data.icons !== "object") {
          sendJson(res, 400, { ok: false, error: "icons が必要です" });
          return;
        }
        const normalized = {
          version: data.version || 1,
          poiKindFallback: data.poiKindFallback || {},
          icons: data.icons,
        };
        fs.writeFileSync(POI_ICONS_PATH, JSON.stringify(normalized, null, 2) + "\n", "utf8");
        sendJson(res, 200, { ok: true, path: "data/poi-icons.json" });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: String(err.message || err) });
      }
      return;
    }

    let filePath = urlPath === "/" ? "/index.html" : urlPath;
    const abs = path.normalize(path.join(ROOT, filePath));
    if (!abs.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(abs, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(abs).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  };
}

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(createHandler());
    server.on("error", (err) => reject(err));
    server.listen(port, HOST, () => resolve({ server, port }));
  });
}

async function main() {
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = BASE_PORT + i;
    try {
      const { server, port: bound } = await tryListen(port);
      const url = `http://${HOST}:${bound}/?full=1`;
      console.log("");
      console.log("Gougle Map dev server");
      console.log("  " + url);
      if (bound !== BASE_PORT) {
        console.log("");
        console.log(`  ※ ポート ${BASE_PORT} は使用中のため ${bound} で起動しています`);
        console.log(`    古いサーバーが残っていると保存が失敗します。上記 URL で開いてください`);
      }
      console.log("");
      console.log("編集: Gougle ロゴを10回クリック → 編集パネル（アイコンは「反映して保存」）");
      console.log("停止: Ctrl+C");
      console.log("");
      server.on("close", () => process.exit(0));
      return;
    } catch (err) {
      if (err.code !== "EADDRINUSE") throw err;
    }
  }
  console.error(`ポート ${BASE_PORT}〜${BASE_PORT + MAX_PORT_TRIES - 1} はすべて使用中です`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
