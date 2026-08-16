import assert from "node:assert/strict";
import test from "node:test";
import { catalogManifest, loadCatalog, matchCatalogRequestPath, parseSeeds, resolveSeedShows, toMeta } from "../src/catalogs.mjs";

function response(data) {
  return { ok: true, json: async () => data };
}

test("catalog manifest exposes four TV rows", () => {
  const manifest = catalogManifest("0.3.5", "private-key");
  assert.equal(manifest.version, "0.3.5");
  assert.deepEqual(manifest.catalogs.map((item) => item.id), ["airing-today", "this-week", "new-returning", "recommended"]);
});

test("TMDb items map to Nuvio-compatible series metadata", () => {
  assert.deepEqual(toMeta({ id: 123, name: "Example", poster_path: "/poster.jpg", first_air_date: "2026-08-16" }), {
    id: "tmdb:123", type: "series", name: "Example",
    poster: "https://image.tmdb.org/t/p/w500/poster.jpg",
    background: undefined, description: undefined, releaseInfo: "2026", imdbRating: undefined
  });
});

test("show names resolve to private recommendation seeds", async () => {
  const seeds = await resolveSeedShows("King of the Hill, 456", async (url) => {
    if (url.pathname.includes("search/tv")) return response({ results: [{ id: 111, name: "King of the Hill" }] });
    return response({ id: 456, name: "Another Show" });
  });
  assert.deepEqual(seeds, [{ id: 111, name: "King of the Hill" }, { id: 456, name: "Another Show" }]);
  assert.deepEqual(parseSeeds(JSON.stringify(seeds)), seeds);
});

test("recommendations combine seeds, rank overlaps, and exclude seed shows", async () => {
  const seeds = [{ id: 1, name: "One" }, { id: 2, name: "Two" }];
  const metas = await loadCatalog("recommended", seeds, async (url) => {
    const first = url.pathname.includes("tv/1/");
    return response({ results: first
      ? [{ id: 9, name: "Shared", popularity: 2 }, { id: 1, name: "Seed" }]
      : [{ id: 8, name: "Other", popularity: 99 }, { id: 9, name: "Shared", popularity: 2 }]
    });
  });
  assert.deepEqual(metas.map((item) => item.name), ["Shared", "Other"]);
});

test("metadata route accepts Nuvio's encoded TMDb IDs", () => {
  assert.deepEqual(
    matchCatalogRequestPath("/catalog/private-key/meta/series/tmdb%3A123.json"),
    { key: "private-key", resource: "meta/series/tmdb%3A123.json", catalogId: undefined, metaId: "123" }
  );
  assert.equal(matchCatalogRequestPath("/catalog/private-key/meta/series/imdb%3Att123.json"), undefined);
});
