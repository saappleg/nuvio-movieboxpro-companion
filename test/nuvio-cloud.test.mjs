import assert from "node:assert/strict";
import test from "node:test";
import {
  loginNuvioCloud,
  fetchNuvioProfiles,
  fetchNuvioLibraryRaw,
  extractMediaFromLibrary,
  enrichLibrarySeeds,
  syncNuvioCloudLibrary
} from "../src/nuvio-cloud.mjs";

function mockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

test("Nuvio Cloud login returns access token and user info", async () => {
  const mockFetch = async (url, options) => {
    assert.match(String(url), /\/auth\/v1\/token\?grant_type=password/);
    const body = JSON.parse(options.body);
    assert.equal(body.email, "test@example.com");
    assert.equal(body.password, "password123");
    return mockResponse({
      access_token: "mock-jwt-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      user: { id: "user-123", email: "test@example.com" }
    });
  };

  const result = await loginNuvioCloud("test@example.com", "password123", "https://api.nuvio.tv", "anon-key", mockFetch);
  assert.equal(result.accessToken, "mock-jwt-token");
  assert.equal(result.user.email, "test@example.com");
});

test("fetchNuvioProfiles parses RPC and REST responses", async () => {
  const mockFetchRpc = async () => {
    return mockResponse([{ id: 1, name: "Main Profile" }, { id: 2, name: "Kids" }]);
  };
  const profiles = await fetchNuvioProfiles("mock-token", "https://api.nuvio.tv", "anon", mockFetchRpc);
  assert.deepEqual(profiles, [
    { id: 1, name: "Main Profile" },
    { id: 2, name: "Kids" }
  ]);
});

test("extractMediaFromLibrary separates TV shows and movies from raw Nuvio library payloads", () => {
  const rawItems = [
    { content_id: "tmdb:1399", content_type: "tv", title: "Game of Thrones" },
    { content_id: "tt0944947", type: "series", title: "Game of Thrones" },
    { content_id: "550", media_type: "movie", title: "Fight Club" },
    { id: "tt0137523", type: "movie", name: "Fight Club" },
    { content_id: "tmdb:27205", media_type: "movie", title: "Inception" },
    { content_id: "tmdb:60059", type: "tv", name: "Better Call Saul", season: 1 }
  ];

  const extracted = extractMediaFromLibrary(rawItems);
  assert.equal(extracted.series.length, 2); // De-duplicated GoT + BCS
  assert.equal(extracted.movies.length, 2); // De-duplicated Fight Club + Inception
  assert.equal(extracted.series[0].tmdbId, 1399);
  assert.equal(extracted.movies[0].tmdbId, 550);
});

test("syncNuvioCloudLibrary performs end-to-end sync and returns counts and seeds", async () => {
  const mockFetch = async (url) => {
    const u = String(url);
    if (u.includes("sync_pull_library")) {
      return mockResponse([
        { content_id: "tmdb:1399", content_type: "tv", title: "Game of Thrones" },
        { content_id: "tmdb:550", content_type: "movie", title: "Fight Club" }
      ]);
    }
    if (u.includes("sync_pull_watched_items")) {
      return mockResponse([]);
    }
    return mockResponse({});
  };

  const summary = await syncNuvioCloudLibrary({
    accessToken: "mock-token",
    profileId: 1,
    cloudUrl: "https://api.nuvio.tv",
    anonKey: "mock-anon"
  }, mockFetch);

  assert.equal(summary.itemCount, 2);
  assert.equal(summary.seriesSeeds.length, 1);
  assert.equal(summary.seriesSeeds[0].id, 1399);
  assert.equal(summary.movieSeeds.length, 1);
  assert.equal(summary.movieSeeds[0].id, 550);
  assert.ok(summary.syncedAt);
});
