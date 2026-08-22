export function privateRepositoryUrl(baseUrl, key) {
  return `${String(baseUrl).replace(/\/$/, "")}/repository/${encodeURIComponent(key)}/manifest.json`;
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
