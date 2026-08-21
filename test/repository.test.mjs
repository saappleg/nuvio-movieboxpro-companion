import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { matchPrivateRepositoryPath, privateRepositoryUrl, repositoryManifest } from "../src/repository.mjs";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const APP_VERSION = String(packageMetadata.version);

test("builds an Android TV-safe private repository URL", () => {
  const url = privateRepositoryUrl("http://192.0.2.10:43110", "private key");
  assert.equal(url, "http://192.0.2.10:43110/repository/private%20key/manifest.json");
  assert.deepEqual(matchPrivateRepositoryPath(new URL(url).pathname), {
    key: "private key",
    resource: "manifest.json"
  });
});

test("uses a relative provider filename for path-authenticated repositories matching package version", () => {
  const manifest = repositoryManifest(APP_VERSION, "private-key");
  assert.equal(manifest.version, APP_VERSION);
  assert.equal(manifest.scrapers[0].version, APP_VERSION);
  assert.equal(manifest.scrapers[0].filename, "providers/movieboxpro-local.js");
  assert.deepEqual(manifest.scrapers[0].disabledPlatforms, []);
  assert.deepEqual(matchPrivateRepositoryPath("/repository/private-key/providers/movieboxpro-local.js"), {
    key: "private-key",
    resource: "providers/movieboxpro-local.js"
  });
});

test("keeps legacy query-authenticated manifests compatible", () => {
  const manifest = repositoryManifest(APP_VERSION, "private-key", false);
  assert.equal(manifest.scrapers[0].filename, "providers/movieboxpro-local.js?key=private-key");
});
