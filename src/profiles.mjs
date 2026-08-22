import crypto from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const PROFILES_FILE = path.resolve(process.env.COMPANION_PROFILES_FILE || "work/profiles.json");

function generateSecureKey(prefix = "mbp") {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `profile-${Date.now().toString(36)}`;
}

let cachedProfiles = null;

export async function loadProfiles() {
  if (cachedProfiles) return cachedProfiles;

  try {
    const text = await readFile(PROFILES_FILE, "utf8");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length) {
      cachedProfiles = parsed;
      return cachedProfiles;
    }
  } catch {}

  // Initialize with Default profile backed by current environment
  const defaultProfile = {
    id: "default",
    name: "Default Profile",
    companionKey: process.env.COMPANION_KEY || generateSecureKey("mbp"),
    pluginSetupKey: process.env.PLUGIN_SETUP_KEY || generateSecureKey("nuvio"),
    browserProfileDir: path.resolve(process.env.MOVIEBOXPRO_PROFILE || "work/movieboxpro-profile"),
    recommendationSeeds: process.env.RECOMMENDATION_SEEDS ? JSON.parse(process.env.RECOMMENDATION_SEEDS) : [],
    movieRecommendationSeeds: process.env.MOVIE_RECOMMENDATION_SEEDS ? JSON.parse(process.env.MOVIE_RECOMMENDATION_SEEDS) : [],
    catalogsConfig: process.env.DISCOVERY_CATALOGS_CONFIG ? JSON.parse(process.env.DISCOVERY_CATALOGS_CONFIG) : null,
    userTimezone: process.env.USER_TIMEZONE || "",
    nuvioCloud: {
      connected: Boolean(process.env.NUVIO_CLOUD_TOKEN || process.env.NUVIO_CLOUD_EMAIL),
      email: process.env.NUVIO_CLOUD_EMAIL || "",
      token: process.env.NUVIO_CLOUD_TOKEN || "",
      profileId: process.env.NUVIO_CLOUD_PROFILE_ID || "1",
      profileName: process.env.NUVIO_CLOUD_PROFILE_NAME || "Default Profile",
      lastSync: process.env.NUVIO_CLOUD_LAST_SYNC || null
    },
    createdAt: new Date().toISOString()
  };

  cachedProfiles = [defaultProfile];
  await saveProfiles(cachedProfiles);
  return cachedProfiles;
}

export async function saveProfiles(profiles) {
  cachedProfiles = Array.isArray(profiles) ? profiles : [];
  await mkdir(path.dirname(PROFILES_FILE), { recursive: true });
  await writeFile(PROFILES_FILE, JSON.stringify(cachedProfiles, null, 2), "utf8");
  return cachedProfiles;
}

export async function getProfiles() {
  return await loadProfiles();
}

export async function getProfileById(id) {
  const profiles = await loadProfiles();
  return profiles.find((p) => p.id === String(id || "").toLowerCase().trim()) || null;
}

export async function getProfileByCompanionKey(key) {
  if (!key) return null;
  const profiles = await loadProfiles();
  return profiles.find((p) => p.companionKey === key) || null;
}

export async function getProfileByPluginKey(key) {
  if (!key) return null;
  const profiles = await loadProfiles();
  return profiles.find((p) => p.pluginSetupKey === key) || null;
}

export async function createProfile({ name, userTimezone = "" }) {
  const profiles = await loadProfiles();
  const rawName = String(name || "").trim() || `Profile ${profiles.length + 1}`;
  let slug = slugify(rawName);
  let counter = 1;
  while (profiles.some((p) => p.id === slug)) {
    slug = `${slugify(rawName)}-${++counter}`;
  }

  const profileDir = path.resolve(`work/movieboxpro-profile-${slug}`);
  const newProfile = {
    id: slug,
    name: rawName,
    companionKey: generateSecureKey("mbp"),
    pluginSetupKey: generateSecureKey("nuvio"),
    browserProfileDir: profileDir,
    recommendationSeeds: [],
    movieRecommendationSeeds: [],
    catalogsConfig: null,
    userTimezone: userTimezone || process.env.USER_TIMEZONE || "",
    nuvioCloud: {
      connected: false,
      email: "",
      token: "",
      profileId: "1",
      profileName: "Default Profile",
      lastSync: null
    },
    createdAt: new Date().toISOString()
  };

  profiles.push(newProfile);
  await saveProfiles(profiles);
  return newProfile;
}

export async function updateProfile(id, updates = {}) {
  const profiles = await loadProfiles();
  const index = profiles.findIndex((p) => p.id === String(id).toLowerCase().trim());
  if (index < 0) throw new Error(`Profile ${id} not found`);

  const existing = profiles[index];
  const safeUpdates = { ...existing };

  if (typeof updates.name === "string" && updates.name.trim()) safeUpdates.name = updates.name.trim();
  if (typeof updates.userTimezone === "string") safeUpdates.userTimezone = updates.userTimezone.trim();
  if (Array.isArray(updates.recommendationSeeds)) safeUpdates.recommendationSeeds = updates.recommendationSeeds;
  if (Array.isArray(updates.movieRecommendationSeeds)) safeUpdates.movieRecommendationSeeds = updates.movieRecommendationSeeds;
  if (Array.isArray(updates.catalogsConfig) || updates.catalogsConfig === null) safeUpdates.catalogsConfig = updates.catalogsConfig;
  if (updates.nuvioCloud && typeof updates.nuvioCloud === "object") safeUpdates.nuvioCloud = { ...safeUpdates.nuvioCloud, ...updates.nuvioCloud };

  profiles[index] = safeUpdates;
  await saveProfiles(profiles);
  return safeUpdates;
}

export async function deleteProfile(id) {
  const cleanId = String(id).toLowerCase().trim();
  if (cleanId === "default") throw new Error("Cannot delete the default profile");

  const profiles = await loadProfiles();
  const filtered = profiles.filter((p) => p.id !== cleanId);
  if (filtered.length === profiles.length) throw new Error(`Profile ${id} not found`);

  await saveProfiles(filtered);
  return true;
}
