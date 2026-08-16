// Nuvio/Hermes-compatible provider: deliberately uses Promises, not async/await.
// The companion replaces these placeholders only when serving this file locally.
// The checked-in source never contains a user's address or key.
var COMPANION_URL = __COMPANION_URL__;
var COMPANION_KEY = __COMPANION_KEY__;

function getStreams(tmdbId, mediaType, season, episode) {
  // Newer Nuvio builds may pass one media object; older builds pass four values.
  if (tmdbId && typeof tmdbId === "object") {
    var media = tmdbId;
    tmdbId = media.tmdbId || media.tmdb_id || media.id;
    mediaType = media.mediaType || media.media_type || media.type || mediaType;
    season = media.season || media.seasonNumber || media.season_number || season;
    episode = media.episode || media.episodeNumber || media.episode_number || episode;
  }
  var normalizedType = String(mediaType || "movie").toLowerCase();
  normalizedType = /tv|series|show|episode/.test(normalizedType) ? "tv" : "movie";
  var rawId = String(tmdbId == null ? "" : tmdbId);
  var imdbMatch = rawId.match(/tt\d+/i);
  var numericMatch = rawId.match(/\d+/);
  var normalizedId = imdbMatch ? imdbMatch[0].toLowerCase() : (numericMatch ? numericMatch[0] : "");
  var query = [
    "tmdbId=" + encodeURIComponent(normalizedId),
    "mediaType=" + encodeURIComponent(normalizedType),
    "season=" + encodeURIComponent(season == null ? "" : season),
    "episode=" + encodeURIComponent(episode == null ? "" : episode)
  ].join("&");

  return fetch(COMPANION_URL + "/streams?" + query, {
    method: "GET",
    headers: { Authorization: "Bearer " + COMPANION_KEY }
  }).then(function(response) {
    if (!response.ok) throw new Error("MovieBoxPro companion error: " + response.status);
    return response.json();
  }).then(function(streams) {
    return Array.isArray(streams) ? streams : [];
  }).catch(function(error) {
    console.log("[MovieBoxPro Local] " + error.message);
    return [];
  });
}

if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
else if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
