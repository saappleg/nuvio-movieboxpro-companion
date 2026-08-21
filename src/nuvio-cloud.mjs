import { tmdb } from "./catalogs.mjs";

const DEFAULT_NUVIO_CLOUD_URL = "https://api.nuvio.tv";
const DEFAULT_NUVIO_ANON_KEY = "sb_publishable_nuvio_public_client_v1";

/**
 * Authenticates with Nuvio Cloud (Supabase backend) using email and password.
 */
export async function loginNuvioCloud(email, password, cloudUrl = DEFAULT_NUVIO_CLOUD_URL, anonKey = DEFAULT_NUVIO_ANON_KEY, fetchImpl = fetch) {
  const base = String(cloudUrl || DEFAULT_NUVIO_CLOUD_URL).replace(/\/$/, "");
  const url = `${base}/auth/v1/token?grant_type=password`;
  
  const headers = {
    "Content-Type": "application/json"
  };
  if (anonKey) {
    headers["apikey"] = anonKey;
  }

  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: String(email).trim(), password: String(password) })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.error || `Nuvio Cloud login failed (${response.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: {
      id: data.user?.id,
      email: data.user?.email
    }
  };
}

/**
 * Retrieves profiles for the authenticated Nuvio Cloud user.
 */
export async function fetchNuvioProfiles(accessToken, cloudUrl = DEFAULT_NUVIO_CLOUD_URL, anonKey = DEFAULT_NUVIO_ANON_KEY, fetchImpl = fetch) {
  const base = String(cloudUrl || DEFAULT_NUVIO_CLOUD_URL).replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`
  };
  if (anonKey) {
    headers["apikey"] = anonKey;
  }

  // Try RPC sync_pull_profiles first, fallback to rest/v1/profiles
  try {
    const rpcRes = await fetchImpl(`${base}/rest/v1/rpc/sync_pull_profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({})
    });
    if (rpcRes.ok) {
      const list = await rpcRes.json();
      if (Array.isArray(list) && list.length) {
        return list.map((p, idx) => ({ id: p.id ?? p.profile_id ?? idx + 1, name: p.name || p.username || `Profile ${idx + 1}` }));
      }
    }
  } catch {}

  try {
    const restRes = await fetchImpl(`${base}/rest/v1/profiles?select=*`, {
      method: "GET",
      headers
    });
    if (restRes.ok) {
      const list = await restRes.json();
      if (Array.isArray(list) && list.length) {
        return list.map((p, idx) => ({ id: p.id ?? p.profile_id ?? idx + 1, name: p.name || p.username || `Profile ${idx + 1}` }));
      }
    }
  } catch {}

  return [{ id: 1, name: "Default Profile" }];
}

/**
 * Fetches user library and watched items from Nuvio Cloud for a profile.
 */
export async function fetchNuvioLibraryRaw(accessToken, profileId = 1, cloudUrl = DEFAULT_NUVIO_CLOUD_URL, anonKey = DEFAULT_NUVIO_ANON_KEY, fetchImpl = fetch) {
  const base = String(cloudUrl || DEFAULT_NUVIO_CLOUD_URL).replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`
  };
  if (anonKey) {
    headers["apikey"] = anonKey;
  }

  const items = [];

  // 1. Pull library items
  try {
    const libRes = await fetchImpl(`${base}/rest/v1/rpc/sync_pull_library`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_profile_id: Number(profileId) || 1, p_limit: 500, p_offset: 0 })
    });
    if (libRes.ok) {
      const data = await libRes.json();
      if (Array.isArray(data)) items.push(...data);
      else if (Array.isArray(data?.items)) items.push(...data.items);
    }
  } catch {}

  // 2. Pull watched items
  try {
    const watchedRes = await fetchImpl(`${base}/rest/v1/rpc/sync_pull_watched_items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_profile_id: Number(profileId) || 1, p_limit: 500, p_offset: 0 })
    });
    if (watchedRes.ok) {
      const data = await watchedRes.json();
      if (Array.isArray(data)) items.push(...data);
      else if (Array.isArray(data?.items)) items.push(...data.items);
    }
  } catch {}

  return items;
}

/**
 * Parses raw Nuvio library/watched items into distinct series and movie seed sets.
 */
export function extractMediaFromLibrary(rawItems) {
  const seriesMap = new Map();
  const movieMap = new Map();

  for (const item of (Array.isArray(rawItems) ? rawItems : [])) {
    if (!item) continue;
    const rawId = String(item.content_id || item.id || item.tmdb_id || item.imdb_id || "").trim();
    const type = String(item.content_type || item.type || item.media_type || "").toLowerCase();
    const name = (item.title || item.name || "").trim();

    const isTv = /tv|series|show|episode/.test(type) || item.season != null;

    let tmdbId = null;
    let imdbId = null;

    if (/^tmdb:(\d+)$/i.test(rawId)) {
      tmdbId = Number(rawId.match(/^tmdb:(\d+)$/i)[1]);
    } else if (/^\d+$/.test(rawId)) {
      tmdbId = Number(rawId);
    } else if (/^tt\d+$/i.test(rawId)) {
      imdbId = rawId.toLowerCase();
    }

    const entry = {
      id: tmdbId || imdbId || rawId,
      tmdbId,
      imdbId,
      name: name || (tmdbId ? `TMDb ${tmdbId}` : imdbId || rawId),
      type: isTv ? "series" : "movie"
    };

    const targetMap = isTv ? seriesMap : movieMap;
    const titleKey = name ? `title:${name.toLowerCase()}` : null;
    const idKey = `id:${entry.id}`;

    if (titleKey && targetMap.has(titleKey)) {
      const existing = targetMap.get(titleKey);
      if (!existing.tmdbId && entry.tmdbId) {
        targetMap.set(titleKey, entry);
      }
    } else {
      if (titleKey) targetMap.set(titleKey, entry);
      if (!targetMap.has(idKey)) targetMap.set(idKey, entry);
    }
  }

  const collectUnique = (map) => {
    const seen = new Set();
    const list = [];
    for (const entry of map.values()) {
      const uniqueKey = `${entry.type}:${entry.id}:${entry.name.toLowerCase()}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        list.push(entry);
      }
    }
    return list;
  };

  return {
    series: collectUnique(seriesMap),
    movies: collectUnique(movieMap)
  };
}

/**
 * Resolves IMDb IDs or incomplete items to TMDb IDs using TMDb API if available.
 */
export async function enrichLibrarySeeds(seeds, fetchImpl = fetch) {
  const enriched = [];
  for (const seed of seeds) {
    if (seed.tmdbId && seed.name && !seed.name.startsWith("TMDb ")) {
      enriched.push({ id: seed.tmdbId, name: seed.name });
      continue;
    }
    try {
      if (seed.imdbId) {
        const findData = await tmdb(`find/${seed.imdbId}`, { external_source: "imdb_id" }, fetchImpl);
        const match = seed.type === "series" ? findData.tv_results?.[0] : findData.movie_results?.[0];
        if (match?.id) {
          enriched.push({ id: match.id, name: match.name || match.title || seed.name });
          continue;
        }
      }
      if (seed.tmdbId) {
        const path = seed.type === "series" ? `tv/${seed.tmdbId}` : `movie/${seed.tmdbId}`;
        const details = await tmdb(path, { language: "en-US" }, fetchImpl);
        enriched.push({ id: seed.tmdbId, name: details.name || details.title || seed.name });
        continue;
      }
    } catch {}
  }
  return enriched;
}

/**
 * High-level function to sync Nuvio Cloud library, resolve titles, and format recommendation seeds.
 */
export async function syncNuvioCloudLibrary({ accessToken, profileId, cloudUrl, anonKey }, fetchImpl = fetch) {
  const rawItems = await fetchNuvioLibraryRaw(accessToken, profileId, cloudUrl, anonKey, fetchImpl);
  const { series, movies } = extractMediaFromLibrary(rawItems);

  // Enrich top items to ensure valid TMDb IDs and names
  const [enrichedSeries, enrichedMovies] = await Promise.all([
    enrichLibrarySeeds(series.slice(0, 20), fetchImpl),
    enrichLibrarySeeds(movies.slice(0, 20), fetchImpl)
  ]);

  return {
    itemCount: rawItems.length,
    seriesSeeds: enrichedSeries,
    movieSeeds: enrichedMovies,
    syncedAt: new Date().toISOString()
  };
}
