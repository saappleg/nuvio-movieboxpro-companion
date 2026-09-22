export function privateRepositoryUrl(baseUrl, key) {
  return `${String(baseUrl).replace(/\/$/, "")}/repository/${encodeURIComponent(key)}/manifest.json`;
}

export function stremioAddonUrl(baseUrl, key) {
  return `${String(baseUrl).replace(/\/$/, "")}/stremio/${encodeURIComponent(key)}/manifest.json`;
}

export function matchPrivateRepositoryPath(pathname) {
  const cleanPath = String(pathname || "").split("?")[0].replace(/\/+$/, "");
  const match = cleanPath.match(/^\/repository\/([^/]+)(?:\/(manifest\.json|providers\/movieboxpro-local\.js))?$/);
  if (!match) return undefined;
  return { key: decodeURIComponent(match[1]), resource: match[2] || "manifest.json" };
}

export function repositoryManifest(version, key, pathAuthenticated = true) {
  return {
    name: "MovieBoxPro Local",
    version,
    scrapers: [{
      id: "movieboxpro-local",
      name: "MovieBoxPro Local",
      description: "Streams from your own MovieBoxPro account through your private companion",
      version,
      author: "Local",
      supportedTypes: ["movie", "tv", "series"],
      filename: pathAuthenticated
        ? "providers/movieboxpro-local.js"
        : `providers/movieboxpro-local.js?key=${encodeURIComponent(key)}`,
      enabled: true,
      formats: ["m3u8", "mp4", "mkv"],
      contentLanguage: ["en"],
      disabledPlatforms: []
    }]
  };
}

export function matchStremioPath(pathname) {
  const cleanPath = String(pathname || "").split("?")[0].replace(/\/+$/, "");
  const manifestMatch = cleanPath.match(/^\/stremio\/([^/]+)\/manifest\.json$/i);
  if (manifestMatch) {
    try {
      return { key: decodeURIComponent(manifestMatch[1]), resource: "manifest.json" };
    } catch {
      return undefined;
    }
  }

  const streamMatch = cleanPath.match(/^\/stremio\/([^/]+)\/stream\/(movie|series)\/([^/]+)\.json$/i);
  if (!streamMatch) return undefined;
  try {
    return {
      key: decodeURIComponent(streamMatch[1]),
      resource: "stream",
      type: streamMatch[2].toLowerCase(),
      id: decodeURIComponent(streamMatch[3])
    };
  } catch {
    return undefined;
  }
}

export function stremioManifest(version) {
  return {
    id: "community.nuvio.movieboxpro.companion",
    version,
    name: "MovieBoxPro Companion",
    description: "MovieBoxPro streams through a private companion service",
    resources: ["stream"],
    types: ["movie", "series"],
    idPrefixes: ["tt", "tmdb:", "tmdb", "imdb:"]
  };
}
