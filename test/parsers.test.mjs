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
  matchesEpisodeTitle,
  stripEpisodePrefix,
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
        { season: 11, episode: 1, name: "1. The Impossible Stream", tfid: 1101 },
        { season: 11, episode: 2, title: "Children of a Lesser Bog", tfid: 1102 },
        { season: 11, episode: 10, title: "All the Way Down", tfid: 1110 },
        { season: 12, episode: 1, title: "The One Amigo", tfid: 1201 }
      ]
    }
  };
  // Matches raw title
  assert.equal(findEpisodeSourceIdByTitle(payload, "The Impossible Stream"), "1101");
  // Matches normalized punctuation
  assert.equal(findEpisodeSourceIdByTitle(payload, "the-impossible stream!"), "1101");
  // Matches when candidate has numbered prefix
  assert.equal(findEpisodeSourceIdByTitle(payload, "Children of a Lesser Bog"), "1102");
  assert.equal(findEpisodeSourceIdByTitle(payload, "Ep 2 - Children of a Lesser Bog"), "1102");
  // Substring tolerance
  assert.equal(findEpisodeSourceIdByTitle(payload, "All the Way Down"), "1110");
  assert.equal(findEpisodeSourceIdByTitle(payload, "Missing Episode"), null);
  assert.equal(hasEpisodeSourceTitles(payload), true);
  assert.equal(hasEpisodeSourceTitles({ data: { episodes: [{ season: 1, episode: 1, tfid: 1 }] } }), false);
});

test("stripEpisodePrefix removes leading episode numbers and markers", () => {
  assert.equal(stripEpisodePrefix("1. The Impossible Stream"), "The Impossible Stream");
  assert.equal(stripEpisodePrefix("Ep 5: The Bots and the Bees"), "The Bots and the Bees");
  assert.equal(stripEpisodePrefix("S11E01 - Rebirth"), "Rebirth");
  assert.equal(stripEpisodePrefix("E10 – Near-Death Wish"), "Near-Death Wish");
  assert.equal(stripEpisodePrefix("Neutopia"), "Neutopia");
});

test("matchesEpisodeTitle matches cross-provider titles with variations", () => {
  assert.equal(matchesEpisodeTitle("1. The Impossible Stream", "The Impossible Stream"), true);
  assert.equal(matchesEpisodeTitle("The Impossible Stream", "1. The Impossible Stream"), true);
  assert.equal(matchesEpisodeTitle("Ep 1: The One Amigo", "The One Amigo"), true);
  assert.equal(matchesEpisodeTitle("Children of a Lesser Bog", "Children of a Lesser Bog"), true);
  assert.equal(matchesEpisodeTitle("Completely Different", "Something Else"), false);
});

test("extracts available MovieBox season numbers from page markup", () => {
  const html = '<a href="/tvshow/1?season=1">1</a><button data-season="14">14</button><script>season: 3</script>';
  assert.deepEqual(findMovieBoxSeasonNumbers(html), [1, 3, 14]);
});
