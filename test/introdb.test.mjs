import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveImdbIdForShow,
  fetchIntroSegments,
  attachIntroSegmentsToStreams
} from "../src/introdb.mjs";

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

test("resolveImdbIdForShow resolves numeric TMDb IDs via external_ids and returns existing IMDb IDs", async () => {
  assert.equal(await resolveImdbIdForShow("tt0944947"), "tt0944947");

  const resolved = await resolveImdbIdForShow(1399, "fake_tmdb_key", async (url) => {
    assert.ok(url.pathname.includes("tv/1399/external_ids"));
    assert.equal(url.searchParams.get("api_key"), "fake_tmdb_key");
    return response({ id: 1399, imdb_id: "tt0944947" });
  });

  assert.equal(resolved, "tt0944947");
});

test("fetchIntroSegments fetches and formats intro, outro, and recap timestamps", async () => {
  const segments = await fetchIntroSegments({ imdbId: "tt0944947", season: 1, episode: 1 }, async (url) => {
    assert.equal(url, "https://api.introdb.app/segments?imdb_id=tt0944947&season=1&episode=1");
    return response({
      imdb_id: "tt0944947",
      season: 1,
      episode: 1,
      intro: { start_sec: 120, end_sec: 180, start_ms: 120000, end_ms: 180000, confidence: 0.98 },
      outro: { start_sec: 2400, end_sec: 2460, start_ms: 2400000, end_ms: 2460000, confidence: 0.95 },
      recap: null
    });
  });

  assert.equal(segments.imdbId, "tt0944947");
  assert.equal(segments.season, 1);
  assert.equal(segments.episode, 1);
  assert.equal(segments.intro.start, 120);
  assert.equal(segments.intro.end, 180);
  assert.equal(segments.outro.start, 2400);
  assert.equal(segments.outro.end, 2460);
  assert.equal(segments.recap, null);
});

test("attachIntroSegmentsToStreams enriches stream objects with intro and outro data", () => {
  const sampleStreams = [
    { name: "MovieBoxPro 1080p", title: "MovieBoxPro - 1080p", url: "https://example.com/stream.mp4" }
  ];
  const segments = {
    intro: { start: 90, end: 150 },
    outro: { start: 3000, end: 3060 },
    recap: null,
    raw: { intro: { start_ms: 90000, end_ms: 150000 } }
  };

  const enriched = attachIntroSegmentsToStreams(sampleStreams, segments);
  assert.equal(enriched.length, 1);
  assert.deepEqual(enriched[0].intro, { start: 90, end: 150 });
  assert.deepEqual(enriched[0].outro, { start: 3000, end: 3060 });
  assert.equal(enriched[0].url, "https://example.com/stream.mp4");
});
