import http from "node:http";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  chooseCandidate,
  findEpisodeSourceId,
  findInitialSourceId,
  parsePlayerResponse,
  parseSearchResults,
  streamsFromPlayer
} from "./parsers.mjs";

async function loadEnv() {
  try {
    const text = await readFile(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {}
}

await loadEnv();

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 43110);
const BASE = "https://www.movieboxpro.app";
const PROFILE_DIR = path.resolve(process.env.MOVIEBOXPRO_PROFILE || "work/movieboxpro-profile");
let browserContext;
let browserPage;

async function ensureBrowser() {
  if (browserContext && browserPage && !browserPage.isClosed()) return browserPage;
  await mkdir(PROFILE_DIR, { recursive: true });
  browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless: false,
    viewport: null,
    args: ["--start-maximized"]
  });
  browserPage = browserContext.pages()[0] || await browserContext.newPage();
  return browserPage;
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
    if (url.pathname === "/manifest.json" && req.method === "GET") {
      if (!process.env.PLUGIN_SETUP_KEY || queryKey !== process.env.PLUGIN_SETUP_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, {
        name: "MovieBoxPro Local",
        version: "0.1.0",
        scrapers: [{
          id: "movieboxpro-local",
          name: "MovieBoxPro Local",
          description: "Streams from your own MovieBoxPro account through your Mac companion",
          version: "0.1.0",
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
        .replace("__COMPANION_URL__", JSON.stringify(`http://${HOST}:${PORT}`))
        .replace("__COMPANION_KEY__", JSON.stringify(process.env.COMPANION_KEY));
      return sendJavaScript(res, source);
    }
    if (url.pathname === "/login" && req.method === "GET") {
      if (!process.env.COMPANION_KEY || queryKey !== process.env.COMPANION_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      await openLoginWindow();
      return sendJson(res, 200, { ok: true, message: "Complete login in the dedicated Chrome window, then check /status." });
    }
    if (url.pathname === "/status" && req.method === "GET") {
      if (!process.env.COMPANION_KEY || queryKey !== process.env.COMPANION_KEY) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, await browserSessionStatus());
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
    return sendJson(res, 200, await resolveStreams(params));
  } catch (error) {
    // Deliberately do not log request headers, cookies, URLs, or response bodies.
    console.error(`[companion] ${error.message}`);
    return sendJson(res, 502, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MovieBoxPro companion listening on http://${HOST}:${PORT}`);
  console.log("Use /login?key=<COMPANION_KEY> to open the dedicated MovieBoxPro login window.");
});

async function shutdown() {
  if (browserContext) await browserContext.close().catch(() => {});
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
