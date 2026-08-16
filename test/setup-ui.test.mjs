import test from "node:test";
import assert from "node:assert/strict";
import { setupPage } from "../src/setup-ui.mjs";

test("renders the guided setup dashboard without embedded secrets", () => {
  const html = setupPage();
  assert.match(html, /MovieBoxPro Companion/);
  assert.match(html, /Open login window/);
  assert.match(html, /Reveal installation URL/);
  assert.match(html, /Temporary TV calendar catalogs/);
  assert.match(html, /api\/setup\/catalog-url/);
  assert.match(html, /document\.execCommand\('copy'\)/);
  assert.match(html, /textarea id="pluginUrl"/);
  assert.match(html, /Lock dashboard/);
  assert.doesNotMatch(html, /COMPANION_KEY=/);
  assert.doesNotMatch(html, /PLUGIN_SETUP_KEY=/);
  assert.doesNotMatch(html, /TMDB_API_KEY=/);
});
