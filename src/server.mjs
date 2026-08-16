import http from "node:http";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { setupPage } from "./setup-ui.mjs";
import {
  chooseCandidate,
  findEpisodeSourceId,
  findInitialSourceId,
  parsePlayerResponse,
  parseSearchResults,
  streamsFromPlayer
} from "./parsers.mjs";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const APP_VERSION = String(packageMetadata.version);
const CONFIG_FILE = path.resolve(process.env.COMPANION_CONFIG || ".env");
const PERSISTED_KEYS = [
  "COMPANION_KEY",
  "PLUGIN_SETUP_KEY",
  "TMDB_API_KEY",
  "TMDB_BEARER_TOKEN",
  "COMPANION_PUBLIC_URL",
  "STREAM_TIMEOUT_MS"
];

async function loadEnv() {
  try {
    const text = await readFile(CONFIG_FILE, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2];
    }
  } catch {}
}

await loadEnv();

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 43110);
const BROWSER_CHANNEL = process.env.BROWSER_CHANNEL || "chrome";
const BASE = "https://www.movieboxpro.app";
const PROFILE_DIR = path.resolve(process.env.MOVIEBOXPRO_PROFILE || "work/movieboxpro-profile");
let browserContext;
let browserPage;
let browserLaunchPromise;
let browserWorkQueue = Promise.resolve();

function publicUrl() {
  return String(process.env.COMPANION_PUBLIC_URL || `http://${HOST}:${PORT}`).replace(/\/$/, "");
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function setupAuthorized(req, url) {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const cookie = parseCookies(req.headers.cookie).companion_session || "";
  const query = url.searchParams.get("key") || "";
  return Boolean(process.env.COMPANION_KEY) && [bearer, cookie, query].includes(process.env.COMPANION_KEY);
}

function sendHtml(res, status, html, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extraHeaders
  });
  res.end(html);
}

async function readJsonBody(req, limit = 16384) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new Error("Request body is too large");
  }
  return body ? JSON.parse(body) : {};
}

async function saveEnvValues(values) {
  let text = "";
  try { text = await readFile(CONFIG_FILE, "utf8"); } catch {}
  const lines = text
    ? text.split(/\r?\n/).filter(Boolean)
    : PERSISTED_KEYS.filter((key) => process.env[key] != null).map((key) => `${key}=${process.env[key]}`);
  const updates = new Map(Object.entries(values));
  const next = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !updates.has(match[1])) return line;
    const value = updates.get(match[1]);
    updates.delete(match[1]);
    return `${match[1]}=${value}`;
  });
  for (const [key, value] of updates) next.push(`${key}=${value}`);
  await mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  const temporary = `${CONFIG_FILE}.tmp`;
  await writeFile(temporary, `${next.join("\n")}\n`, { mode: 0o600 });
  await rename(temporary, CONFIG_FILE);
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
}

async function ensureBrowser() {
  if (browserContext) {
    if (browserPage && !browserPage.isClosed()) return browserPage;
    browserPage = browserContext.pages().find((page) => !page.isClosed()) || await browserContext.newPage();
    return browserPage;
  }
  if (browserLaunchPromise) return browserLaunchPromise;

  browserLaunchPromise = (async () => {
    await mkdir(PROFILE_DIR, { recursive: true });
    const launchOptions = {
      headless: false,
      viewport: null,
      args: ["--start-maximized"]
    };
    if (BROWSER_CHANNEL !== "chromium") launchOptions.channel = BROWSER_CHANNEL;
    const context = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
    browserContext = context;
    context.on("close", () => {
      if (browserContext === context) {
        browserContext = undefined;
        browserPage = undefined;
      }
    });
    browserPage = context.pages()[0] || await context.newPage();
    return browserPage;
  })();

  try {
    return await browserLaunchPromise;
  } finally {
    browserLaunchPromise = undefined;
  }
}

function withTimeout(promise, milliseconds, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function serializeBrowserWork(task) {
  const work = browserWorkQueue.then(task, task);
  browserWorkQueue = work.catch(() => {});
  return work;
}

async function openLoginWindow() {
  const page = await ensureBrowser();
  await page.bringToFront();
  await page.goto(`${BASE}/index/login/code_login`, { waitUntil: "domcontentloaded" });
}

async function browserSessionStatus() {
  const page = await ensureBrowser();
  if (!page.url().startsWith(BASE)) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  }
  const result = await page.evaluate(async (base) => {
    try {
      const response = await fetch(`${base}/index/index/fav_count?_=${Date.now()}`, { credentials: "include", cache: "no-store" });
      const text = await response.text();
      return {
        ok: response.ok,
        authenticated: response.ok && text.length < 500 && !/google_login|\/index\/login/i.test(text)
      };
    } catch {
      return { ok: false, authenticated: false };
    }
  }, BASE);
  return result;
}

function requireConfig() {
  for (const key of ["COMPANION_KEY"]) {
    if (!process.env[key] || process.env[key].startsWith("replace-")) throw new Error(`Missing ${key} in .env`);
  }
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) {
    throw new Error("Missing TMDB_API_KEY or TMDB_BEARER_TOKEN in .env");
  }
}

async function tmdbMetadata(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const headers = process.env.TMDB_BEARER_TOKEN
    ? { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` }
    : {};
  let resolvedId = tmdbId;
  if (/^tt\d+$/i.test(tmdbId)) {
    const findUrl = new URL(`https://api.themoviedb.org/3/find/${encodeURIComponent(tmdbId)}`);
    findUrl.searchParams.set("external_source", "imdb_id");
    if (process.env.TMDB_API_KEY) findUrl.searchParams.set("api_key", process.env.TMDB_API_KEY);
    const findResponse = await fetch(findUrl, { headers });
    if (!findResponse.ok) throw new Error(`TMDb external-ID lookup failed (${findResponse.status})`);
    const findData = await findResponse.json();
    const match = type === "tv" ? findData.tv_results?.[0] : findData.movie_results?.[0];
    if (!match?.id) throw new Error("TMDb external-ID lookup found no matching title");
    resolvedId = String(match.id);
  }
  const url = new URL(`https://api.themoviedb.org/3/${type}/${encodeURIComponent(resolvedId)}`);
  if (process.env.TMDB_API_KEY) url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`TMDb lookup failed (${response.status})`);
  const data = await response.json();
  return {
    title: data.title || data.name,
    year: Number(String(data.release_date || data.first_air_date || "").slice(0, 4)) || null,
    runtime: data.runtime || (data.episode_run_time || [])[0] || null,
    mediaType: type
  };
}

async function mbpFetch(path, options = {}) {
  const page = await ensureBrowser();
  if (!page.url().startsWith(BASE)) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  }
  const result = await page.evaluate(async ({ url, method, accept }) => {
    const response = await fetch(url, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: accept,
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      text: await response.text()
    };
  }, {
    url: new URL(path, BASE).href,
    method: options.method || "GET",
    accept: options.accept || "text/html,application/json"
  });
  if (!result.ok) throw new Error(`MovieBoxPro request failed (${result.status})`);
  if (/google_login\.png/i.test(result.text) && !/\/index\/index\/logout/i.test(result.text)) {
    throw new Error("MovieBoxPro login required; open /login on the companion");
  }
  return {
    ok: result.ok,
    status: result.status,
    headers: { get: (name) => name.toLowerCase() === "content-type" ? result.contentType : null },
    text: async () => result.text,
    json: async () => JSON.parse(result.text)
  };
}

async function resolveStreams({ tmdbId, mediaType, season, episode }) {
  const metadata = await tmdbMetadata(tmdbId, mediaType);
  const search = await mbpFetch(`/index/search?word=${encodeURIComponent(metadata.title)}&type=${mediaType === "tv" ? "tv" : "movie"}`);
  const candidates = parseSearchResults(await search.text());
  const selected = chooseCandidate(candidates, metadata);
  if (!selected || selected.score < 60) throw new Error("No confident MovieBoxPro title match");

  const detailPath = mediaType === "tv"
    ? `/tvshow/${selected.candidate.id}?season=${Number(season)}&play=1`
    : `/movie/${selected.candidate.id}?play=1`;
  const detail = await mbpFetch(detailPath);
  const detailHtml = await detail.text();
  let sourceId;

  if (mediaType === "tv") {
    const episodesResponse = await mbpFetch(`/index/index/player_tv_episodes?tid=${selected.candidate.id}&season=${Number(season)}`, { accept: "application/json" });
    const episodeData = await episodesResponse.json();
    sourceId = findEpisodeSourceId(episodeData, season, episode) || findInitialSourceId(detailHtml, "tv");
  } else {
    sourceId = findInitialSourceId(detailHtml, "movie");
  }
  if (!sourceId) throw new Error("MovieBoxPro source ID was not found");

  const sourceKey = mediaType === "tv" ? "tfid" : "mfid";
  const playerPath = `/index/index/player?${sourceKey}=${encodeURIComponent(sourceId)}`;
  const player = await mbpFetch(playerPath, { method: "POST", referer: new URL(detailPath, BASE).href });
  const parsed = parsePlayerResponse(await player.text());
  const streams = streamsFromPlayer(parsed, new URL(detailPath, BASE).href);
  if (!streams.length) throw new Error("MovieBoxPro returned no playable streams");
  return streams.map(({ _meta, ...stream }) => stream);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type"
  });
  res.end(JSON.stringify(data));
}

function sendJavaScript(res, source) {
  res.writeHead(200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(source);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return sendJson(res, 204, {});
    if (url.pathname === "/health") return sendJson(res, 200, { ok: true, service: "movieboxpro-companion" });
    const suppliedKey = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const queryKey = url.searchParams.get("key") || "";
    if (url.pathname === "/setup" && req.method === "GET") {
      if (queryKey && process.env.COMPANION_KEY && queryKey === process.env.COMPANION_KEY) {
        res.writeHead(303, {
          Location: "/setup",
          "Cache-Control": "no-store",
          "Set-Cookie": `companion_session=${encodeURIComponent(process.env.COMPANION_KEY)}; HttpOnly; SameSite=Strict; Path=/`
        });
        return res.end();
      }
      if (!setupAuthorized(req, url)) {
        return sendHtml(res, 401, "<!doctype html><meta name=viewport content='width=device-width'><title>Unauthorized</title><style>body{font:16px system-ui;max-width:42rem;margin:12vh auto;padding:1.5rem;background:#0b1020;color:#eef2ff}code{background:#18213b;padding:.2rem .4rem;border-radius:.3rem}</style><h1>Setup access required</h1><p>Open <code>/setup?key=YOUR_COMPANION_KEY</code> once. The key will be removed from the address bar and stored in an HTTP-only local session cookie.</p>");
      }
      return sendHtml(res, 200, setupPage());
    }
    if (url.pathname.startsWith("/api/setup/")) {
      if (!setupAuthorized(req, url)) return sendJson(res, 401, { error: "Unauthorized" });
      if (url.pathname === "/api/setup/state" && req.method === "GET") {
        return sendJson(res, 200, {
          service: "ready",
          host: HOST,
          port: PORT,
          publicUrl: publicUrl(),
          tmdbConfigured: Boolean(process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN),
          companionKeyConfigured: Boolean(process.env.COMPANION_KEY),
          pluginKeyConfigured: Boolean(process.env.PLUGIN_SETUP_KEY),
          docker: BROWSER_CHANNEL === "chromium",
          noVncUrl: `http://${String(req.headers.host || "localhost").split(":")[0]}:6080/vnc.html`
        });
      }
      if (url.pathname === "/api/setup/moviebox-status" && req.method === "GET") {
        return sendJson(res, 200, await serializeBrowserWork(browserSessionStatus));
      }
      if (url.pathname === "/api/setup/login" && req.method === "POST") {
        await serializeBrowserWork(openLoginWindow);
        return sendJson(res, 200, { ok: true });
      }
      if (url.pathname === "/api/setup/plugin-url" && req.method === "GET") {
        if (!process.env.PLUGIN_SETUP_KEY) return sendJson(res, 409, { error: "PLUGIN_SETUP_KEY is not configured" });
        return sendJson(res, 200, {
          url: `${publicUrl()}/manifest.json?key=${encodeURIComponent(process.env.PLUGIN_SETUP_KEY)}`
        });
      }
      if (url.pathname === "/api/setup/config" && req.method === "POST") {
        const body = await readJsonBody(req);
        const updates = {};
        if (typeof body.publicUrl === "string" && body.publicUrl.trim()) {
          const parsed = new URL(body.publicUrl.trim());
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Public URL must use http or https");
          updates.COMPANION_PUBLIC_URL = parsed.href.replace(/\/$/, "");
        }
        if (typeof body.tmdbApiKey === "string" && body.tmdbApiKey.trim()) {
          const value = body.tmdbApiKey.trim();
          if (/[\r\n]/.test(value) || value.length > 512) throw new Error("Invalid TMDb API key");
          updates.TMDB_API_KEY = value;
          updates.TMDB_BEARER_TOKEN = "";
        }
        if (!Object.keys(updates).length) return sendJson(res, 400, { error: "No configuration changes supplied" });
        await saveEnvValues(updates);
        return sendJson(res, 200, { ok: true, publicUrl: publicUrl(), tmdbConfigured: Boolean(process.env.TMDB_API_KEY) });
      }
      if (url.pathname === "/api/setup/logout" && req.method === "POST") {
        res.writeHead(204, { "Set-Cookie": "companion_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
        return res.end();
      }
      return sendJson(res, 404, { error: "Not found" });
    }
    if (url.pathname === "/manifest.json" && req.method === "GET") {
      if (!process.env.PLUGIN_SETUP_KEY || queryKey !== process.env.PLUGIN_SETUP_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, {
        name: "MovieBoxPro Local",
        version: APP_VERSION,
        scrapers: [{
          id: "movieboxpro-local",
          name: "MovieBoxPro Local",
          description: "Streams from your own MovieBoxPro account through your private companion",
          version: APP_VERSION,
          author: "Local",
          supportedTypes: ["movie", "tv"],
          filename: `providers/movieboxpro-local.js?key=${encodeURIComponent(process.env.PLUGIN_SETUP_KEY)}`,
          enabled: true,
          formats: ["m3u8", "mp4", "mkv"],
          contentLanguage: ["en"]
        }]
      });
    }
    if (url.pathname === "/providers/movieboxpro-local.js" && req.method === "GET") {
      if (!process.env.PLUGIN_SETUP_KEY || queryKey !== process.env.PLUGIN_SETUP_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      requireConfig();
      const template = await readFile(new URL("../provider/movieboxpro-local.js", import.meta.url), "utf8");
      const source = template
        .replace("__COMPANION_URL__", JSON.stringify(publicUrl()))
        .replace("__COMPANION_KEY__", JSON.stringify(process.env.COMPANION_KEY));
      return sendJavaScript(res, source);
    }
    if (url.pathname === "/login" && req.method === "GET") {
      if (!process.env.COMPANION_KEY || queryKey !== process.env.COMPANION_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      await serializeBrowserWork(openLoginWindow);
      return sendJson(res, 200, { ok: true, message: "Complete login in the dedicated Chrome window, then check /status." });
    }
    if (url.pathname === "/status" && req.method === "GET") {
      if (!process.env.COMPANION_KEY || queryKey !== process.env.COMPANION_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, await serializeBrowserWork(browserSessionStatus));
    }
    if (url.pathname !== "/streams" || req.method !== "GET") return sendJson(res, 404, { error: "Not found" });

    requireConfig();
    if (suppliedKey !== process.env.COMPANION_KEY) return sendJson(res, 401, { error: "Unauthorized" });

    const rawType = String(url.searchParams.get("mediaType") || "movie").toLowerCase();
    const mediaType = /tv|series|show|episode/.test(rawType) ? "tv" : "movie";
    const rawTmdbId = String(url.searchParams.get("tmdbId") || "");
    const imdbMatch = rawTmdbId.match(/tt\d+/i);
    const tmdbId = imdbMatch ? imdbMatch[0].toLowerCase() : (rawTmdbId.match(/\d+/) || [""])[0];
    const params = {
      tmdbId,
      mediaType,
      season: url.searchParams.get("season"),
      episode: url.searchParams.get("episode")
    };
    if (!params.tmdbId || (mediaType === "tv" && (!params.season || !params.episode))) {
      return sendJson(res, 400, { error: "Missing media parameters" });
    }
    console.log(`[companion] stream request tmdb=${params.tmdbId} type=${params.mediaType}` +
      (params.mediaType === "tv" ? ` season=${Number(params.season)} episode=${Number(params.episode)}` : ""));
    return sendJson(res, 200, await withTimeout(
      serializeBrowserWork(() => resolveStreams(params)),
      Number(process.env.STREAM_TIMEOUT_MS || 45000),
      "Stream lookup timed out"
    ));
  } catch (error) {
    // Deliberately do not log request headers, cookies, URLs, or response bodies.
    console.error(`[companion] ${error.message}`);
    return sendJson(res, 502, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MovieBoxPro companion listening on http://${HOST}:${PORT}`);
  console.log("Use /login?key=<COMPANION_KEY> to open the dedicated MovieBoxPro login window.");
  console.log("Use /setup?key=<COMPANION_KEY> for the guided setup dashboard.");
});

async function shutdown() {
  if (browserLaunchPromise) await browserLaunchPromise.catch(() => {});
  if (browserContext) await browserContext.close().catch(() => {});
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
