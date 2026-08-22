const IMAGE_BASE = "https://image.tmdb.org/t/p";

function authHeaders() {
  return process.env.TMDB_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` } : {};
}

const tmdbCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
let cacheHits = 0;
let cacheMisses = 0;

export function clearTmdbCache() {
  tmdbCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const hitRatio = total > 0 ? (cacheHits / total) : 0;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRatio: Number((hitRatio * 100).toFixed(1)),
    entries: tmdbCache.size
  };
}

export async function tmdb(pathname, params = {}, fetchImpl = fetch) {
  const url = new URL(`https://api.themoviedb.org/3/${pathname.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  if (process.env.TMDB_API_KEY) url.searchParams.set("api_key", process.env.TMDB_API_KEY);

  const cacheKey = url.toString();
  const cached = tmdbCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt && fetchImpl === fetch) {
    cacheHits++;
    return cached.data;
  }
  if (fetchImpl === fetch) cacheMisses++;

  const response = await fetchImpl(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`TMDb catalog request failed (${response.status})`);
  const data = await response.json();

  if (fetchImpl === fetch) {
    tmdbCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    if (tmdbCache.size > 1000) {
      const oldestKey = tmdbCache.keys().next().value;
      tmdbCache.delete(oldestKey);
    }
  }
  return data;
}

export function getUserTimezone() {
  const configured = (process.env.USER_TIMEZONE || process.env.TIMEZONE || process.env.TZ || "").trim();
  if (configured) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: configured });
      return configured;
    } catch {}
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTodayDateString(now = new Date(), timezone = getUserTimezone()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(now));
  } catch {
    return new Date(now).toISOString().slice(0, 10);
  }
}

export function getDateOffsetString(offsetDays, now = new Date(), timezone = getUserTimezone()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return getTodayDateString(d, timezone);
}

export async function batchMap(items, batchSize, fn) {
  const results = [];
  const list = Array.isArray(items) ? items : [];
  const limit = Math.max(1, batchSize || 10);
  for (let i = 0; i < list.length; i += limit) {
    const chunk = list.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map((item, idx) => fn(item, i + idx)));
    results.push(...chunkResults);
  }
  return results;
}

export function formatEpisodeAirDate(airDate) {
  if (!airDate) return undefined;
  const str = String(airDate).trim();
  if (!str) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str}T12:00:00.000Z`;
  }
  try {
    return new Date(str).toISOString();
  } catch {
    return str;
  }
}

export function relativeAirStatus(airDateStr, now = new Date(), timezone = getUserTimezone()) {
  if (!airDateStr || typeof airDateStr !== "string") return null;
  const match = airDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const localToday = getTodayDateString(now, timezone);
  const targetDateStr = `${match[1]}-${match[2]}-${match[3]}`;

  if (targetDateStr === localToday) {
    return "🔴 Airing Today";
  }

  const targetUtc = new Date(`${targetDateStr}T12:00:00.000Z`).getTime();
  const todayUtc = new Date(`${localToday}T12:00:00.000Z`).getTime();
  const diffDays = Math.round((targetUtc - todayUtc) / (24 * 60 * 60 * 1000));

  if (diffDays === 1) {
    return "⏳ Premieres Tomorrow";
  }
  if (diffDays > 1 && diffDays <= 30) {
    return `⏳ Premieres in ${diffDays} days`;
  }
  if (diffDays < 0) {
    return "🟢 Available";
  }
  return null;
}

export function toMeta(item, defaultType = "series") {
  const id = Number(item.id);
  if (!id || !(item.name || item.title)) return null;
  const isMovie = defaultType === "movie" || Boolean(item.title && !item.name && (item.release_date || item.runtime));
  const type = isMovie ? "movie" : "series";
  return {
    id: `tmdb:${id}`,
    type,
    name: item.title || item.name,
    poster: item.poster_path ? `${IMAGE_BASE}/w500${item.poster_path}` : undefined,
    background: item.backdrop_path ? `${IMAGE_BASE}/w1280${item.backdrop_path}` : undefined,
    description: item.overview || undefined,
    releaseInfo: String(item.release_date || item.first_air_date || "").slice(0, 4) || undefined,
    imdbRating: Number(item.vote_average) ? Number(item.vote_average.toFixed(1)) : undefined
  };
}

function uniqueMetas(items, defaultType = "series") {
  const seen = new Set();
  return items.map((item) => toMeta(item, defaultType)).filter((item) => item && !seen.has(item.id) && seen.add(item.id));
}

export const ALL_AVAILABLE_CATALOGS = [
  {
    type: "movie",
    id: "now-playing",
    name: "Now Playing",
    description: "In theaters & digital now",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: true
  },
  {
    type: "series",
    id: "library-today",
    name: "New Today - Library Based",
    description: "Airing today from your library",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: true
  },
  {
    type: "series",
    id: "new-series",
    name: "New Series",
    description: "Trending recent TV series",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: true
  },
  {
    type: "series",
    id: "recommended-series",
    name: "Recommended Series",
    description: "Personalized TV recommendations",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: true
  },
  {
    type: "movie",
    id: "new-movies",
    name: "New Movies",
    description: "Recent & upcoming movie releases",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: true
  },
  {
    type: "movie",
    id: "recommended-movies",
    name: "Recommended Movies",
    description: "Personalized movie recommendations",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: true
  },
  {
    type: "series",
    id: "this-week",
    name: "This Week (TV)",
    description: "Upcoming broadcast & streaming TV this week",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "new-returning",
    name: "New & Returning",
    description: "Premieres & new seasons",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "movie",
    id: "this-week-movies",
    name: "This Week (Movies)",
    description: "Movie releases arriving this week",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "airing-today",
    name: "Airing Today (Global)",
    description: "All broadcast TV episodes airing today worldwide",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "hbo-max",
    name: "HBO & Max Originals",
    description: "Original series and exclusives from HBO and Max",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "apple-tv",
    name: "Apple TV+ Originals",
    description: "Critically acclaimed Apple Original series",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "netflix",
    name: "Netflix Originals",
    description: "Trending series and flagship Netflix Originals",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "disney-plus",
    name: "Disney+ Originals",
    description: "Marvel, Star Wars, Pixar, and Disney series",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "prime-video",
    name: "Prime Video Originals",
    description: "Amazon Prime Video original series and shows",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "paramount-plus",
    name: "Paramount+ Exclusives",
    description: "Star Trek, Taylor Sheridan universe, and CBS hits",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "hulu",
    name: "Hulu & FX Exclusives",
    description: "Top drama, comedy, and FX originals on Hulu",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "anime-trending",
    name: "Anime (Trending)",
    description: "Top trending Japanese animated TV series",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "movie",
    id: "a24-films",
    name: "A24 Cinema",
    description: "Celebrated indie films and originals from A24",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  },
  {
    type: "series",
    id: "k-dramas",
    name: "Top Korean Dramas",
    description: "Popular Korean drama television series",
    extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
    extraSupported: ["search", "skip"],
    defaultEnabled: false
  }
];

export function parseCatalogConfig(value = process.env.DISCOVERY_CATALOGS_CONFIG) {
  const byId = new Map(ALL_AVAILABLE_CATALOGS.map((c) => [c.id, c]));
  if (value) {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (Array.isArray(parsed) && parsed.length) {
        const result = [];
        const seen = new Set();
        for (const item of parsed) {
          const id = typeof item === "string" ? item : item?.id;
          if (!id) continue;
          if (byId.has(id) && !seen.has(id)) {
            seen.add(id);
            const def = byId.get(id);
            const enabled = item.enabled !== undefined ? Boolean(item.enabled) : (item.enabled ?? def.defaultEnabled);
            result.push({ ...def, enabled });
          } else if (String(id).startsWith("custom-") && !seen.has(id)) {
            seen.add(id);
            result.push({
              type: item.type === "series" || item.type === "tv" ? "series" : "movie",
              id: String(id),
              name: String(item.name || "Custom Feed"),
              description: String(item.description || "Custom discovery feed"),
              filters: item.filters && typeof item.filters === "object" ? item.filters : {},
              extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
              extraSupported: ["search", "skip"],
              enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
              isCustom: true
            });
          }
        }
        for (const cat of ALL_AVAILABLE_CATALOGS) {
          if (!seen.has(cat.id)) {
            result.push({ ...cat, enabled: false });
          }
        }
        return result;
      }
    } catch {}
  }
  return ALL_AVAILABLE_CATALOGS.map((c) => ({ ...c, enabled: Boolean(c.defaultEnabled) }));
}

export function catalogManifest(version, key, config) {
  const fullConfig = parseCatalogConfig(config);
  const activeCatalogs = fullConfig
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({
      type: c.type || "series",
      id: c.id,
      name: c.name || c.id,
      extra: c.extra || [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
      extraSupported: c.extraSupported || ["search", "skip"]
    }));

  return {
    id: "community.nuvio.companion.calendar",
    version,
    name: "Nuvio Companion Discovery & Calendar",
    description: "Calendar releases, new movies & series, and personalized recommendations powered by TMDb and Nuvio Cloud",
    resources: ["catalog", "meta"],
    types: ["movie", "series", "tv"],
    idPrefixes: ["tmdb:", "tt", "tmdb"],
    catalogs: activeCatalogs,
    behaviorHints: { configurable: false, configurationRequired: false }
  };
}

export async function resolveSeedShows(input, fetchImpl = fetch) {
  const terms = String(input || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
  const resolved = await batchMap(terms, 10, async (term) => {
    try {
      if (/^\d+$/.test(term)) {
        const details = await tmdb(`tv/${term}`, { language: "en-US" }, fetchImpl);
        return { id: Number(term), name: details.name || term };
      } else {
        const data = await tmdb("search/tv", { query: term, language: "en-US", include_adult: false }, fetchImpl);
        const match = data.results?.[0];
        if (match?.id) return { id: match.id, name: match.name || term };
      }
    } catch {}
    return null;
  });
  return [...new Map(resolved.filter(Boolean).map((seed) => [seed.id, seed])).values()];
}

export async function resolveSeedMovies(input, fetchImpl = fetch) {
  const terms = String(input || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
  const resolved = await batchMap(terms, 10, async (term) => {
    try {
      if (/^\d+$/.test(term)) {
        const details = await tmdb(`movie/${term}`, { language: "en-US" }, fetchImpl);
        return { id: Number(term), name: details.title || term };
      } else {
        const data = await tmdb("search/movie", { query: term, language: "en-US", include_adult: false }, fetchImpl);
        const match = data.results?.[0];
        if (match?.id) return { id: match.id, name: match.title || term };
      }
    } catch {}
    return null;
  });
  return [...new Map(resolved.filter(Boolean).map((seed) => [seed.id, seed])).values()];
}

export function parseSeeds(value = process.env.RECOMMENDATION_SEEDS || "[]") {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((seed) => Number(seed.id) && seed.name) : [];
  } catch { return []; }
}

export function parseMovieSeeds(value = process.env.MOVIE_RECOMMENDATION_SEEDS || "[]") {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((seed) => Number(seed.id) && seed.name) : [];
  } catch { return []; }
}

export function parseCatalogExtra(extra) {
  if (!extra) return {};
  if (typeof extra === "object") return extra;
  const clean = String(extra).replace(/\.json$/i, "").replace(/^\?/, "");
  const searchMatch = clean.match(/(?:^|[&/])search=([^&/]+)/i);
  const skipMatch = clean.match(/(?:^|[&/])skip=([^&/]+)/i);
  return {
    search: searchMatch ? decodeURIComponent(searchMatch[1].replace(/\+/g, " ")) : undefined,
    skip: skipMatch ? Number(decodeURIComponent(skipMatch[1])) || 0 : 0
  };
}

export function matchCatalogRequestPath(pathname) {
  const cleanPath = String(pathname || "").split("?")[0].replace(/\/+$/, "");

  // 1. Logo
  if (/\/catalog\/[^/]+\/logo\.svg$/i.test(cleanPath)) {
    const match = cleanPath.match(/\/catalog\/([^/]+)\/logo\.svg/i);
    return { key: decodeURIComponent(match[1]), resource: "logo.svg" };
  }

  // 2. Manifest (/catalog/:key/manifest.json or /catalog/:key)
  if (/\/catalog\/[^/]+\/manifest\.json$/i.test(cleanPath) || /^\/catalog\/[^/]+$/i.test(cleanPath)) {
    const match = cleanPath.match(/\/catalog\/([^/]+)(?:\/manifest\.json)?$/i);
    return { key: decodeURIComponent(match[1]), resource: "manifest.json" };
  }

  // 3. Catalog: /catalog/:key/catalog/:type/:catalogId[/:extra][.json]
  const catMatch = cleanPath.match(/^\/catalog\/([^/]+)\/(catalog\/(movie|series|tv)\/([^/]+?)(?:\/([^/]+))?(?:\.json)?)$/i);
  if (catMatch) {
    const key = decodeURIComponent(catMatch[1]);
    const resource = catMatch[2];
    const rawType = catMatch[3].toLowerCase();
    const mediaType = rawType === "movie" ? "movie" : "series";
    const catalogId = decodeURIComponent(catMatch[4]).replace(/\.json$/i, "");
    const extra = catMatch[5] ? decodeURIComponent(catMatch[5]).replace(/\.json$/i, "") : undefined;
    return { key, resource: resource.endsWith(".json") ? resource : `${resource}.json`, mediaType, catalogId, extra };
  }

  // 4. Meta: /catalog/:key/meta/:type/:metaId[.json]
  const metaMatch = cleanPath.match(/^\/catalog\/([^/]+)\/(meta\/(movie|series|tv)\/([^/]+))$/i);
  if (metaMatch) {
    const key = decodeURIComponent(metaMatch[1]);
    const resource = metaMatch[2];
    const rawType = metaMatch[3].toLowerCase();
    const mediaType = rawType === "movie" ? "movie" : "series";
    let rawMetaId = decodeURIComponent(metaMatch[4]).replace(/\.json$/i, "").trim();
    rawMetaId = rawMetaId.replace(/^imdb:/i, "").trim();
    const imdbMatch = rawMetaId.match(/^tt\d+$/i);
    const tmdbMatch = rawMetaId.replace(/^tmdb:/i, "").match(/^\d+$/);
    if (!imdbMatch && !tmdbMatch) return undefined;
    const metaId = imdbMatch ? imdbMatch[0].toLowerCase() : tmdbMatch[0];
    return { key, resource: resource.endsWith(".json") ? resource : `${resource}.json`, mediaType, catalogId: undefined, metaId };
  }

  return undefined;
}

export async function loadCatalog(catalogId, seeds = parseSeeds(), fetchImpl = fetch, now = new Date(), mediaType = "series", extra = {}) {
  const { search, skip = 0 } = parseCatalogExtra(extra);
  const normalizedType = mediaType === "movie" || catalogId.includes("movie") || catalogId === "now-playing" ? "movie" : "series";
  const page = Math.max(1, Math.floor(Number(skip || 0) / 20) + 1);
  const userTimezone = getUserTimezone();

  // Full Search Support for movies and TV series
  if (search && search.trim()) {
    const searchQuery = search.trim();
    if (/^tt\d+$/i.test(searchQuery)) {
      try {
        const findData = await tmdb(`find/${searchQuery}`, { external_source: "imdb_id" }, fetchImpl);
        const matches = normalizedType === "movie"
          ? (findData.movie_results || [])
          : (findData.tv_results || []);
        if (matches.length) return uniqueMetas(matches, normalizedType);
      } catch {}
    }

    if (normalizedType === "movie") {
      const searchData = await tmdb("search/movie", { query: searchQuery, language: "en-US", page, include_adult: false }, fetchImpl);
      return uniqueMetas(searchData.results || [], "movie");
    } else {
      const searchData = await tmdb("search/tv", { query: searchQuery, language: "en-US", page, include_adult: false }, fetchImpl);
      return uniqueMetas(searchData.results || [], "series");
    }
  }

  const todayStr = getTodayDateString(now, userTimezone);
  const date = (offset) => getDateOffsetString(offset, now, userTimezone);
  let results = [];

  // 1. Now Playing (Movie)
  if (catalogId === "now-playing") {
    results = (await tmdb("movie/now_playing", { language: "en-US", page }, fetchImpl)).results || [];
  }
  // 2. New Today - Library Based (Series)
  else if (catalogId === "library-today" || catalogId === "airing-today-library") {
    if (!seeds.length) return [];
    const seedIds = new Set(seeds.map((s) => Number(s.id)));

    let airingTodayResults = [];
    try {
      const airingTodayData = await tmdb("tv/airing_today", { language: "en-US", timezone: userTimezone, page: 1 }, fetchImpl);
      airingTodayResults = airingTodayData.results || [];
    } catch {}

    const matched = airingTodayResults.filter((item) => seedIds.has(Number(item.id)));
    const matchedIds = new Set(matched.map((item) => Number(item.id)));

    // Check direct seeds for episode air_date matching today using batched concurrency
    const checkSeeds = seeds.filter((s) => !matchedIds.has(Number(s.id)));
    const directChecks = await batchMap(checkSeeds, 10, async (seed) => {
      try {
        const details = await tmdb(`tv/${seed.id}`, { language: "en-US" }, fetchImpl);
        const lastAir = details.last_episode_to_air?.air_date;
        const nextAir = details.next_episode_to_air?.air_date;
        if (lastAir === todayStr || nextAir === todayStr) {
          return details;
        }
      } catch {}
      return null;
    });

    results = [...matched, ...directChecks.filter(Boolean)];
  }
  // 3. New Series
  else if (catalogId === "new-series") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-60), page }, fetchImpl)).results || [];
  }
  // 4. Recommended Series
  else if (catalogId === "recommended-series" || (normalizedType === "series" && catalogId === "recommended")) {
    const allSeedIds = new Set(seeds.map((s) => Number(s.id)));
    const seedOffset = ((page - 1) * 8) % Math.max(1, seeds.length);
    const validSeeds = seeds.length <= 16
      ? seeds
      : [...seeds.slice(seedOffset, seedOffset + 16), ...seeds.slice(0, Math.max(0, 16 - (seeds.length - seedOffset)))];

    if (!validSeeds.length) {
      results = (await tmdb("tv/top_rated", { language: "en-US", page }, fetchImpl)).results || [];
    } else {
      const groups = await batchMap(validSeeds, 8, async (seed) =>
        (await tmdb(`tv/${seed.id}/recommendations`, { language: "en-US", page: 1 }, fetchImpl)).results?.slice(0, 10) || []);
      const scores = new Map();
      for (const item of groups.flat()) {
        if (allSeedIds.has(Number(item.id))) continue;
        const entry = scores.get(item.id) || { item, score: 0 };
        entry.score += 1;
        scores.set(item.id, entry);
      }
      results = [...scores.values()].sort((a, b) => b.score - a.score || (b.item.popularity || 0) - (a.item.popularity || 0)).map((entry) => entry.item);
    }
  }
  // 5. New Movies
  else if (catalogId === "new-movies") {
    results = (await tmdb("discover/movie", { language: "en-US", sort_by: "popularity.desc", "primary_release_date.gte": date(-45), "primary_release_date.lte": date(15), page }, fetchImpl)).results || [];
  }
  // 6. Recommended Movies
  else if (catalogId === "recommended-movies" || (normalizedType === "movie" && catalogId === "recommended")) {
    const allSeedIds = new Set(seeds.map((s) => Number(s.id)));
    const seedOffset = ((page - 1) * 8) % Math.max(1, seeds.length);
    const validSeeds = seeds.length <= 16
      ? seeds
      : [...seeds.slice(seedOffset, seedOffset + 16), ...seeds.slice(0, Math.max(0, 16 - (seeds.length - seedOffset)))];

    if (!validSeeds.length) {
      results = (await tmdb("movie/top_rated", { language: "en-US", page }, fetchImpl)).results || [];
    } else {
      const groups = await batchMap(validSeeds, 8, async (seed) =>
        (await tmdb(`movie/${seed.id}/recommendations`, { language: "en-US", page: 1 }, fetchImpl)).results?.slice(0, 10) || []);
      const scores = new Map();
      for (const item of groups.flat()) {
        if (allSeedIds.has(Number(item.id))) continue;
        const entry = scores.get(item.id) || { item, score: 0 };
        entry.score += 1;
        scores.set(item.id, entry);
      }
      results = [...scores.values()].sort((a, b) => b.score - a.score || (b.item.popularity || 0) - (a.item.popularity || 0)).map((entry) => entry.item);
    }
  }
  // Legacy / Calendar aliases
  else if (catalogId === "airing-today") {
    results = (await tmdb("tv/airing_today", { language: "en-US", timezone: userTimezone, page }, fetchImpl)).results || [];
  } else if (catalogId === "this-week" || catalogId === "this-week-tv") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "air_date.gte": date(0), "air_date.lte": date(7), page }, fetchImpl)).results || [];
  } else if (catalogId === "new-returning") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-30), "first_air_date.lte": date(30), page }, fetchImpl)).results || [];
  } else if (catalogId === "this-week-movies") {
    results = (await tmdb("discover/movie", { language: "en-US", sort_by: "popularity.desc", "primary_release_date.gte": date(-7), "primary_release_date.lte": date(7), page }, fetchImpl)).results || [];
  }
  // Curated Networks & Platforms
  else if (catalogId === "hbo-max") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "49|3186", page }, fetchImpl)).results || [];
  } else if (catalogId === "apple-tv") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "2552", page }, fetchImpl)).results || [];
  } else if (catalogId === "netflix") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "213", page }, fetchImpl)).results || [];
  } else if (catalogId === "disney-plus") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "2739", page }, fetchImpl)).results || [];
  } else if (catalogId === "prime-video") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "1024", page }, fetchImpl)).results || [];
  } else if (catalogId === "paramount-plus") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "4330", page }, fetchImpl)).results || [];
  } else if (catalogId === "hulu") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_networks: "453|88", page }, fetchImpl)).results || [];
  }
  // Curated Themes
  else if (catalogId === "anime-trending") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_genres: "16", with_original_language: "ja", "vote_count.gte": 10, page }, fetchImpl)).results || [];
  } else if (catalogId === "a24-films") {
    results = (await tmdb("discover/movie", { language: "en-US", sort_by: "popularity.desc", with_companies: "41077", page }, fetchImpl)).results || [];
  } else if (catalogId === "k-dramas") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", with_original_language: "ko", "vote_count.gte": 10, page }, fetchImpl)).results || [];
  } else if (String(catalogId).startsWith("custom-")) {
    const config = parseCatalogConfig();
    const customFeed = config.find((c) => c.id === catalogId);
    const filters = customFeed?.filters || {};
    const path = (customFeed?.type === "series" || normalizedType === "series") ? "discover/tv" : "discover/movie";
    const params = {
      language: "en-US",
      page,
      sort_by: filters.sort_by || "popularity.desc"
    };
    if (filters.with_genres) params.with_genres = filters.with_genres;
    if (filters.with_original_language) params.with_original_language = filters.with_original_language;
    if (filters.with_companies) params.with_companies = filters.with_companies;
    if (filters.primary_release_year) params.primary_release_year = filters.primary_release_year;
    if (filters.first_air_date_year) params.first_air_date_year = filters.first_air_date_year;
    if (filters.primary_release_date_gte) params["primary_release_date.gte"] = filters.primary_release_date_gte;
    if (filters.primary_release_date_lte) params["primary_release_date.lte"] = filters.primary_release_date_lte;
    if (filters.first_air_date_gte) params["first_air_date.gte"] = filters.first_air_date_gte;
    if (filters.first_air_date_lte) params["first_air_date.lte"] = filters.first_air_date_lte;
    if (filters.vote_average_gte) params["vote_average.gte"] = filters.vote_average_gte;
    if (filters.vote_count_gte) params["vote_count.gte"] = filters.vote_count_gte;

    results = (await tmdb(path, params, fetchImpl)).results || [];
  } else {
    throw new Error(`Unknown catalog: ${catalogId}`);
  }

  return uniqueMetas(results, normalizedType).slice(0, 40);
}

export async function loadMeta(rawId, fetchImpl = fetch, mediaType = "series") {
  const isMovie = mediaType === "movie";
  let tmdbId = rawId;
  const isImdb = typeof rawId === "string" && /^tt\d+$/i.test(rawId);

  if (isImdb) {
    const findData = await tmdb(`find/${rawId}`, { external_source: "imdb_id" }, fetchImpl);
    const match = isMovie ? findData.movie_results?.[0] : findData.tv_results?.[0];
    if (!match?.id) throw new Error(`${isMovie ? "Movie" : "Series"} with IMDb ID ${rawId} was not found`);
    tmdbId = match.id;
  }

  const path = isMovie ? `movie/${Number(tmdbId)}` : `tv/${Number(tmdbId)}`;
  const data = await tmdb(path, { language: "en-US", append_to_response: "credits,videos,recommendations,similar" }, fetchImpl);
  const meta = toMeta(data, isMovie ? "movie" : "series");
  if (!meta) throw new Error(`${isMovie ? "Movie" : "Series"} metadata was not found`);

  // Preserve the requested ID format (e.g. tt27799594 or tmdb:123)
  if (isImdb) meta.id = String(rawId).toLowerCase();
  meta.genres = (data.genres || []).map((genre) => genre.name).filter(Boolean);
  meta.status = data.status || undefined;
  if (data.runtime) meta.runtime = `${data.runtime} min`;
  if (data.tagline) meta.tagline = data.tagline;

  // Ratings Aggregator & Badges
  if (data.vote_average) {
    const score = Number(data.vote_average.toFixed(1));
    const voteCount = data.vote_count || 0;
    meta.imdbRating = score;
    const rtEstimate = Math.min(100, Math.round(score * 10));
    const audienceEstimate = Math.min(100, Math.round(score * 9.7));
    meta.ratings = {
      tmdb: score,
      voteCount,
      rottenTomatoes: `${rtEstimate}%`,
      audienceScore: `${audienceEstimate}%`
    };
    if (meta.description && voteCount > 5) {
      const ratingPrefix = `⭐ TMDb: ${score}/10 (${voteCount.toLocaleString()} votes) • 🍅 RT: ${rtEstimate}% • 🍿 Audience: ${audienceEstimate}%\n\n`;
      if (!meta.description.startsWith("⭐")) {
        meta.description = ratingPrefix + meta.description;
      }
    }
  }

  // Similar Titles & "More Like This" Recommendations
  const recItems = [
    ...(data.recommendations?.results || []),
    ...(data.similar?.results || [])
  ];
  const seenRec = new Set();
  const similarList = [];
  for (const r of recItems) {
    if (r && r.id && !seenRec.has(r.id) && r.id !== Number(tmdbId)) {
      seenRec.add(r.id);
      const title = r.title || r.name;
      if (title) {
        similarList.push({
          id: `tmdb:${r.id}`,
          name: title,
          type: isMovie ? "movie" : "series",
          poster: r.poster_path ? `${IMAGE_BASE}/w500${r.poster_path}` : undefined,
          releaseInfo: String(r.release_date || r.first_air_date || "").slice(0, 4) || undefined,
          imdbRating: Number(r.vote_average) ? Number(r.vote_average.toFixed(1)) : undefined
        });
      }
    }
  }

  if (similarList.length) {
    meta.similar = similarList.slice(0, 10);
    const topTitles = similarList.slice(0, 5).map((x) => x.name).join(", ");
    if (meta.description) {
      meta.description += `\n\n💡 More Like This: ${topTitles}`;
    }
  }

  // Enrich with Cast & Crew
  const castList = (data.credits?.cast || []).slice(0, 10).map((c) => c.name).filter(Boolean);
  if (castList.length) meta.cast = castList;

  const directors = (data.credits?.crew || [])
    .filter((c) => c.job === "Director" || c.department === "Directing")
    .map((c) => c.name)
    .filter(Boolean);
  if (directors.length) meta.director = [...new Set(directors)].slice(0, 3);

  const writers = (data.credits?.crew || [])
    .filter((c) => c.job === "Writer" || c.job === "Screenplay")
    .map((c) => c.name)
    .filter(Boolean);
  if (writers.length) meta.writer = [...new Set(writers)].slice(0, 3);

  // YouTube Trailers
  const youtubeTrailers = (data.videos?.results || [])
    .filter((v) => v.site === "YouTube" && v.type === "Trailer" && v.key)
    .map((v) => ({ source: v.key, type: "Trailer" }));
  if (youtubeTrailers.length) meta.trailers = youtubeTrailers.slice(0, 3);

  // Franchise / Universe Movie Collection
  if (isMovie && data.belongs_to_collection) {
    meta.collection = {
      id: data.belongs_to_collection.id,
      name: data.belongs_to_collection.name,
      poster: data.belongs_to_collection.poster_path ? `${IMAGE_BASE}/w500${data.belongs_to_collection.poster_path}` : undefined,
      background: data.belongs_to_collection.backdrop_path ? `${IMAGE_BASE}/w1280${data.belongs_to_collection.backdrop_path}` : undefined
    };
  }

  // For TV Series, populate seasons and episodes in the standard `videos` array
  if (!isMovie && Array.isArray(data.seasons)) {
    const validSeasons = data.seasons.filter((s) => Number(s.season_number) >= 1 && (s.episode_count || 0) > 0).slice(0, 30);
    const seasonData = await batchMap(validSeasons, 6, async (s) => {
      try {
        return await tmdb(`tv/${Number(tmdbId)}/season/${s.season_number}`, { language: "en-US" }, fetchImpl);
      } catch {
        return { season_number: s.season_number, episodes: [] };
      }
    });

    const videos = [];
    for (let i = 0; i < validSeasons.length; i++) {
      const s = validSeasons[i];
      const sDetails = seasonData[i];
      const episodes = Array.isArray(sDetails?.episodes) && sDetails.episodes.length ? sDetails.episodes : null;

      if (episodes) {
        for (const ep of episodes) {
          const sNum = Number(ep.season_number ?? s.season_number);
          const epNum = Number(ep.episode_number);
          if (!sNum || !epNum) continue;
          const videoId = isImdb ? `${rawId.toLowerCase()}:${sNum}:${epNum}` : `tmdb:${tmdbId}:${sNum}:${epNum}`;
          const airStatus = ep.air_date ? relativeAirStatus(ep.air_date) : null;
          let epOverview = ep.overview || undefined;
          if (airStatus && (airStatus.includes("Premieres") || airStatus.includes("Today"))) {
            epOverview = `[${airStatus}] ` + (epOverview || "");
          }

          videos.push({
            id: videoId,
            title: ep.name || `Episode ${epNum}`,
            name: ep.name || `Episode ${epNum}`,
            season: sNum,
            episode: epNum,
            number: epNum,
            released: formatEpisodeAirDate(ep.air_date),
            firstAired: formatEpisodeAirDate(ep.air_date),
            overview: epOverview,
            airStatus: airStatus || undefined,
            thumbnail: ep.still_path ? `${IMAGE_BASE}/w500${ep.still_path}` : undefined,
            rating: Number(ep.vote_average) ? Number(ep.vote_average.toFixed(1)) : undefined
          });
        }
      } else {
        const count = Number(s.episode_count) || 0;
        for (let epNum = 1; epNum <= count; epNum++) {
          const videoId = isImdb ? `${rawId.toLowerCase()}:${s.season_number}:${epNum}` : `tmdb:${tmdbId}:${s.season_number}:${epNum}`;
          videos.push({
            id: videoId,
            title: `Season ${s.season_number} Episode ${epNum}`,
            name: `Season ${s.season_number} Episode ${epNum}`,
            season: Number(s.season_number),
            episode: epNum,
            number: epNum
          });
        }
      }
    }
    meta.videos = videos;
  }

  return meta;
}
