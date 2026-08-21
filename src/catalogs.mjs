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
          if (id && byId.has(id) && !seen.has(id)) {
            seen.add(id);
            const def = byId.get(id);
            const enabled = item.enabled !== undefined ? Boolean(item.enabled) : (item.enabled ?? def.defaultEnabled);
            result.push({ ...def, enabled });
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

export function catalogManifest(version, key, config = parseCatalogConfig()) {
  const activeCatalogs = (Array.isArray(config) ? config : parseCatalogConfig(config))
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({
      type: c.type,
      id: c.id,
      name: c.name,
      extra: c.extra,
      extraSupported: c.extraSupported
    }));

  return {
    id: "community.nuvio.companion.calendar",
    version,
    name: "Nuvio Companion Discovery & Calendar",
    description: "Calendar releases, new movies & series, and personalized recommendations powered by TMDb and Nuvio Cloud",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tmdb:", "tt"],
    catalogs: activeCatalogs,
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

  const date = (offset) => {
    const value = new Date(now);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  let results = [];

  // 1. Now Playing (Movie)
  if (catalogId === "now-playing") {
    results = (await tmdb("movie/now_playing", { language: "en-US", page }, fetchImpl)).results || [];
  }
  // 2. New Today - Library Based (Series)
  else if (catalogId === "library-today" || catalogId === "airing-today-library") {
    if (!seeds.length) return [];
    const seedIds = new Set(seeds.map((s) => Number(s.id)));
    const todayStr = new Date(now).toISOString().slice(0, 10);

    let airingTodayResults = [];
    try {
      const airingTodayData = await tmdb("tv/airing_today", { language: "en-US", page: 1 }, fetchImpl);
      airingTodayResults = airingTodayData.results || [];
    } catch {}

    const matched = airingTodayResults.filter((item) => seedIds.has(Number(item.id)));
    const matchedIds = new Set(matched.map((item) => Number(item.id)));

    // Check direct seeds for episode air_date matching today
    const checkSeeds = seeds.filter((s) => !matchedIds.has(Number(s.id))).slice(0, 20);
    const directChecks = await Promise.all(checkSeeds.map(async (seed) => {
      try {
        const details = await tmdb(`tv/${seed.id}`, { language: "en-US" }, fetchImpl);
        const lastAir = details.last_episode_to_air?.air_date;
        const nextAir = details.next_episode_to_air?.air_date;
        if (lastAir === todayStr || nextAir === todayStr) {
          return details;
        }
      } catch {}
      return null;
    }));

    results = [...matched, ...directChecks.filter(Boolean)];
  }
  // 3. New Series
  else if (catalogId === "new-series") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-60), page }, fetchImpl)).results || [];
  }
  // 4. Recommended Series
  else if (catalogId === "recommended-series" || (normalizedType === "series" && catalogId === "recommended")) {
    const validSeeds = seeds.slice(0, 8);
    if (!validSeeds.length) {
      results = (await tmdb("tv/top_rated", { language: "en-US", page }, fetchImpl)).results || [];
    } else {
      const groups = await Promise.all(validSeeds.map(async (seed) =>
        (await tmdb(`tv/${seed.id}/recommendations`, { language: "en-US", page }, fetchImpl)).results?.slice(0, 10) || []));
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
  // 5. New Movies
  else if (catalogId === "new-movies") {
    results = (await tmdb("discover/movie", { language: "en-US", sort_by: "popularity.desc", "primary_release_date.gte": date(-45), "primary_release_date.lte": date(15), page }, fetchImpl)).results || [];
  }
  // 6. Recommended Movies
  else if (catalogId === "recommended-movies" || (normalizedType === "movie" && catalogId === "recommended")) {
    const validSeeds = seeds.slice(0, 8);
    if (!validSeeds.length) {
      results = (await tmdb("movie/top_rated", { language: "en-US", page }, fetchImpl)).results || [];
    } else {
      const groups = await Promise.all(validSeeds.map(async (seed) =>
        (await tmdb(`movie/${seed.id}/recommendations`, { language: "en-US", page }, fetchImpl)).results?.slice(0, 10) || []));
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
  // Legacy / Calendar aliases
  else if (catalogId === "airing-today") {
    results = (await tmdb("tv/airing_today", { language: "en-US", page }, fetchImpl)).results || [];
  } else if (catalogId === "this-week" || catalogId === "this-week-tv") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "air_date.gte": date(0), "air_date.lte": date(7), page }, fetchImpl)).results || [];
  } else if (catalogId === "new-returning") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-30), "first_air_date.lte": date(30), page }, fetchImpl)).results || [];
  } else if (catalogId === "this-week-movies") {
    results = (await tmdb("discover/movie", { language: "en-US", sort_by: "popularity.desc", "primary_release_date.gte": date(-7), "primary_release_date.lte": date(7), page }, fetchImpl)).results || [];
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
  const data = await tmdb(path, { language: "en-US" }, fetchImpl);
  const meta = toMeta(data, isMovie ? "movie" : "series");
  if (!meta) throw new Error(`${isMovie ? "Movie" : "Series"} metadata was not found`);

  // Preserve the requested ID format (e.g. tt27799594 or tmdb:123)
  if (isImdb) meta.id = String(rawId).toLowerCase();
  meta.genres = (data.genres || []).map((genre) => genre.name).filter(Boolean);
  meta.status = data.status || undefined;
  if (data.runtime) meta.runtime = `${data.runtime} min`;

  // For TV Series, populate seasons and episodes in the standard `videos` array
  if (!isMovie && Array.isArray(data.seasons)) {
    const validSeasons = data.seasons.filter((s) => Number(s.season_number) >= 1 && (s.episode_count || 0) > 0).slice(0, 30);
    const seasonData = await Promise.all(validSeasons.map(async (s) => {
      try {
        return await tmdb(`tv/${Number(tmdbId)}/season/${s.season_number}`, { language: "en-US" }, fetchImpl);
      } catch {
        return { season_number: s.season_number, episodes: [] };
      }
    }));

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
          videos.push({
            id: videoId,
            title: ep.name || `Episode ${epNum}`,
            name: ep.name || `Episode ${epNum}`,
            season: sNum,
            episode: epNum,
            number: epNum,
            released: ep.air_date ? new Date(ep.air_date).toISOString() : undefined,
            firstAired: ep.air_date ? new Date(ep.air_date).toISOString() : undefined,
            overview: ep.overview || undefined,
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
