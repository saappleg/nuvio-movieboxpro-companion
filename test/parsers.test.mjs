import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseCandidate,
  findEpisodeSourceId,
  findEpisodeSourceIdByTitle,
  findInitialSourceId,
  findMovieBoxSeasonNumbers,
  hasEpisodeSourceTitles,
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

test("matches episode sources by title when MovieBox and TMDb season numbers differ", () => {
  const payload = {
    data: {
      episodes: [
        { season: 14, episode: 1, name: "The Impossible Stream", tfid: 1401 },
        { season: 14, episode: 2, title: "Another Episode", tfid: 1402 }
      ]
    }
  };
  assert.equal(findEpisodeSourceIdByTitle(payload, "The Impossible Stream"), "1401");
  assert.equal(findEpisodeSourceIdByTitle(payload, "the-impossible stream!"), "1401");
  assert.equal(findEpisodeSourceIdByTitle(payload, "Missing Episode"), null);
  assert.equal(hasEpisodeSourceTitles(payload), true);
  assert.equal(hasEpisodeSourceTitles({ data: { episodes: [{ season: 1, episode: 1, tfid: 1 }] } }), false);
});

test("extracts available MovieBox season numbers from page markup", () => {
  const html = '<a href="/tvshow/1?season=1">1</a><button data-season="14">14</button><script>season: 3</script>';
  assert.deepEqual(findMovieBoxSeasonNumbers(html), [1, 3, 14]);
});
