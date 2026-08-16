const decodeHtml = (value) => String(value || "")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const stripTags = (value) => decodeHtml(String(value || "").replace(/<[^>]*>/g, " "))
  .replace(/\s+/g, " ")
  .trim();

export function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseSearchResults(html) {
  const results = [];
  const re = /<a\s+[^>]*href="\/(movie|tvshow)\/(\d+)[^"]*"[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const body = match[4];
    const meta = stripTags(body);
    const year = Number((meta.match(/\b(19|20)\d{2}\b/) || [])[0]) || null;
    const runtime = Number((meta.match(/\b(\d+)\s*min\b/i) || [])[1]) || null;
    const score = Number((body.match(/class="score"[\s\S]*?<span>([\d.]+)<\/span>/i) || [])[1]) || null;
    results.push({
      mediaType: match[1] === "tvshow" ? "tv" : "movie",
      id: match[2],
      title: decodeHtml(match[3]),
      year,
      runtime,
      score
    });
  }
  return results;
}

export function scoreCandidate(candidate, target) {
  let score = 0;
  const a = normalizeTitle(candidate.title);
  const b = normalizeTitle(target.title);
  if (a === b) score += 60;
  else if (a.includes(b) || b.includes(a)) score += 35;
  if (candidate.mediaType === target.mediaType) score += 20;
  if (candidate.year && target.year) {
    const delta = Math.abs(candidate.year - target.year);
    if (delta === 0) score += 15;
    else if (delta === 1) score += 8;
  }
  if (candidate.runtime && target.runtime) {
    const delta = Math.abs(candidate.runtime - target.runtime);
    if (delta <= 3) score += 5;
    else if (delta <= 10) score += 2;
  }
  return score;
}

export function chooseCandidate(candidates, target) {
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, target) }))
    .sort((a, b) => b.score - a.score)[0] || null;
}

function extractJsonAssignment(html, variableName) {
  const marker = `var ${variableName} = `;
  const start = html.indexOf(marker);
  if (start < 0) return [];
  let index = start + marker.length;
  while (/\s/.test(html[index])) index += 1;
  if (html[index] !== "[") return [];
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let end = index; end < html.length; end += 1) {
    const ch = html[end];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(index, end + 1));
    }
  }
  return [];
}

export function parsePlayerResponse(html) {
  return {
    qualityLevels: extractJsonAssignment(html, "qualityLevels"),
    resources: extractJsonAssignment(html, "resourceFileList")
  };
}

export function findInitialSourceId(html, mediaType) {
  const key = mediaType === "tv" ? "tfid" : "mfid";
  const patterns = [
    new RegExp(`/index/index/player\\?${key}=(\\d+)`, "i"),
    new RegExp(`['\"]?${key}['\"]?\\s*[:=]\\s*['\"]?(\\d+)`, "i"),
    mediaType === "movie" ? /var\s+pfid\s*=\s*['"]mfid=(\d+)/i : /$a/
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function findEpisodeSourceId(payload, season, episode) {
  const seen = new Set();
  function visit(value) {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (!Array.isArray(value)) {
      const s = Number(value.season ?? value.season_num ?? value.s);
      const e = Number(value.episode ?? value.episode_num ?? value.ep ?? value.e);
      const id = value.tfid ?? value.fid ?? value.id;
      if (s === Number(season) && e === Number(episode) && id != null) return String(id);
    }
    for (const child of Object.values(value)) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  }
  return visit(payload);
}

function inferQuality(level) {
  const name = String(level.name || "").toUpperCase();
  if (name.includes("2160") || name.includes("4K") || Number(level.width) >= 3000) return "4K";
  if (name.includes("1080") || Number(level.width) >= 1900) return "1080p";
  if (name.includes("720") || Number(level.width) >= 1200) return "720p";
  if (name.includes("480")) return "480p";
  if (name.includes("360")) return "360p";
  return level.name || "Auto";
}

export function streamsFromPlayer(parsed, referer) {
  const resourceById = new Map(parsed.resources.map((item) => [String(item.oss_fid || item.id), item]));
  const streams = [];
  for (const level of parsed.qualityLevels) {
    for (const source of level.sources || []) {
      if (!source.src) continue;
      const resource = resourceById.get(String(source.mp4_id)) || parsed.resources[0] || {};
      const bits = [level.name || "Auto"];
      if (level.hdr) bits.push("HDR");
      if (level.codec) bits.push(level.codec);
      if (resource.size) bits.push(resource.size);
      streams.push({
        name: "MovieBoxPro",
        title: bits.join(" · "),
        url: source.src,
        quality: inferQuality(level),
        headers: {
          Referer: referer,
          Origin: "https://www.movieboxpro.app"
        },
        _meta: {
          filename: resource.file || null,
          mediaId: source.mp4_id || null
        }
      });
    }
  }
  return streams;
}
