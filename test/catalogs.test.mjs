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
  resolveSeedShows,
  resolveSeedMovies,
  toMeta
} from "../src/catalogs.mjs";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const APP_VERSION = String(packageMetadata.version);

function response(data) {
  return { ok: true, json: async () => data };
}

test("catalog manifest exposes series and movie catalogs in requested order", () => {
  const manifest = catalogManifest(APP_VERSION, "private-key");
  assert.equal(manifest.version, APP_VERSION);
  assert.deepEqual(manifest.types, ["movie", "series"]);
  assert.deepEqual(manifest.idPrefixes, ["tmdb:", "tt"]);
  assert.deepEqual(manifest.catalogs.map((item) => item.id), [
    "now-playing",
    "library-today",
    "new-series",
    "recommended-series",
    "new-movies",
    "recommended-movies"
  ]);
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
});

test("TMDb items map to Nuvio-compatible series & movie metadata", () => {
  assert.deepEqual(toMeta({ id: 123, name: "Example Show", poster_path: "/poster.jpg", first_air_date: "2026-08-16" }, "series"), {
    id: "tmdb:123", type: "series", name: "Example Show",
    poster: "https://image.tmdb.org/t/p/w500/poster.jpg",
    background: undefined, description: undefined, releaseInfo: "2026", imdbRating: undefined
  });

  assert.deepEqual(toMeta({ id: 456, title: "Example Movie", poster_path: "/m_poster.jpg", release_date: "2026-05-10", vote_average: 8.4 }, "movie"), {
    id: "tmdb:456", type: "movie", name: "Example Movie",
    poster: "https://image.tmdb.org/t/p/w500/m_poster.jpg",
    background: undefined, description: undefined, releaseInfo: "2026", imdbRating: 8.4
  });
});

test("loadMeta populates episode videos array for series and single meta for movie", async () => {
  const seriesMeta = await loadMeta(123, async (url) => {
    if (url.pathname.includes("season/1")) {
      return response({
        episodes: [
          { episode_number: 1, name: "Pilot", air_date: "2026-01-01", season_number: 1, still_path: "/still.jpg" },
          { episode_number: 2, name: "Second", air_date: "2026-01-08", season_number: 1 }
        ]
      });
    }
    return response({ id: 123, name: "Test Show", seasons: [{ season_number: 1, episode_count: 2 }] });
  }, "series");

  assert.equal(seriesMeta.name, "Test Show");
  assert.equal(seriesMeta.type, "series");
  assert.equal(seriesMeta.videos.length, 2);
  assert.equal(seriesMeta.videos[0].id, "tmdb:123:1:1");
  assert.equal(seriesMeta.videos[0].title, "Pilot");
  assert.equal(seriesMeta.videos[0].season, 1);
  assert.equal(seriesMeta.videos[0].episode, 1);

  const movieMeta = await loadMeta(456, async () => {
    return response({ id: 456, title: "Test Movie", release_date: "2026-05-01" });
  }, "movie");

  assert.equal(movieMeta.name, "Test Movie");
  assert.equal(movieMeta.type, "movie");
  assert.equal(movieMeta.videos, undefined);
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

test("show names resolve to private recommendation seeds", async () => {
  const seeds = await resolveSeedShows("King of the Hill, 456", async (url) => {
    if (url.pathname.includes("search/tv")) return response({ results: [{ id: 111, name: "King of the Hill" }] });
    return response({ id: 456, name: "Another Show" });
  });
  assert.deepEqual(seeds, [{ id: 111, name: "King of the Hill" }, { id: 456, name: "Another Show" }]);
  assert.deepEqual(parseSeeds(JSON.stringify(seeds)), seeds);
});

test("movie names resolve to movie recommendation seeds", async () => {
  const movieSeeds = await resolveSeedMovies("Inception, 789", async (url) => {
    if (url.pathname.includes("search/movie")) return response({ results: [{ id: 27205, title: "Inception" }] });
    return response({ id: 789, title: "Another Movie" });
  });
  assert.deepEqual(movieSeeds, [{ id: 27205, name: "Inception" }, { id: 789, name: "Another Movie" }]);
  assert.deepEqual(parseMovieSeeds(JSON.stringify(movieSeeds)), movieSeeds);
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
