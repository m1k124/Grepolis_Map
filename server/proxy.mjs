import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const host = process.env.GREPOLIS_PROXY_HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT ?? 5175);
const distDir = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const tableNames = ["players", "alliances", "islands", "towns"];
const requestTimeoutMs = 15000;
const allowedOrigins = new Set(["http://127.0.0.1:5174", "http://localhost:5174"]);

const server = createServer(async (request, response) => {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, mode: "web" });
    return;
  }

  const match = url.pathname.match(/^\/api\/world\/([a-z]{2}\d+)$/i);
  if (request.method === "GET" && match) {
    const serverId = match[1].toLowerCase();

    try {
      const tables = await fetchWorldTables(serverId);
      sendJson(response, 200, {
        serverId,
        loadedAt: new Date().toISOString(),
        tables,
      });
    } catch (error) {
      sendJson(response, 502, {
        error: `Impossible de charger ${serverId}.`,
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 404, { error: "Route inconnue." });
    return;
  }

  await serveStatic(url, response);
});

server.listen(port, host, () => {
  console.log(`Grepolis Map pret sur http://${host}:${port}`);
});

async function fetchWorldTables(serverId) {
  const baseUrl = `https://${serverId}.grepolis.com/data`;
  const entries = await Promise.all(
    tableNames.map(async (tableName) => [tableName, await fetchText(`${baseUrl}/${tableName}.txt`)]),
  );

  return Object.fromEntries(entries);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "GrepolisMapLocalProxy/0.1",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${url} a repondu ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
  }
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("vary", "origin");
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function serveStatic(url, response) {
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = safeDistPath(requestedPath);

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    });
    response.end(content);
  } catch {
    try {
      const fallback = await readFile(join(distDir, "index.html"));
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      });
      response.end(fallback);
    } catch {
      sendJson(response, 404, { error: "Build frontend introuvable. Lance npm run build." });
    }
  }
}

function safeDistPath(pathname) {
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(distDir, normalized));

  if (!filePath.startsWith(distDir)) {
    return join(distDir, "index.html");
  }

  return filePath;
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
