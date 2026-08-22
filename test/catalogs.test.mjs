import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  catalogManifest,
  loadCatalog,
  loadMeta,
  matchCatalogRequestPath,
  parseSeeds,
  parseMovieSeeds,
  parseCatalogConfig,
  parseCatalogExtra,
  resolveSeedShows,
  resolveSeedMovies,
  toMeta,
  getUserTimezone,
  getTodayDateString,
  getDateOffsetString,
  formatEpisodeAirDate,
  relativeAirStatus,
  batchMap
} from "../src/catalogs.mjs";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const APP_VERSION = String(packageMetadata.version);

function response(data) {
  return { ok: true, json: async () => data };
}

test("catalog manifest exposes series and movie catalogs in requested order with search extras", () => {
  const manifest = catalogManifest(APP_VERSION, "private-key");
  assert.equal(manifest.version, APP_VERSION);
  assert.deepEqual(manifest.types, ["movie", "series", "tv"]);
  assert.deepEqual(manifest.idPrefixes, ["tmdb:", "tt", "tmdb"]);
  assert.deepEqual(manifest.catalogs.map((item) => item.id), [
    "now-playing",
    "library-today",
    "new-series",
    "recommended-series",
    "new-movies",
    "recommended-movies"
  ]);
  assert.ok(manifest.catalogs.every((c) => c.extraSupported?.includes("search")));
});

test("catalog configuration supports custom ordering and toggle states", () => {
  const customConfig = [
    { id: "recommended-movies", enabled: true },
    { id: "now-playing", enabled: false },
    { id: "new-series", enabled: true },
    { id: "this-week", enabled: true }
  ];
  const parsed = parseCatalogConfig(JSON.stringify(customConfig));
  assert.equal(parsed[0].id, "recommended-movies");
  assert.equal(parsed[0].enabled, true);
  assert.equal(parsed[1].id, "now-playing");
  assert.equal(parsed[1].enabled, false);

  const manifest = catalogManifest(APP_VERSION, "private-key", parsed);
  assert.deepEqual(manifest.catalogs.map((c) => c.id), [
    "recommended-movies",
    "new-series",
    "this-week"
  ]);
  assert.ok(manifest.catalogs.every((c) => typeof c.type === "string" && Boolean(c.name)));

  // Test when minimal { id, enabled } array is passed directly without pre-parsing
  const rawSavedManifest = catalogManifest(APP_VERSION, "private-key", customConfig);
  assert.deepEqual(rawSavedManifest.catalogs.map((c) => c.id), [
    "recommended-movies",
    "new-series",
    "this-week"
  ]);
  assert.ok(rawSavedManifest.catalogs.every((c) => typeof c.type === "string" && typeof c.name === "string"));
});

test("parseCatalogExtra handles search and pagination parameters", () => {
  assert.deepEqual(parseCatalogExtra("search=Interstellar&skip=20"), { search: "Interstellar", skip: 20 });
  assert.deepEqual(parseCatalogExtra("search=Breaking%20Bad.json"), { search: "Breaking Bad", skip: 0 });
  assert.deepEqual(parseCatalogExtra({ search: "Severance", skip: 40 }), { search: "Severance", skip: 40 });
  assert.deepEqual(parseCatalogExtra(undefined), {});
});

test("loadCatalog performs search across movies and TV shows and supports IMDb ID queries", async () => {
  const movieSearch = await loadCatalog("new-movies", [], async (url) => {
    if (url.pathname.includes("search/movie")) {
      assert.equal(url.searchParams.get("query"), "Inception");
      return response({ results: [{ id: 27205, title: "Inception", release_date: "2010-07-15" }] });
    }
    throw new Error("Unexpected route");
  }, new Date(), "movie", "search=Inception");

  assert.equal(movieSearch.length, 1);
  assert.equal(movieSearch[0].name, "Inception");
  assert.equal(movieSearch[0].type, "movie");

  const tvSearch = await loadCatalog("new-series", [], async (url) => {
    if (url.pathname.includes("search/tv")) {
      assert.equal(url.searchParams.get("query"), "Severance");
      return response({ results: [{ id: 95396, name: "Severance", first_air_date: "2022-02-18" }] });
    }
    throw new Error("Unexpected route");
  }, new Date(), "series", "search=Severance");

  assert.equal(tvSearch.length, 1);
  assert.equal(tvSearch[0].name, "Severance");
  assert.equal(tvSearch[0].type, "series");

  const imdbSearch = await loadCatalog("new-series", [], async (url) => {
    if (url.pathname.includes("find/tt27799594")) {
      return response({ tv_results: [{ id: 226749, name: "The Librarians: The Next Chapter", first_air_date: "2025-05-25" }] });
    }
    throw new Error("Unexpected route");
  }, new Date(), "series", "search=tt27799594");

  assert.equal(imdbSearch.length, 1);
  assert.equal(imdbSearch[0].name, "The Librarians: The Next Chapter");
});

test("TMDb items map to Nuvio-compatible series & movie metadata", () => {
  assert.deepEqual(toMeta({ id: 123, name: "Example Show", poster_path: "/poster.jpg", first_air_date: "2026-08-16" }, "series"), {
    id: "tmdb:123", type: "series", name: "Example Show",
    poster: "https://image.tmdb.org/t/p/w500/poster.jpg",
    background: undefined, description: undefined, releaseInfo: "2026", imdbRating: undefined,
    rating: undefined, vote_average: undefined
  });

  assert.deepEqual(toMeta({ id: 456, title: "Example Movie", poster_path: "/m_poster.jpg", release_date: "2026-05-10", vote_average: 8.4 }, "movie"), {
    id: "tmdb:456", type: "movie", name: "Example Movie",
    poster: "https://image.tmdb.org/t/p/w500/m_poster.jpg",
    background: undefined, description: undefined, releaseInfo: "2026", imdbRating: 8.4,
    rating: 8.4, vote_average: 8.4
  });
});

test("loadMeta populates episode videos array for series and single meta for movie", async () => {
  const seriesMeta = await loadMeta(123, async (url) => {
    if (url.pathname.includes("season/1")) {
      return response({
        episodes: [
          { episode_number: 1, name: "Pilot", air_date: "2026-01-01", season_number: 1, still_path: "/still.jpg", vote_average: 8.9, vote_count: 142 },
          { episode_number: 2, name: "Second", air_date: "2026-01-08", season_number: 1, vote_average: 8.3, vote_count: 98 }
        ]
      });
    }
    return response({
      id: 123,
      name: "Test Show",
      seasons: [{ season_number: 1, episode_count: 2 }],
      credits: {
        cast: [{ name: "Actor One" }, { name: "Actor Two" }],
        crew: [{ name: "Director One", job: "Director" }]
      },
      videos: {
        results: [{ site: "YouTube", type: "Trailer", key: "abc123xyz" }]
      }
    });
  }, "series");

  assert.equal(seriesMeta.name, "Test Show");
  assert.equal(seriesMeta.type, "series");
  assert.deepEqual(seriesMeta.cast, ["Actor One", "Actor Two"]);
  assert.deepEqual(seriesMeta.director, ["Director One"]);
  assert.deepEqual(seriesMeta.trailers, [{ source: "abc123xyz", type: "Trailer" }]);
  assert.equal(seriesMeta.videos.length, 2);
  assert.equal(seriesMeta.videos[0].id, "tmdb:123:1:1");
  assert.equal(seriesMeta.videos[0].title, "Pilot");
  assert.equal(seriesMeta.videos[0].season, 1);
  assert.equal(seriesMeta.videos[0].episode, 1);
  assert.equal(seriesMeta.videos[0].released, "2026-01-01T12:00:00.000Z");
  assert.equal(seriesMeta.videos[0].imdbRating, 8.9);
  assert.equal(seriesMeta.videos[0].rating, 8.9);
  assert.equal(seriesMeta.videos[0].voteCount, 142);

  const movieMeta = await loadMeta(456, async () => {
    return response({
      id: 456,
      title: "Test Movie",
      release_date: "2026-05-01",
      vote_average: 8.4,
      vote_count: 1250,
      overview: "A mind-bending movie experience.",
      belongs_to_collection: { id: 789, name: "Test Franchise Collection", poster_path: "/franchise.jpg" },
      recommendations: {
        results: [
          { id: 999, title: "Recommended Movie 1", vote_average: 8.0, release_date: "2025-01-01" },
          { id: 888, title: "Recommended Movie 2", vote_average: 7.8 }
        ]
      }
    });
  }, "movie");

  assert.equal(movieMeta.name, "Test Movie");
  assert.equal(movieMeta.type, "movie");
  assert.equal(movieMeta.imdbRating, 8.4);
  assert.equal(movieMeta.ratings.rottenTomatoes, "84%");
  assert.match(movieMeta.description, /⭐ TMDb: 8\.4\/10/);
  assert.match(movieMeta.description, /💡 More Like This: Recommended Movie 1, Recommended Movie 2/);
  assert.equal(movieMeta.similar.length, 2);
  assert.equal(movieMeta.similar[0].name, "Recommended Movie 1");
  assert.equal(movieMeta.videos, undefined);
  assert.equal(movieMeta.collection.name, "Test Franchise Collection");
  assert.equal(movieMeta.collection.id, 789);
});

test("loadMeta resolves IMDb IDs and formats episode IDs with IMDb prefix", async () => {
  const imdbMeta = await loadMeta("tt27799594", async (url) => {
    if (url.pathname.includes("find/tt27799594")) {
      return response({ tv_results: [{ id: 226749, name: "The Librarians: The Next Chapter" }] });
    }
    if (url.pathname.includes("tv/226749/season/1")) {
      return response({
        episodes: [{ episode_number: 1, name: "Pilot", air_date: "2025-05-25", season_number: 1 }]
      });
    }
    return response({ id: 226749, name: "The Librarians: The Next Chapter", seasons: [{ season_number: 1, episode_count: 1 }] });
  }, "series");

  assert.equal(imdbMeta.id, "tt27799594");
  assert.equal(imdbMeta.name, "The Librarians: The Next Chapter");
  assert.equal(imdbMeta.videos.length, 1);
  assert.equal(imdbMeta.videos[0].id, "tt27799594:1:1");
  assert.equal(imdbMeta.videos[0].released, "2025-05-25T12:00:00.000Z");
});

test("library-today returns airing shows when present and empty array when none airing", async () => {
  const seeds = [{ id: 101, name: "Active Library Show" }, { id: 102, name: "Quiet Show" }];
  const metas = await loadCatalog("library-today", seeds, async (url) => {
    if (url.pathname.includes("tv/airing_today")) {
      return response({ results: [{ id: 101, name: "Active Library Show", first_air_date: "2026-08-21" }] });
    }
    return response({ id: 102, name: "Quiet Show" });
  }, new Date("2026-08-21T12:00:00Z"), "series");

  assert.equal(metas.length, 1);
  assert.equal(metas[0].name, "Active Library Show");

  const emptyMetas = await loadCatalog("library-today", [{ id: 999, name: "Non-airing Show" }], async (url) => {
    if (url.pathname.includes("tv/airing_today")) return response({ results: [] });
    return response({ id: 999, name: "Non-airing Show" });
  }, new Date("2026-08-21T12:00:00Z"), "series");

  assert.deepEqual(emptyMetas, []);
});

test("show names resolve to private recommendation seeds without arbitrary limits", async () => {
  // Test resolving 20 shows (exceeding previous 15 limit)
  const inputList = Array.from({ length: 20 }, (_, i) => `Show ${i + 1}`).join(", ");
  const seeds = await resolveSeedShows(inputList, async (url) => {
    const q = url.searchParams.get("query");
    return response({ results: [{ id: 1000 + Number(q.replace(/\D/g, "")), name: q }] });
  });
  assert.equal(seeds.length, 20);
  assert.equal(seeds[19].name, "Show 20");
  assert.equal(parseSeeds(JSON.stringify(seeds)).length, 20);
});

test("movie names resolve to movie recommendation seeds without arbitrary limits", async () => {
  const inputList = Array.from({ length: 20 }, (_, i) => `Movie ${i + 1}`).join("\n");
  const movieSeeds = await resolveSeedMovies(inputList, async (url) => {
    const q = url.searchParams.get("query");
    return response({ results: [{ id: 2000 + Number(q.replace(/\D/g, "")), title: q }] });
  });
  assert.equal(movieSeeds.length, 20);
  assert.equal(movieSeeds[19].name, "Movie 20");
  assert.equal(parseMovieSeeds(JSON.stringify(movieSeeds)).length, 20);
});

test("parseSeeds and parseMovieSeeds support unlimited seeds (>50 items)", () => {
  const bigList = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Title ${i + 1}` }));
  const parsedTv = parseSeeds(JSON.stringify(bigList));
  const parsedMovies = parseMovieSeeds(JSON.stringify(bigList));
  assert.equal(parsedTv.length, 60);
  assert.equal(parsedMovies.length, 60);
});

test("timezone helpers calculate correct local dates and boundaries", () => {
  // Test specific instant: 2026-08-22T02:00:00Z (which is 2026-08-21 in America/New_York EDT UTC-4)
  const utcEarlyInstant = new Date("2026-08-22T02:00:00Z");

  const nyDate = getTodayDateString(utcEarlyInstant, "America/New_York");
  const tokyoDate = getTodayDateString(utcEarlyInstant, "Asia/Tokyo");
  const utcDate = getTodayDateString(utcEarlyInstant, "UTC");

  assert.equal(nyDate, "2026-08-21");
  assert.equal(tokyoDate, "2026-08-22");
  assert.equal(utcDate, "2026-08-22");

  // Test offset days
  const nyNextWeek = getDateOffsetString(7, utcEarlyInstant, "America/New_York");
  assert.equal(nyNextWeek, "2026-08-28");
});

test("formatEpisodeAirDate produces timezone-safe UTC noon ISO strings", () => {
  assert.equal(formatEpisodeAirDate("2026-08-22"), "2026-08-22T12:00:00.000Z");
  assert.equal(formatEpisodeAirDate("2025-01-01"), "2025-01-01T12:00:00.000Z");
  assert.equal(formatEpisodeAirDate(undefined), undefined);
  assert.equal(formatEpisodeAirDate(""), undefined);
});

test("relativeAirStatus formats countdown and status badges accurately", () => {
  const fixedNow = new Date("2026-08-22T14:00:00Z");
  assert.equal(relativeAirStatus("2026-08-22", fixedNow, "UTC"), "🔴 Airing Today");
  assert.equal(relativeAirStatus("2026-08-23", fixedNow, "UTC"), "⏳ Premieres Tomorrow");
  assert.equal(relativeAirStatus("2026-08-26", fixedNow, "UTC"), "⏳ Premieres in 4 days");
  assert.equal(relativeAirStatus("2026-08-20", fixedNow, "UTC"), "🟢 Available");
  assert.equal(relativeAirStatus(null, fixedNow), null);
});

test("batchMap executes tasks in bounded concurrent chunks", async () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  let maxConcurrent = 0;
  let active = 0;

  const results = await batchMap(items, 3, async (num) => {
    active++;
    maxConcurrent = Math.max(maxConcurrent, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return num * 2;
  });

  assert.deepEqual(results, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  assert.ok(maxConcurrent <= 3);
});

test("recommendations combine seeds, rank overlaps, and exclude seed shows/movies", async () => {
  const seeds = [{ id: 1, name: "One" }, { id: 2, name: "Two" }];
  const metas = await loadCatalog("recommended-series", seeds, async (url) => {
    const first = url.pathname.includes("tv/1/");
    return response({ results: first
      ? [{ id: 9, name: "Shared", popularity: 2 }, { id: 1, name: "Seed" }]
      : [{ id: 8, name: "Other", popularity: 99 }, { id: 9, name: "Shared", popularity: 2 }]
    });
  });
  assert.deepEqual(metas.map((item) => item.name), ["Shared", "Other"]);
});

test("movie recommendations and now-playing load correctly", async () => {
  const movieSeeds = [{ id: 550, name: "Fight Club" }];
  const metas = await loadCatalog("recommended-movies", movieSeeds, async (url) => {
    return response({ results: [{ id: 680, title: "Pulp Fiction", popularity: 50, release_date: "1994-09-10" }] });
  }, new Date(), "movie");
  assert.equal(metas.length, 1);
  assert.equal(metas[0].name, "Pulp Fiction");
  assert.equal(metas[0].type, "movie");

  const nowPlaying = await loadCatalog("now-playing", [], async () => {
    return response({ results: [{ id: 550, title: "Fight Club", release_date: "1999-10-15" }] });
  }, new Date(), "movie");
  assert.equal(nowPlaying.length, 1);
  assert.equal(nowPlaying[0].name, "Fight Club");
});

test("metadata route accepts Nuvio's encoded TMDb IDs and IMDb IDs for series and movies", () => {
  assert.deepEqual(
    matchCatalogRequestPath("/catalog/private-key/meta/series/tmdb%3A123.json"),
    { key: "private-key", resource: "meta/series/tmdb%3A123.json", mediaType: "series", catalogId: undefined, metaId: "123" }
  );
  assert.deepEqual(
    matchCatalogRequestPath("/catalog/private-key/meta/movie/tmdb%3A456.json"),
    { key: "private-key", resource: "meta/movie/tmdb%3A456.json", mediaType: "movie", catalogId: undefined, metaId: "456" }
  );
  assert.deepEqual(
    matchCatalogRequestPath("/catalog/private-key/meta/series/tt27799594.json"),
    { key: "private-key", resource: "meta/series/tt27799594.json", mediaType: "series", catalogId: undefined, metaId: "tt27799594" }
  );
  assert.deepEqual(
    matchCatalogRequestPath("/catalog/private-key/meta/series/imdb%3Att27799594.json"),
    { key: "private-key", resource: "meta/series/imdb%3Att27799594.json", mediaType: "series", catalogId: undefined, metaId: "tt27799594" }
  );
  assert.deepEqual(
    matchCatalogRequestPath("/catalog/private-key/catalog/movie/new-movies.json"),
    { key: "private-key", resource: "catalog/movie/new-movies.json", mediaType: "movie", catalogId: "new-movies", extra: undefined }
  );
  assert.equal(matchCatalogRequestPath("/catalog/private-key/meta/series/invalid_id.json"), undefined);
});

test("curated network and genre catalogs load properly", async () => {
  const hboMetas = await loadCatalog("hbo-max", [], async (url) => {
    assert.ok(url.searchParams.get("with_networks")?.includes("49"));
    return response({ results: [{ id: 1399, name: "Game of Thrones", first_air_date: "2011-04-17" }] });
  }, new Date(), "series");
  assert.equal(hboMetas.length, 1);
  assert.equal(hboMetas[0].name, "Game of Thrones");

  const a24Metas = await loadCatalog("a24-films", [], async (url) => {
    assert.equal(url.searchParams.get("with_companies"), "41077");
    return response({ results: [{ id: 496243, title: "Parasite", release_date: "2019-05-30" }] });
  }, new Date(), "movie");
  assert.equal(a24Metas.length, 1);
  assert.equal(a24Metas[0].name, "Parasite");

  const animeMetas = await loadCatalog("anime-trending", [], async (url) => {
    assert.equal(url.searchParams.get("with_genres"), "16");
    assert.equal(url.searchParams.get("with_original_language"), "ja");
    return response({ results: [{ id: 85937, name: "Demon Slayer", first_air_date: "2019-04-06" }] });
  }, new Date(), "series");
  assert.equal(animeMetas.length, 1);
  assert.equal(animeMetas[0].name, "Demon Slayer");
});

test("parseCatalogConfig and loadCatalog handle custom bespoke discovery feeds", async () => {
  const customConfig = [
    {
      id: "custom-90s-scifi",
      name: "90s Sci-Fi Thrillers",
      type: "movie",
      filters: {
        with_genres: "878,53",
        primary_release_year: "1999",
        vote_average_gte: "7.0",
        sort_by: "popularity.desc"
      }
    }
  ];

  const parsed = parseCatalogConfig(customConfig);
  const customItem = parsed.find((c) => c.id === "custom-90s-scifi");
  assert.ok(customItem);
  assert.equal(customItem.name, "90s Sci-Fi Thrillers");
  assert.equal(customItem.isCustom, true);
  assert.equal(customItem.filters.with_genres, "878,53");

  const originalEnv = process.env.DISCOVERY_CATALOGS_CONFIG;
  process.env.DISCOVERY_CATALOGS_CONFIG = JSON.stringify(customConfig);

  try {
    const customMetas = await loadCatalog("custom-90s-scifi", [], async (url) => {
      assert.ok(url.pathname.includes("discover/movie"));
      assert.equal(url.searchParams.get("with_genres"), "878,53");
      assert.equal(url.searchParams.get("primary_release_year"), "1999");
      assert.equal(url.searchParams.get("vote_average.gte"), "7.0");
      return response({ results: [{ id: 603, title: "The Matrix", release_date: "1999-03-30" }] });
    }, new Date(), "movie");

    assert.equal(customMetas.length, 1);
    assert.equal(customMetas[0].name, "The Matrix");
  } finally {
    process.env.DISCOVERY_CATALOGS_CONFIG = originalEnv;
  }
});

