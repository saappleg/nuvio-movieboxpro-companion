const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function resolveImdbIdForShow(tmdbId, tmdbApiKey, fetchImpl = fetch) {
  if (!tmdbId) return null;
  const rawId = String(tmdbId).trim();
  if (/^tt\d+$/i.test(rawId)) return rawId.toLowerCase();
  if (!/^\d+$/.test(rawId)) return null;

  const cacheKey = `tmdb_imdb_${rawId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const url = new URL(`https://api.themoviedb.org/3/tv/${rawId}/external_ids`);
    if (tmdbApiKey) url.searchParams.set("api_key", tmdbApiKey);
    const headers = process.env.TMDB_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` } : {};
    const res = await fetchImpl(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const imdbId = data.imdb_id ? String(data.imdb_id).toLowerCase() : null;
    if (imdbId) cache.set(cacheKey, imdbId);
    return imdbId;
  } catch {
    return null;
  }
}

export async function fetchIntroSegments({ imdbId, season, episode }, fetchImpl = fetch) {
  if (!imdbId || !season || !episode) return null;
  const cleanImdb = String(imdbId).toLowerCase().trim();
  const sNum = Number(season);
  const epNum = Number(episode);
  if (!/^tt\d+$/i.test(cleanImdb) || isNaN(sNum) || isNaN(epNum)) return null;

  const cacheKey = `introdb_${cleanImdb}_${sNum}_${epNum}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.introdb.app/segments?imdb_id=${encodeURIComponent(cleanImdb)}&season=${sNum}&episode=${epNum}`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      if (res.status === 404) {
        cache.set(cacheKey, { time: Date.now(), data: null });
      }
      return null;
    }
    const data = await res.json();
    const result = {
      imdbId: cleanImdb,
      season: sNum,
      episode: epNum,
      intro: data.intro ? {
        start: data.intro.start_sec ?? (data.intro.start_ms ? data.intro.start_ms / 1000 : 0),
        end: data.intro.end_sec ?? (data.intro.end_ms ? data.intro.end_ms / 1000 : 0),
        startMs: data.intro.start_ms,
        endMs: data.intro.end_ms,
        confidence: data.intro.confidence
      } : null,
      outro: data.outro ? {
        start: data.outro.start_sec ?? (data.outro.start_ms ? data.outro.start_ms / 1000 : 0),
        end: data.outro.end_sec ?? (data.outro.end_ms ? data.outro.end_ms / 1000 : 0),
        startMs: data.outro.start_ms,
        endMs: data.outro.end_ms,
        confidence: data.outro.confidence
      } : null,
      recap: data.recap ? {
        start: data.recap.start_sec ?? (data.recap.start_ms ? data.recap.start_ms / 1000 : 0),
        end: data.recap.end_sec ?? (data.recap.end_ms ? data.recap.end_ms / 1000 : 0),
        startMs: data.recap.start_ms,
        endMs: data.recap.end_ms,
        confidence: data.recap.confidence
      } : null,
      raw: data
    };
    cache.set(cacheKey, { time: Date.now(), data: result });
    return result;
  } catch {
    return null;
  }
}

export function attachIntroSegmentsToStreams(streams, segments) {
  if (!Array.isArray(streams) || !segments) return streams;
  return streams.map((stream) => {
    if (!stream || typeof stream !== "object") return stream;
    const enriched = { ...stream };
    if (segments.intro) {
      enriched.intro = segments.intro;
    }
    if (segments.outro) {
      enriched.outro = segments.outro;
    }
    if (segments.recap) {
      enriched.recap = segments.recap;
    }
    enriched.segments = segments.raw || {
      intro: segments.intro,
      outro: segments.outro,
      recap: segments.recap
    };
    return enriched;
  });
}
