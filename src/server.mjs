import http from "node:http";
import { Readable } from "node:stream";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { setupPage } from "./setup-ui.mjs";
import { matchPrivateRepositoryPath, privateRepositoryUrl, repositoryManifest } from "./repository.mjs";
import {
  chooseCandidate,
  findEpisodeSourceId,
  findInitialSourceId,
  parsePlayerResponse,
  parseSearchResults,
  streamsFromPlayer
} from "./parsers.mjs";
import {
  catalogManifest,
  loadCatalog,
  loadMeta,
  matchCatalogRequestPath,
  parseSeeds,
  parseMovieSeeds,
  parseCatalogConfig,
  resolveSeedShows,
  resolveSeedMovies,
  getCacheStats
} from "./catalogs.mjs";
import {
  getProfiles,
  getProfileById,
  getProfileByCompanionKey,
  getProfileByPluginKey,
  createProfile,
  updateProfile,
  deleteProfile,
  saveProfiles
} from "./profiles.mjs";
import {
  loginNuvioCloud,
  fetchNuvioProfiles,
  syncNuvioCloudLibrary
} from "./nuvio-cloud.mjs";
import {
  resolveImdbIdForShow,
  fetchIntroSegments,
  attachIntroSegmentsToStreams
} from "./introdb.mjs";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const APP_VERSION = String(packageMetadata.version);
const CONFIG_FILE = path.resolve(process.env.COMPANION_CONFIG || ".env");
const PERSISTED_KEYS = [
  "COMPANION_KEY",
  "PLUGIN_SETUP_KEY",
  "TMDB_API_KEY",
  "TMDB_BEARER_TOKEN",
  "COMPANION_PUBLIC_URL",
  "STREAM_TIMEOUT_MS",
  "RECOMMENDATION_SEEDS",
  "MOVIE_RECOMMENDATION_SEEDS",
  "DISCOVERY_CATALOGS_CONFIG",
  "USER_TIMEZONE",
  "NUVIO_CLOUD_EMAIL",
  "NUVIO_CLOUD_TOKEN",
  "NUVIO_CLOUD_PROFILE_ID",
  "NUVIO_CLOUD_PROFILE_NAME",
  "NUVIO_CLOUD_LAST_SYNC",
  "NUVIO_CLOUD_URL"
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

const profileSessions = new Map();

export function getProfileSession(profileId = "default", customProfileDir = null) {
  const cleanId = String(profileId || "").toLowerCase().trim() || "default";
  if (!profileSessions.has(cleanId)) {
    const dir = customProfileDir || (cleanId === "default" ? PROFILE_DIR : path.resolve(`work/movieboxpro-profile-${cleanId}`));
    profileSessions.set(cleanId, {
      profileId: cleanId,
      profileDir: dir,
      browserContext: null,
      browserPage: null,
      browserLaunchPromise: null,
      browserWorkQueue: Promise.resolve(),
      lastHealth: { authenticated: false, lastChecked: null, error: null }
    });
  }
  return profileSessions.get(cleanId);
}

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
    "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https://image.tmdb.org; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extraHeaders
  });
  res.end(html);
}

async function readJsonBody(req, limit = 32768) {
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

// Stream Activity & Cache Analytics Ring Buffer
const streamActivityLog = [];
const MAX_ACTIVITY_LOG = 50;
let totalStreamsResolved = 0;
let totalResolutionDurationMs = 0;

export function recordStreamActivity(entry) {
  totalStreamsResolved++;
  totalResolutionDurationMs += Number(entry.durationMs || 0);
  streamActivityLog.unshift({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry
  });
  if (streamActivityLog.length > MAX_ACTIVITY_LOG) {
    streamActivityLog.length = MAX_ACTIVITY_LOG;
  }
}

export function getAnalyticsSummary() {
  const avgDurationMs = totalStreamsResolved > 0 ? Math.round(totalResolutionDurationMs / totalStreamsResolved) : 0;
  return {
    totalStreamsResolved,
    avgDurationMs,
    cacheStats: getCacheStats(),
    recentActivity: streamActivityLog
  };
}

async function ensureBrowser(session = getProfileSession("default")) {
  if (session.browserContext) {
    if (session.browserPage && !session.browserPage.isClosed()) return session.browserPage;
    session.browserPage = session.browserContext.pages().find((page) => !page.isClosed()) || await session.browserContext.newPage();
    return session.browserPage;
  }
  if (session.browserLaunchPromise) return session.browserLaunchPromise;

  session.browserLaunchPromise = (async () => {
    await mkdir(session.profileDir, { recursive: true });
    const launchOptions = {
      headless: false,
      viewport: null,
      args: ["--start-maximized"]
    };
    if (BROWSER_CHANNEL !== "chromium") launchOptions.channel = BROWSER_CHANNEL;
    const context = await chromium.launchPersistentContext(session.profileDir, launchOptions);
    session.browserContext = context;
    context.on("close", () => {
      if (session.browserContext === context) {
        session.browserContext = undefined;
        session.browserPage = undefined;
      }
    });
    session.browserPage = context.pages()[0] || await context.newPage();
    return session.browserPage;
  })();

  try {
    return await session.browserLaunchPromise;
  } finally {
    session.browserLaunchPromise = undefined;
  }
}

function withTimeout(promise, milliseconds, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function serializeBrowserWork(task, session = getProfileSession("default")) {
  const work = session.browserWorkQueue.then(task, task);
  session.browserWorkQueue = work.catch(() => {});
  return work;
}

async function openLoginWindow(profileId = "default") {
  const session = getProfileSession(profileId);
  const page = await ensureBrowser(session);
  await page.bringToFront();
  await page.goto(`${BASE}/index/login/code_login`, { waitUntil: "domcontentloaded" });
}

async function browserSessionStatus(profileId = "default") {
  const session = getProfileSession(profileId);
  const page = await ensureBrowser(session);
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
  session.lastHealth = {
    authenticated: Boolean(result?.authenticated),
    lastChecked: new Date().toISOString(),
    error: null
  };
  return result;
}

let backgroundSyncTimer;
let sessionCheckTimer;

export async function checkSessionHealth(profileId = "default") {
  const session = getProfileSession(profileId);
  try {
    const status = await serializeBrowserWork(() => browserSessionStatus(profileId), session);
    session.lastHealth = {
      authenticated: Boolean(status?.authenticated),
      lastChecked: new Date().toISOString(),
      error: null
    };
  } catch (err) {
    session.lastHealth = {
      authenticated: false,
      lastChecked: new Date().toISOString(),
      error: err.message
    };
  }
  return session.lastHealth;
}

export async function performAutoCloudSync() {
  if (!process.env.NUVIO_CLOUD_TOKEN) return null;
  try {
    const profileId = process.env.NUVIO_CLOUD_PROFILE_ID || 1;
    const syncResult = await syncNuvioCloudLibrary({
      accessToken: process.env.NUVIO_CLOUD_TOKEN,
      profileId,
      cloudUrl: process.env.NUVIO_CLOUD_URL
    });
    await saveEnvValues({
      NUVIO_CLOUD_LAST_SYNC: syncResult.syncedAt,
      RECOMMENDATION_SEEDS: JSON.stringify(syncResult.seriesSeeds),
      MOVIE_RECOMMENDATION_SEEDS: JSON.stringify(syncResult.movieSeeds)
    });
    console.log(`[AutoSync] Background synced ${syncResult.itemCount} items from Nuvio Cloud at ${syncResult.syncedAt}`);
    return syncResult;
  } catch (err) {
    console.warn(`[AutoSync] Background sync error: ${err.message}`);
    return null;
  }
}

export function startBackgroundJobs() {
  if (backgroundSyncTimer) clearInterval(backgroundSyncTimer);
  if (sessionCheckTimer) clearInterval(sessionCheckTimer);

  // Background Cloud Sync every 6 hours
  backgroundSyncTimer = setInterval(performAutoCloudSync, 6 * 60 * 60 * 1000);
  backgroundSyncTimer.unref();

  // Periodic Session Health Check every 60 minutes
  sessionCheckTimer = setInterval(() => {
    if (process.env.COMPANION_KEY) {
      checkSessionHealth("default").catch(() => {});
    }
  }, 60 * 60 * 1000);
  sessionCheckTimer.unref();
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

async function mbpFetch(path, options = {}, profileId = "default") {
  const session = getProfileSession(profileId);
  const page = await ensureBrowser(session);
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

async function resolveStreams({ tmdbId, mediaType, season, episode }, profileId = "default") {
  const metadata = await tmdbMetadata(tmdbId, mediaType);
  const search = await mbpFetch(`/index/search?word=${encodeURIComponent(metadata.title)}&type=${mediaType === "tv" ? "tv" : "movie"}`, {}, profileId);
  const candidates = parseSearchResults(await search.text());
  const selected = chooseCandidate(candidates, metadata);
  if (!selected || selected.score < 60) throw new Error("No confident MovieBoxPro title match");

  const detailPath = mediaType === "tv"
    ? `/tvshow/${selected.candidate.id}?season=${Number(season)}&play=1`
    : `/movie/${selected.candidate.id}?play=1`;
  const detail = await mbpFetch(detailPath, {}, profileId);
  const detailHtml = await detail.text();
  let sourceId;

  if (mediaType === "tv") {
    const episodesResponse = await mbpFetch(`/index/index/player_tv_episodes?tid=${selected.candidate.id}&season=${Number(season)}`, { accept: "application/json" }, profileId);
    const episodeData = await episodesResponse.json();
    sourceId = findEpisodeSourceId(episodeData, season, episode) || findInitialSourceId(detailHtml, "tv");
  } else {
    sourceId = findInitialSourceId(detailHtml, "movie");
  }
  if (!sourceId) throw new Error("MovieBoxPro source ID was not found");

  const sourceKey = mediaType === "tv" ? "tfid" : "mfid";
  const playerPath = `/index/index/player?${sourceKey}=${encodeURIComponent(sourceId)}`;
  const player = await mbpFetch(playerPath, { method: "POST", referer: new URL(detailPath, BASE).href }, profileId);
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

    // 1. Guided Setup Dashboard
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

    // 2. Setup APIs
    if (url.pathname.startsWith("/api/setup/")) {
      if (!setupAuthorized(req, url)) return sendJson(res, 401, { error: "Unauthorized" });

      if (url.pathname === "/api/setup/state" && req.method === "GET") {
        const profiles = await getProfiles();
        return sendJson(res, 200, {
          service: "ready",
          host: HOST,
          port: PORT,
          publicUrl: publicUrl(),
          tmdbConfigured: Boolean(process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN),
          companionKeyConfigured: Boolean(process.env.COMPANION_KEY),
          pluginKeyConfigured: Boolean(process.env.PLUGIN_SETUP_KEY),
          recommendationSeeds: parseSeeds(),
          movieRecommendationSeeds: parseMovieSeeds(),
          catalogsConfig: parseCatalogConfig(),
          userTimezone: process.env.USER_TIMEZONE || "",
          detectedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          profiles: profiles.map((p) => ({
            id: p.id,
            name: p.name,
            userTimezone: p.userTimezone,
            seedCount: (p.recommendationSeeds?.length || 0) + (p.movieRecommendationSeeds?.length || 0),
            nuvioCloudConnected: Boolean(p.nuvioCloud?.connected),
            pluginUrl: privateRepositoryUrl(publicUrl(), p.pluginSetupKey),
            catalogUrl: `${publicUrl()}/catalog/${encodeURIComponent(p.pluginSetupKey)}/manifest.json`
          })),
          nuvioCloud: {
            connected: Boolean(process.env.NUVIO_CLOUD_TOKEN || process.env.NUVIO_CLOUD_EMAIL),
            email: process.env.NUVIO_CLOUD_EMAIL || "",
            profileId: process.env.NUVIO_CLOUD_PROFILE_ID || "1",
            profileName: process.env.NUVIO_CLOUD_PROFILE_NAME || "Default Profile",
            lastSync: process.env.NUVIO_CLOUD_LAST_SYNC || null
          },
          docker: BROWSER_CHANNEL === "chromium",
          noVncUrl: `http://${String(req.headers.host || "localhost").split(":")[0]}:6080/vnc.html`
        });
      }

      // Profiles API
      if (url.pathname === "/api/setup/profiles" && req.method === "GET") {
        const profiles = await getProfiles();
        return sendJson(res, 200, {
          profiles: profiles.map((p) => ({
            ...p,
            pluginUrl: privateRepositoryUrl(publicUrl(), p.pluginSetupKey),
            catalogUrl: `${publicUrl()}/catalog/${encodeURIComponent(p.pluginSetupKey)}/manifest.json`
          }))
        });
      }

      if (url.pathname === "/api/setup/profiles" && req.method === "POST") {
        const body = await readJsonBody(req);
        const created = await createProfile(body);
        return sendJson(res, 201, {
          ok: true,
          profile: {
            ...created,
            pluginUrl: privateRepositoryUrl(publicUrl(), created.pluginSetupKey),
            catalogUrl: `${publicUrl()}/catalog/${encodeURIComponent(created.pluginSetupKey)}/manifest.json`
          }
        });
      }

      const profileMatch = url.pathname.match(/^\/api\/setup\/profiles\/([a-z0-9_-]+)(?:\/(.*))?$/i);
      if (profileMatch) {
        const targetId = profileMatch[1];
        const subAction = profileMatch[2] || "";

        if (!subAction && req.method === "GET") {
          const profile = await getProfileById(targetId);
          if (!profile) return sendJson(res, 404, { error: "Profile not found" });
          return sendJson(res, 200, {
            profile: {
              ...profile,
              pluginUrl: privateRepositoryUrl(publicUrl(), profile.pluginSetupKey),
              catalogUrl: `${publicUrl()}/catalog/${encodeURIComponent(profile.pluginSetupKey)}/manifest.json`
            }
          });
        }

        if (!subAction && req.method === "PUT") {
          const body = await readJsonBody(req);
          const updated = await updateProfile(targetId, body);
          return sendJson(res, 200, { ok: true, profile: updated });
        }

        if (!subAction && req.method === "DELETE") {
          await deleteProfile(targetId);
          return sendJson(res, 200, { ok: true });
        }

        if (subAction === "login" && req.method === "POST") {
          const profile = await getProfileById(targetId);
          if (!profile) return sendJson(res, 404, { error: "Profile not found" });
          const session = getProfileSession(profile.id, profile.browserProfileDir);
          await serializeBrowserWork(() => openLoginWindow(profile.id), session);
          return sendJson(res, 200, { ok: true });
        }

        if (subAction === "status" && req.method === "GET") {
          const profile = await getProfileById(targetId);
          if (!profile) return sendJson(res, 404, { error: "Profile not found" });
          const session = getProfileSession(profile.id, profile.browserProfileDir);
          return sendJson(res, 200, await serializeBrowserWork(() => browserSessionStatus(profile.id), session));
        }
      }

      // Stream Activity & Cache Analytics API
      if (url.pathname === "/api/setup/analytics" && req.method === "GET") {
        return sendJson(res, 200, getAnalyticsSummary());
      }

      // Backup & Restore APIs
      if (url.pathname === "/api/setup/backup" && req.method === "GET") {
        const profiles = await getProfiles();
        const backupData = {
          formatVersion: 1,
          appVersion: APP_VERSION,
          exportedAt: new Date().toISOString(),
          profiles,
          config: {
            publicUrl: process.env.COMPANION_PUBLIC_URL || "",
            userTimezone: process.env.USER_TIMEZONE || "",
            catalogsConfig: parseCatalogConfig(),
            recommendationSeeds: parseSeeds(),
            movieRecommendationSeeds: parseMovieSeeds()
          }
        };
        return sendJson(res, 200, backupData);
      }

      if (url.pathname === "/api/setup/restore" && req.method === "POST") {
        const body = await readJsonBody(req);
        if (!body || typeof body !== "object" || !Array.isArray(body.profiles)) {
          return sendJson(res, 400, { error: "Invalid backup format: missing profiles array" });
        }

        await saveProfiles(body.profiles);

        const envUpdates = {};
        if (body.config?.publicUrl) envUpdates.COMPANION_PUBLIC_URL = body.config.publicUrl;
        if (body.config?.userTimezone) envUpdates.USER_TIMEZONE = body.config.userTimezone;
        if (body.config?.catalogsConfig) envUpdates.DISCOVERY_CATALOGS_CONFIG = JSON.stringify(body.config.catalogsConfig);
        if (body.config?.recommendationSeeds) envUpdates.RECOMMENDATION_SEEDS = JSON.stringify(body.config.recommendationSeeds);
        if (body.config?.movieRecommendationSeeds) envUpdates.MOVIE_RECOMMENDATION_SEEDS = JSON.stringify(body.config.movieRecommendationSeeds);

        if (Object.keys(envUpdates).length) {
          await saveEnvValues(envUpdates);
        }

        return sendJson(res, 200, {
          ok: true,
          restoredProfilesCount: body.profiles.length,
          restoredAt: new Date().toISOString()
        });
      }

      if (url.pathname === "/api/setup/moviebox-status" && req.method === "GET") {
        return sendJson(res, 200, await serializeBrowserWork(browserSessionStatus));
      }

      if (url.pathname === "/api/setup/health" && req.method === "GET") {
        const defaultSession = getProfileSession("default");
        const tmdbOk = Boolean(process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN);
        const cloudOk = Boolean(process.env.NUVIO_CLOUD_TOKEN);
        const mbpOk = Boolean(defaultSession.lastHealth?.authenticated);
        const status = tmdbOk && mbpOk ? "healthy" : (tmdbOk ? "warning" : "error");

        return sendJson(res, 200, {
          status,
          uptimeSeconds: Math.floor(process.uptime()),
          moviebox: {
            authenticated: mbpOk,
            lastChecked: defaultSession.lastHealth?.lastChecked || null,
            error: defaultSession.lastHealth?.error || null
          },
          tmdb: { configured: tmdbOk },
          nuvioCloud: {
            connected: cloudOk,
            lastSync: process.env.NUVIO_CLOUD_LAST_SYNC || null
          },
          timezone: process.env.USER_TIMEZONE || "UTC"
        });
      }

      // Version Check & Update API
      if (url.pathname === "/api/setup/version-check" && req.method === "GET") {
        let updateInfo = {
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          hasUpdate: false,
          releaseUrl: "https://github.com/saappleg/nuvio-movieboxpro-companion/releases"
        };
        try {
          const ghRes = await fetch("https://api.github.com/repos/saappleg/nuvio-movieboxpro-companion/releases/latest", {
            headers: { "User-Agent": "nuvio-movieboxpro-companion" }
          });
          if (ghRes.ok) {
            const data = await ghRes.json();
            const latestTag = data.tag_name ? data.tag_name.replace(/^v/, "") : APP_VERSION;
            updateInfo.latestVersion = latestTag;
            updateInfo.releaseUrl = data.html_url || updateInfo.releaseUrl;
            updateInfo.releaseNotes = data.body || "";
            if (latestTag && latestTag !== APP_VERSION && !APP_VERSION.includes(latestTag)) {
              updateInfo.hasUpdate = true;
            }
          }
        } catch {}
        return sendJson(res, 200, updateInfo);
      }

      if (url.pathname === "/api/setup/login" && req.method === "POST") {
        await serializeBrowserWork(openLoginWindow);
        return sendJson(res, 200, { ok: true });
      }

      if (url.pathname === "/api/setup/plugin-url" && req.method === "GET") {
        if (!process.env.PLUGIN_SETUP_KEY) return sendJson(res, 409, { error: "PLUGIN_SETUP_KEY is not configured" });
        return sendJson(res, 200, {
          url: privateRepositoryUrl(publicUrl(), process.env.PLUGIN_SETUP_KEY)
        });
      }

      if (url.pathname === "/api/setup/catalog-url" && req.method === "GET") {
        if (!process.env.PLUGIN_SETUP_KEY) return sendJson(res, 409, { error: "PLUGIN_SETUP_KEY is not configured" });
        return sendJson(res, 200, { url: `${publicUrl()}/catalog/${encodeURIComponent(process.env.PLUGIN_SETUP_KEY)}/manifest.json` });
      }

      // Nuvio Cloud Login
      if (url.pathname === "/api/setup/nuvio-cloud/login" && req.method === "POST") {
        requireConfig();
        const body = await readJsonBody(req);
        const { email, password, cloudUrl } = body;
        if (!email || !password) return sendJson(res, 400, { error: "Email and password are required" });

        const auth = await loginNuvioCloud(email, password, cloudUrl);
        const profiles = await fetchNuvioProfiles(auth.accessToken, cloudUrl);
        const activeProfile = profiles[0] || { id: 1, name: "Default Profile" };

        const syncResult = await syncNuvioCloudLibrary({
          accessToken: auth.accessToken,
          profileId: activeProfile.id,
          cloudUrl
        });

        await saveEnvValues({
          NUVIO_CLOUD_EMAIL: email,
          NUVIO_CLOUD_TOKEN: auth.accessToken,
          NUVIO_CLOUD_PROFILE_ID: String(activeProfile.id),
          NUVIO_CLOUD_PROFILE_NAME: activeProfile.name,
          NUVIO_CLOUD_LAST_SYNC: syncResult.syncedAt,
          RECOMMENDATION_SEEDS: JSON.stringify(syncResult.seriesSeeds),
          MOVIE_RECOMMENDATION_SEEDS: JSON.stringify(syncResult.movieSeeds)
        });

        return sendJson(res, 200, {
          ok: true,
          user: auth.user,
          profiles,
          activeProfile,
          syncSummary: syncResult
        });
      }

      // Nuvio Cloud Sync Trigger
      if (url.pathname === "/api/setup/nuvio-cloud/sync" && req.method === "POST") {
        requireConfig();
        if (!process.env.NUVIO_CLOUD_TOKEN) {
          return sendJson(res, 400, { error: "Nuvio Cloud is not connected" });
        }

        const profileId = process.env.NUVIO_CLOUD_PROFILE_ID || 1;
        const syncResult = await syncNuvioCloudLibrary({
          accessToken: process.env.NUVIO_CLOUD_TOKEN,
          profileId,
          cloudUrl: process.env.NUVIO_CLOUD_URL
        });

        await saveEnvValues({
          NUVIO_CLOUD_LAST_SYNC: syncResult.syncedAt,
          RECOMMENDATION_SEEDS: JSON.stringify(syncResult.seriesSeeds),
          MOVIE_RECOMMENDATION_SEEDS: JSON.stringify(syncResult.movieSeeds)
        });

        return sendJson(res, 200, { ok: true, syncSummary: syncResult });
      }

      // Nuvio Cloud Disconnect
      if (url.pathname === "/api/setup/nuvio-cloud/disconnect" && req.method === "POST") {
        await saveEnvValues({
          NUVIO_CLOUD_EMAIL: "",
          NUVIO_CLOUD_TOKEN: "",
          NUVIO_CLOUD_PROFILE_ID: "",
          NUVIO_CLOUD_PROFILE_NAME: "",
          NUVIO_CLOUD_LAST_SYNC: ""
        });
        return sendJson(res, 200, { ok: true });
      }

      // Manual Seeds
      if (url.pathname === "/api/setup/recommendations" && req.method === "POST") {
        requireConfig();
        const seeds = await resolveSeedShows((await readJsonBody(req)).shows);
        if (!seeds.length) return sendJson(res, 400, { error: "No matching TV shows were found" });
        await saveEnvValues({ RECOMMENDATION_SEEDS: JSON.stringify(seeds) });
        return sendJson(res, 200, { ok: true, seeds });
      }

      if (url.pathname === "/api/setup/recommendations/movies" && req.method === "POST") {
        requireConfig();
        const seeds = await resolveSeedMovies((await readJsonBody(req)).movies);
        if (!seeds.length) return sendJson(res, 400, { error: "No matching movies were found" });
        await saveEnvValues({ MOVIE_RECOMMENDATION_SEEDS: JSON.stringify(seeds) });
        return sendJson(res, 200, { ok: true, seeds });
      }

      // Catalogs Layout & Toggles
      if (url.pathname === "/api/setup/catalogs-config" && req.method === "POST") {
        requireConfig();
        const body = await readJsonBody(req);
        const catalogs = Array.isArray(body.catalogs) ? body.catalogs : [];
        if (!catalogs.length) {
          await saveEnvValues({ DISCOVERY_CATALOGS_CONFIG: "" });
          return sendJson(res, 200, { ok: true, catalogs: parseCatalogConfig("") });
        }
        const clean = catalogs.map((c) => ({
          id: String(c.id || "").trim(),
          enabled: Boolean(c.enabled)
        })).filter((c) => c.id);
        await saveEnvValues({ DISCOVERY_CATALOGS_CONFIG: JSON.stringify(clean) });
        return sendJson(res, 200, { ok: true, catalogs: parseCatalogConfig(clean) });
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
        if (typeof body.userTimezone === "string") {
          const tz = body.userTimezone.trim();
          if (tz) {
            try {
              Intl.DateTimeFormat(undefined, { timeZone: tz });
              updates.USER_TIMEZONE = tz;
            } catch {
              throw new Error("Invalid timezone format (e.g. America/New_York or Europe/London)");
            }
          } else {
            updates.USER_TIMEZONE = "";
          }
        }
        if (!Object.keys(updates).length) return sendJson(res, 400, { error: "No configuration changes supplied" });
        await saveEnvValues(updates);
        return sendJson(res, 200, {
          ok: true,
          publicUrl: publicUrl(),
          tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
          userTimezone: process.env.USER_TIMEZONE || ""
        });
      }

      if (url.pathname === "/api/setup/logout" && req.method === "POST") {
        res.writeHead(204, { "Set-Cookie": "companion_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
        return res.end();
      }

      return sendJson(res, 404, { error: "Not found" });
    }

    // 3. Catalog and Discovery Endpoints
    const catalogRequest = matchCatalogRequestPath(url.pathname);
    if (catalogRequest && req.method === "GET") {
      const activeProfile = await getProfileByPluginKey(catalogRequest.key) ||
        (process.env.PLUGIN_SETUP_KEY && catalogRequest.key === process.env.PLUGIN_SETUP_KEY ? await getProfileById("default") : null);
      if (!activeProfile) return sendJson(res, 401, { error: "Unauthorized" });

      if (catalogRequest.resource === "manifest.json") {
        const config = activeProfile.catalogsConfig || parseCatalogConfig();
        return sendJson(res, 200, catalogManifest(APP_VERSION, catalogRequest.key, config));
      }
      if (catalogRequest.catalogId) {
        const isMovie = catalogRequest.mediaType === "movie" || catalogRequest.catalogId.includes("movie");
        const seeds = isMovie
          ? (activeProfile.movieRecommendationSeeds?.length ? activeProfile.movieRecommendationSeeds : parseMovieSeeds())
          : (activeProfile.recommendationSeeds?.length ? activeProfile.recommendationSeeds : parseSeeds());
        const extraParam = catalogRequest.extra || url.search.replace(/^\?/, "");
        return sendJson(res, 200, { metas: await loadCatalog(catalogRequest.catalogId, seeds, fetch, new Date(), catalogRequest.mediaType, extraParam) });
      }
      if (catalogRequest.metaId) {
        return sendJson(res, 200, { meta: await loadMeta(catalogRequest.metaId, fetch, catalogRequest.mediaType) });
      }
    }

    // PWA Assets
    if (url.pathname === "/app.webmanifest" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" });
      return res.end(JSON.stringify({
        name: "MovieBoxPro & Nuvio Hub",
        short_name: "Nuvio MBP",
        start_url: "/setup",
        scope: "/",
        display: "standalone",
        background_color: "#080c14",
        theme_color: "#080c14",
        orientation: "any",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }, null, 2));
    }

    if (url.pathname === "/sw.js" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end("self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));\nself.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));\nself.addEventListener('fetch', () => {});");
    }

    if ((url.pathname === "/icon.svg" || url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico") && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" });
      return res.end("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><rect width='128' height='128' rx='28' fill='%230b1329'/><circle cx='64' cy='64' r='48' fill='none' stroke='%2338bdf8' stroke-width='6' stroke-dasharray='10 6'/><path d='M36 28v14m56-14v14M26 50h76M32 35h64a8 8 0 0 1 8 8v54a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V43a8 8 0 0 1 8-8z' fill='none' stroke='%23818cf8' stroke-width='8'/><polygon points='56,58 78,71 56,84' fill='%2338bdf8'/></svg>");
    }

    // Video Stream Proxy Endpoint
    if (url.pathname === "/stream/proxy" && req.method === "GET") {
      const targetUrl = url.searchParams.get("url");
      const proxyKey = url.searchParams.get("key") || queryKey;
      const proxyProfile = await getProfileByCompanionKey(proxyKey) ||
        (process.env.COMPANION_KEY && proxyKey === process.env.COMPANION_KEY ? await getProfileById("default") : null);
      if (!proxyProfile) return sendJson(res, 401, { error: "Unauthorized stream proxy request" });

      if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        return sendJson(res, 400, { error: "Missing or invalid stream target URL" });
      }

      try {
        const upstreamHeaders = {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          "Referer": "https://www.movieboxpro.app/",
          "Origin": "https://www.movieboxpro.app"
        };
        if (req.headers.range) {
          upstreamHeaders["Range"] = req.headers.range;
        }

        const upstreamRes = await fetch(targetUrl, {
          headers: upstreamHeaders,
          redirect: "follow"
        });

        const responseHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Accept-Ranges": "bytes"
        };

        if (upstreamRes.headers.get("content-type")) {
          responseHeaders["Content-Type"] = upstreamRes.headers.get("content-type");
        }
        if (upstreamRes.headers.get("content-length")) {
          responseHeaders["Content-Length"] = upstreamRes.headers.get("content-length");
        }
        if (upstreamRes.headers.get("content-range")) {
          responseHeaders["Content-Range"] = upstreamRes.headers.get("content-range");
        }

        res.writeHead(upstreamRes.status, responseHeaders);

        if (upstreamRes.body) {
          const nodeStream = Readable.fromWeb(upstreamRes.body);
          nodeStream.pipe(res);
        } else {
          res.end();
        }
        return;
      } catch (err) {
        return sendJson(res, 502, { error: `Stream proxy error: ${err.message}` });
      }
    }

    // 4. Provider Repository Endpoints
    const privateRepository = matchPrivateRepositoryPath(url.pathname);
    if ((url.pathname === "/manifest.json" || privateRepository?.resource === "manifest.json") && req.method === "GET") {
      const repositoryKey = privateRepository?.key || queryKey;
      const repoProfile = await getProfileByPluginKey(repositoryKey) ||
        (process.env.PLUGIN_SETUP_KEY && repositoryKey === process.env.PLUGIN_SETUP_KEY ? await getProfileById("default") : null);
      if (!repoProfile) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, repositoryManifest(APP_VERSION, repoProfile.pluginSetupKey, Boolean(privateRepository)));
    }
    if ((url.pathname === "/providers/movieboxpro-local.js" || privateRepository?.resource === "providers/movieboxpro-local.js") && req.method === "GET") {
      const repositoryKey = privateRepository?.key || queryKey;
      const pluginProfile = await getProfileByPluginKey(repositoryKey) ||
        (process.env.PLUGIN_SETUP_KEY && repositoryKey === process.env.PLUGIN_SETUP_KEY ? await getProfileById("default") : null);
      if (!pluginProfile) return sendJson(res, 401, { error: "Unauthorized" });
      requireConfig();
      const template = await readFile(new URL("../provider/movieboxpro-local.js", import.meta.url), "utf8");
      const source = template
        .replace("__COMPANION_URL__", JSON.stringify(publicUrl()))
        .replace("__COMPANION_KEY__", JSON.stringify(pluginProfile.companionKey));
      return sendJavaScript(res, source);
    }

    // 5. Browser Session & Login
    if (url.pathname === "/login" && req.method === "GET") {
      const loginProfile = await getProfileByCompanionKey(queryKey) ||
        (process.env.COMPANION_KEY && queryKey === process.env.COMPANION_KEY ? await getProfileById("default") : null);
      if (!loginProfile) return sendJson(res, 401, { error: "Unauthorized" });
      const session = getProfileSession(loginProfile.id, loginProfile.browserProfileDir);
      await serializeBrowserWork(() => openLoginWindow(loginProfile.id), session);
      return sendJson(res, 200, { ok: true, message: `Complete login for profile "${loginProfile.name}" in the dedicated Chrome window, then check /status.` });
    }
    if (url.pathname === "/status" && req.method === "GET") {
      const statusProfile = await getProfileByCompanionKey(queryKey) ||
        (process.env.COMPANION_KEY && queryKey === process.env.COMPANION_KEY ? await getProfileById("default") : null);
      if (!statusProfile) return sendJson(res, 401, { error: "Unauthorized" });
      const session = getProfileSession(statusProfile.id, statusProfile.browserProfileDir);
      return sendJson(res, 200, await serializeBrowserWork(() => browserSessionStatus(statusProfile.id), session));
    }

    // 6. IntroDB Skip Intro Segments API
    if (url.pathname === "/intro" || url.pathname === "/api/introdb/segments") {
      const rawTmdbId = String(url.searchParams.get("tmdbId") || url.searchParams.get("imdb_id") || url.searchParams.get("imdbId") || "");
      const season = url.searchParams.get("season");
      const episode = url.searchParams.get("episode");
      if (!rawTmdbId || !season || !episode) return sendJson(res, 400, { error: "Missing imdb_id/tmdbId, season, or episode" });
      const imdbId = /^tt\d+$/i.test(rawTmdbId) ? rawTmdbId.toLowerCase() : await resolveImdbIdForShow(rawTmdbId, process.env.TMDB_API_KEY, fetch);
      if (!imdbId) return sendJson(res, 404, { error: "Could not resolve IMDb ID for this title" });
      const segments = await fetchIntroSegments({ imdbId, season, episode }, fetch);
      if (!segments) return sendJson(res, 404, { error: "No IntroDB segments found for this episode" });
      return sendJson(res, 200, segments);
    }

    // 7. Streams API (Requested by Nuvio Scraper)
    if (url.pathname !== "/streams" || req.method !== "GET") return sendJson(res, 404, { error: "Not found" });

    requireConfig();
    const activeProfile = await getProfileByCompanionKey(suppliedKey) ||
      (process.env.COMPANION_KEY && suppliedKey === process.env.COMPANION_KEY ? await getProfileById("default") : null);
    if (!activeProfile) return sendJson(res, 401, { error: "Unauthorized" });

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
    console.log(`[companion][${activeProfile.name}] stream request tmdb=${params.tmdbId} type=${params.mediaType}` +
      (params.mediaType === "tv" ? ` season=${Number(params.season)} episode=${Number(params.episode)}` : ""));

    const startTime = Date.now();
    let resolvedStreams;
    const session = getProfileSession(activeProfile.id, activeProfile.browserProfileDir);

    try {
      resolvedStreams = await withTimeout(
        serializeBrowserWork(() => resolveStreams(params, activeProfile.id), session),
        Number(process.env.STREAM_TIMEOUT_MS || 45000),
        "Stream lookup timed out"
      );

      recordStreamActivity({
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        tmdbId: params.tmdbId,
        mediaType: params.mediaType,
        season: params.season,
        episode: params.episode,
        streamCount: Array.isArray(resolvedStreams) ? resolvedStreams.length : 0,
        durationMs: Date.now() - startTime,
        success: true,
        error: null
      });
    } catch (streamError) {
      recordStreamActivity({
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        tmdbId: params.tmdbId,
        mediaType: params.mediaType,
        season: params.season,
        episode: params.episode,
        streamCount: 0,
        durationMs: Date.now() - startTime,
        success: false,
        error: streamError.message
      });
      throw streamError;
    }

    // Enrich TV series streams with IntroDB skip segments (intro, outro, recap)
    if (params.mediaType === "tv" && Array.isArray(resolvedStreams) && resolvedStreams.length) {
      try {
        const imdbId = /^tt\d+$/i.test(params.tmdbId) ? params.tmdbId : await resolveImdbIdForShow(params.tmdbId, process.env.TMDB_API_KEY, fetch);
        if (imdbId) {
          const segments = await fetchIntroSegments({ imdbId, season: params.season, episode: params.episode }, fetch);
          if (segments) {
            return sendJson(res, 200, attachIntroSegmentsToStreams(resolvedStreams, segments));
          }
        }
      } catch (introError) {
        console.warn(`[companion] IntroDB segment lookup failed: ${introError.message}`);
      }
    }

    return sendJson(res, 200, resolvedStreams);
  } catch (error) {
    console.error(`[companion] ${error.message}`);
    return sendJson(res, 502, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MovieBoxPro companion listening on http://${HOST}:${PORT}`);
  console.log("Use /login?key=<COMPANION_KEY> to open the dedicated MovieBoxPro login window.");
  console.log("Use /setup?key=<COMPANION_KEY> for the guided setup dashboard.");
  startBackgroundJobs();
});

async function shutdown() {
  for (const session of profileSessions.values()) {
    if (session.browserLaunchPromise) await session.browserLaunchPromise.catch(() => {});
    if (session.browserContext) await session.browserContext.close().catch(() => {});
  }
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
