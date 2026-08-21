const IMAGE_BASE = "https://image.tmdb.org/t/p";

function authHeaders() {
  return process.env.TMDB_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` } : {};
}

export async function tmdb(pathname, params = {}, fetchImpl = fetch) {
  const url = new URL(`https://api.themoviedb.org/3/${pathname.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  if (process.env.TMDB_API_KEY) url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  const response = await fetchImpl(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`TMDb catalog request failed (${response.status})`);
  return response.json();
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

export function catalogManifest(version, key) {
  return {
    id: "community.nuvio.companion.calendar",
    version,
    name: "Nuvio Companion Discovery & Calendar",
    description: "Calendar releases, new movies & series, and personalized recommendations powered by TMDb and Nuvio Cloud",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tmdb:"],
    catalogs: [
      // Movies Catalogs
      {
        type: "movie",
        id: "new-movies",
        name: "New Movies",
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
        extraSupported: ["search", "skip"]
      },
      {
        type: "movie",
        id: "this-week-movies",
        name: "This Week (Movies)",
        extra: [{ name: "skip", isRequired: false }],
        extraSupported: ["skip"]
      },
      {
        type: "movie",
        id: "recommended-movies",
        name: "Recommended Movies",
        extra: [{ name: "skip", isRequired: false }],
        extraSupported: ["skip"]
      },
      // TV Series Catalogs
      {
        type: "series",
        id: "airing-today",
        name: "Airing Today",
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
        extraSupported: ["search", "skip"]
      },
      {
        type: "series",
        id: "this-week",
        name: "This Week (TV)",
        extra: [{ name: "skip", isRequired: false }],
        extraSupported: ["skip"]
      },
      {
        type: "series",
        id: "new-returning",
        name: "New & Returning",
        extra: [{ name: "skip", isRequired: false }],
        extraSupported: ["skip"]
      },
      {
        type: "series",
        id: "new-series",
        name: "New Series",
        extra: [{ name: "skip", isRequired: false }],
        extraSupported: ["skip"]
      },
      {
        type: "series",
        id: "recommended",
        name: "Recommended TV",
        extra: [{ name: "skip", isRequired: false }],
        extraSupported: ["skip"]
      }
    ],
    behaviorHints: { configurable: false, configurationRequired: false }
  };
}

export async function resolveSeedShows(input, fetchImpl = fetch) {
  const terms = String(input || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean).slice(0, 15);
  const resolved = [];
  for (const term of terms) {
    if (/^\d+$/.test(term)) {
      const details = await tmdb(`tv/${term}`, { language: "en-US" }, fetchImpl);
      resolved.push({ id: Number(term), name: details.name || term });
    } else {
      const data = await tmdb("search/tv", { query: term, language: "en-US", include_adult: false }, fetchImpl);
      const match = data.results?.[0];
      if (match?.id) resolved.push({ id: match.id, name: match.name || term });
    }
  }
  return [...new Map(resolved.map((seed) => [seed.id, seed])).values()];
}

export async function resolveSeedMovies(input, fetchImpl = fetch) {
  const terms = String(input || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean).slice(0, 15);
  const resolved = [];
  for (const term of terms) {
    if (/^\d+$/.test(term)) {
      const details = await tmdb(`movie/${term}`, { language: "en-US" }, fetchImpl);
      resolved.push({ id: Number(term), name: details.title || term });
    } else {
      const data = await tmdb("search/movie", { query: term, language: "en-US", include_adult: false }, fetchImpl);
      const match = data.results?.[0];
      if (match?.id) resolved.push({ id: match.id, name: match.title || term });
    }
  }
  return [...new Map(resolved.map((seed) => [seed.id, seed])).values()];
}

export function parseSeeds(value = process.env.RECOMMENDATION_SEEDS || "[]") {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((seed) => Number(seed.id) && seed.name).slice(0, 25) : [];
  } catch { return []; }
}

export function parseMovieSeeds(value = process.env.MOVIE_RECOMMENDATION_SEEDS || "[]") {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((seed) => Number(seed.id) && seed.name).slice(0, 25) : [];
  } catch { return []; }
}

export function matchCatalogRequestPath(pathname) {
  const cleanPath = String(pathname || "").split("?")[0];

  // 1. Logo
  if (/\/catalog\/[^/]+\/logo\.svg$/i.test(cleanPath)) {
    const match = cleanPath.match(/\/catalog\/([^/]+)\/logo\.svg/i);
    return { key: decodeURIComponent(match[1]), resource: "logo.svg" };
  }

  // 2. Manifest
  if (/\/catalog\/[^/]+\/manifest\.json$/i.test(cleanPath)) {
    const match = cleanPath.match(/\/catalog\/([^/]+)\/manifest\.json/i);
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
    let rawMetaId = decodeURIComponent(metaMatch[4]).replace(/\.json$/i, "");
    rawMetaId = rawMetaId.replace(/^tmdb:/i, "").trim();
    if (!/^\d+$/.test(rawMetaId)) return undefined;
    return { key, resource: resource.endsWith(".json") ? resource : `${resource}.json`, mediaType, catalogId: undefined, metaId: rawMetaId };
  }

  return undefined;
}

export async function loadCatalog(catalogId, seeds = parseSeeds(), fetchImpl = fetch, now = new Date(), mediaType = "series") {
  const date = (offset) => {
    const value = new Date(now);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  let results = [];
  const normalizedType = mediaType === "movie" || catalogId.includes("movie") ? "movie" : "series";

  // Series Catalogs
  if (catalogId === "airing-today") {
    results = (await tmdb("tv/airing_today", { language: "en-US", page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "this-week" || catalogId === "this-week-tv") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "air_date.gte": date(0), "air_date.lte": date(7), page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "new-returning") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-30), "first_air_date.lte": date(30), page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "new-series") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-60), page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "recommended" && normalizedType === "series") {
    const validSeeds = seeds.slice(0, 8);
    if (!validSeeds.length) {
      results = (await tmdb("tv/top_rated", { language: "en-US", page: 1 }, fetchImpl)).results || [];
    } else {
      const groups = await Promise.all(validSeeds.map(async (seed) =>
        (await tmdb(`tv/${seed.id}/recommendations`, { language: "en-US", page: 1 }, fetchImpl)).results?.slice(0, 10) || []));
      const seedIds = new Set(validSeeds.map((seed) => Number(seed.id)));
      const scores = new Map();
      for (const item of groups.flat()) {
        if (seedIds.has(Number(item.id))) continue;
        const entry = scores.get(item.id) || { item, score: 0 };
        entry.score += 1;
        scores.set(item.id, entry);
      }
      results = [...scores.values()].sort((a, b) => b.score - a.score || (b.item.popularity || 0) - (a.item.popularity || 0)).map((entry) => entry.item);
    }
  }
  // Movie Catalogs
  else if (catalogId === "new-movies" || catalogId === "now-playing") {
    results = (await tmdb("movie/now_playing", { language: "en-US", page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "this-week-movies") {
    results = (await tmdb("discover/movie", { language: "en-US", sort_by: "popularity.desc", "primary_release_date.gte": date(-7), "primary_release_date.lte": date(7), page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "recommended-movies" || (normalizedType === "movie" && catalogId === "recommended")) {
    const validSeeds = seeds.slice(0, 8);
    if (!validSeeds.length) {
      results = (await tmdb("movie/top_rated", { language: "en-US", page: 1 }, fetchImpl)).results || [];
    } else {
      const groups = await Promise.all(validSeeds.map(async (seed) =>
        (await tmdb(`movie/${seed.id}/recommendations`, { language: "en-US", page: 1 }, fetchImpl)).results?.slice(0, 10) || []));
      const seedIds = new Set(validSeeds.map((seed) => Number(seed.id)));
      const scores = new Map();
      for (const item of groups.flat()) {
        if (seedIds.has(Number(item.id))) continue;
        const entry = scores.get(item.id) || { item, score: 0 };
        entry.score += 1;
        scores.set(item.id, entry);
      }
      results = [...scores.values()].sort((a, b) => b.score - a.score || (b.item.popularity || 0) - (a.item.popularity || 0)).map((entry) => entry.item);
    }
  } else {
    throw new Error(`Unknown catalog: ${catalogId}`);
  }

  return uniqueMetas(results, normalizedType).slice(0, 40);
}

export async function loadMeta(tmdbId, fetchImpl = fetch, mediaType = "series") {
  const isMovie = mediaType === "movie";
  const path = isMovie ? `movie/${Number(tmdbId)}` : `tv/${Number(tmdbId)}`;
  const data = await tmdb(path, { language: "en-US" }, fetchImpl);
  const meta = toMeta(data, isMovie ? "movie" : "series");
  if (!meta) throw new Error(`${isMovie ? "Movie" : "Series"} metadata was not found`);
  meta.genres = (data.genres || []).map((genre) => genre.name).filter(Boolean);
  meta.status = data.status || undefined;
  if (data.runtime) meta.runtime = `${data.runtime} min`;
  return meta;
}
