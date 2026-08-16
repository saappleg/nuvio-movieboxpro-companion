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

export function toMeta(item) {
  const id = Number(item.id);
  if (!id || !(item.name || item.title)) return null;
  return {
    id: `tmdb:${id}`, type: "series", name: item.name || item.title,
    poster: item.poster_path ? `${IMAGE_BASE}/w500${item.poster_path}` : undefined,
    background: item.backdrop_path ? `${IMAGE_BASE}/w1280${item.backdrop_path}` : undefined,
    description: item.overview || undefined,
    releaseInfo: String(item.first_air_date || item.release_date || "").slice(0, 4) || undefined,
    imdbRating: Number(item.vote_average) || undefined
  };
}

function uniqueMetas(items) {
  const seen = new Set();
  return items.map(toMeta).filter((item) => item && !seen.has(item.id) && seen.add(item.id));
}

export function catalogManifest(version, key) {
  return {
    id: "community.nuvio.companion.calendar", version, name: "Nuvio Companion Calendar",
    description: "Temporary TV release and recommendation catalogs powered by TMDb",
    resources: ["catalog", "meta"], types: ["series"],
    catalogs: [
      { type: "series", id: "airing-today", name: "Airing Today" },
      { type: "series", id: "this-week", name: "This Week" },
      { type: "series", id: "new-returning", name: "New & Returning" },
      { type: "series", id: "recommended", name: "Recommended for You" }
    ],
    behaviorHints: { configurable: false, configurationRequired: false }
  };
}

export async function resolveSeedShows(input, fetchImpl = fetch) {
  const terms = String(input || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean).slice(0, 12);
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

export function parseSeeds(value = process.env.RECOMMENDATION_SEEDS || "[]") {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((seed) => Number(seed.id) && seed.name).slice(0, 12) : [];
  } catch { return []; }
}

export async function loadCatalog(catalogId, seeds = parseSeeds(), fetchImpl = fetch, now = new Date()) {
  const date = (offset) => { const value = new Date(now); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10); };
  let results = [];
  if (catalogId === "airing-today") {
    results = (await tmdb("tv/airing_today", { language: "en-US", page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "this-week") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "air_date.gte": date(0), "air_date.lte": date(7), page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "new-returning") {
    results = (await tmdb("discover/tv", { language: "en-US", sort_by: "popularity.desc", "first_air_date.gte": date(-30), "first_air_date.lte": date(30), page: 1 }, fetchImpl)).results || [];
  } else if (catalogId === "recommended") {
    const groups = await Promise.all(seeds.slice(0, 8).map(async (seed) =>
      (await tmdb(`tv/${seed.id}/recommendations`, { language: "en-US", page: 1 }, fetchImpl)).results?.slice(0, 10) || []));
    const seedIds = new Set(seeds.map((seed) => Number(seed.id)));
    const scores = new Map();
    for (const item of groups.flat()) {
      if (seedIds.has(Number(item.id))) continue;
      const entry = scores.get(item.id) || { item, score: 0 };
      entry.score += 1; scores.set(item.id, entry);
    }
    results = [...scores.values()].sort((a, b) => b.score - a.score || (b.item.popularity || 0) - (a.item.popularity || 0)).map((entry) => entry.item);
  } else throw new Error("Unknown catalog");
  return uniqueMetas(results).slice(0, 40);
}

export async function loadMeta(tmdbId, fetchImpl = fetch) {
  const data = await tmdb(`tv/${Number(tmdbId)}`, { language: "en-US" }, fetchImpl);
  const meta = toMeta(data);
  if (!meta) throw new Error("Series metadata was not found");
  meta.genres = (data.genres || []).map((genre) => genre.name).filter(Boolean);
  meta.status = data.status || undefined;
  return meta;
}
