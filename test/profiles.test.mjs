import test from "node:test";
import assert from "node:assert/strict";
import {
  loadProfiles,
  getProfiles,
  getProfileById,
  getProfileByCompanionKey,
  getProfileByPluginKey,
  createProfile,
  updateProfile,
  deleteProfile,
  saveProfiles
} from "../src/profiles.mjs";

test("loadProfiles returns default profile and initializes storage", async () => {
  const profiles = await loadProfiles();
  assert.ok(Array.isArray(profiles));
  assert.ok(profiles.length >= 1);
  const defaultProfile = profiles.find((p) => p.id === "default");
  assert.ok(defaultProfile);
  assert.equal(defaultProfile.name, "Default Profile");
  assert.ok(defaultProfile.companionKey);
  assert.ok(defaultProfile.pluginSetupKey);
  assert.ok(defaultProfile.browserProfileDir);
});

test("createProfile adds an isolated profile with unique keys and directories", async () => {
  const kidsProfile = await createProfile({ name: "Kids Room", userTimezone: "America/Chicago" });
  assert.ok(kidsProfile);
  assert.equal(kidsProfile.name, "Kids Room");
  assert.equal(kidsProfile.id, "kids-room");
  assert.equal(kidsProfile.userTimezone, "America/Chicago");
  assert.ok(kidsProfile.companionKey.startsWith("mbp_"));
  assert.ok(kidsProfile.pluginSetupKey.startsWith("nuvio_"));
  assert.ok(kidsProfile.browserProfileDir.includes("movieboxpro-profile-kids-room"));

  const foundById = await getProfileById("kids-room");
  assert.equal(foundById.id, "kids-room");

  const foundByCompKey = await getProfileByCompanionKey(kidsProfile.companionKey);
  assert.equal(foundByCompKey.id, "kids-room");

  const foundByPlugKey = await getProfileByPluginKey(kidsProfile.pluginSetupKey);
  assert.equal(foundByPlugKey.id, "kids-room");
});

test("updateProfile modifies profile settings and seeds", async () => {
  const updated = await updateProfile("kids-room", {
    name: "Kids Playroom",
    recommendationSeeds: [{ id: 101, name: "Bluey" }],
    userTimezone: "America/Los_Angeles"
  });

  assert.equal(updated.name, "Kids Playroom");
  assert.equal(updated.userTimezone, "America/Los_Angeles");
  assert.equal(updated.recommendationSeeds.length, 1);
  assert.equal(updated.recommendationSeeds[0].name, "Bluey");
});

test("deleteProfile removes secondary profile and prevents deleting default", async () => {
  await assert.rejects(async () => {
    await deleteProfile("default");
  }, /Cannot delete the default profile/);

  const deleted = await deleteProfile("kids-room");
  assert.equal(deleted, true);

  const lookup = await getProfileById("kids-room");
  assert.equal(lookup, null);
});

test("backup and restore profiles data", async () => {
  const currentProfiles = await getProfiles();
  const testBackup = [
    {
      id: "default",
      name: "Default Profile",
      companionKey: "mbp_test123",
      pluginSetupKey: "nuvio_test123",
      browserProfileDir: "work/movieboxpro-profile",
      recommendationSeeds: [{ id: 95396, name: "Severance" }],
      movieRecommendationSeeds: [],
      createdAt: new Date().toISOString()
    },
    {
      id: "guest",
      name: "Guest Room",
      companionKey: "mbp_guest456",
      pluginSetupKey: "nuvio_guest456",
      browserProfileDir: "work/movieboxpro-profile-guest",
      recommendationSeeds: [],
      movieRecommendationSeeds: [{ id: 550, name: "Fight Club" }],
      createdAt: new Date().toISOString()
    }
  ];

  await saveProfiles(testBackup);
  const restored = await getProfiles();
  assert.equal(restored.length, 2);
  assert.equal(restored[1].id, "guest");
  assert.equal(restored[1].name, "Guest Room");

  // Restore original
  await saveProfiles(currentProfiles);
});
