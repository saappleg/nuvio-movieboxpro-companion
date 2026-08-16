import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseCandidate,
  findEpisodeSourceId,
  findInitialSourceId,
  parsePlayerResponse,
  parseSearchResults,
  streamsFromPlayer
} from "../src/parsers.mjs";

test("parses and matches server-rendered search results", () => {
  const html = `<a href="/movie/42" title="Example Film"><div><p class="score"><span>7.2</span></p><p>Example Film</p><p>7.2 | 2026 | 112 min<br>DRAMA</p></div></a>`;
  const results = parseSearchResults(html);
  assert.equal(results[0].id, "42");
  assert.equal(results[0].year, 2026);
  assert.equal(chooseCandidate(results, { title: "Example Film", year: 2026, mediaType: "movie", runtime: 112 }).score, 100);
});

test("extracts balanced player arrays and maps streams", () => {
  const html = `<script>var qualityLevels = [{"name":"1080p","width":1920,"codec":"H.264","sources":[{"src":"https://media.invalid/a.m3u8","type":"application/x-mpegURL","mp4_id":8}]}]; var resourceFileList = [{"id":8,"oss_fid":8,"file":"release.mkv","size":"4 GB"}];</script>`;
  const parsed = parsePlayerResponse(html);
  assert.equal(parsed.qualityLevels[0].name, "1080p");
  const streams = streamsFromPlayer(parsed, "https://www.movieboxpro.app/movie/1");
  assert.equal(streams[0].quality, "1080p");
  assert.equal(streams[0].headers.Origin, "https://www.movieboxpro.app");
});

test("finds source IDs", () => {
  assert.equal(findInitialSourceId(`<a href="/index/index/player?mfid=123">`, "movie"), "123");
  const payload = { data: { episodes: [{ season: 2, episode: 3, tfid: 456 }] } };
  assert.equal(findEpisodeSourceId(payload, 2, 3), "456");
});
