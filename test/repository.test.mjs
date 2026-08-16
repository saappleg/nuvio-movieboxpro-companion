import test from "node:test";
import assert from "node:assert/strict";
import { matchPrivateRepositoryPath, privateRepositoryUrl, repositoryManifest } from "../src/repository.mjs";

test("builds an Android TV-safe private repository URL", () => {
  const url = privateRepositoryUrl("http://192.0.2.10:43110", "private key");
  assert.equal(url, "http://192.0.2.10:43110/repository/private%20key/manifest.json");
  assert.deepEqual(matchPrivateRepositoryPath(new URL(url).pathname), {
    key: "private key",
    resource: "manifest.json"
  });
});

test("uses a relative provider filename for path-authenticated repositories", () => {
  const manifest = repositoryManifest("0.3.3", "private-key");
  assert.equal(manifest.version, "0.3.3");
  assert.equal(manifest.scrapers[0].filename, "providers/movieboxpro-local.js");
  assert.deepEqual(manifest.scrapers[0].disabledPlatforms, []);
  assert.deepEqual(matchPrivateRepositoryPath("/repository/private-key/providers/movieboxpro-local.js"), {
    key: "private-key",
    resource: "providers/movieboxpro-local.js"
  });
});

test("keeps legacy query-authenticated manifests compatible", () => {
  const manifest = repositoryManifest("0.3.3", "private-key", false);
  assert.equal(manifest.scrapers[0].filename, "providers/movieboxpro-local.js?key=private-key");
});
