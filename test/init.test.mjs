import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

test("initializer creates a private configuration and refuses to overwrite it", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "nuvio-companion-init-"));
  const config = path.join(directory, "companion.env");
  const env = { ...process.env, COMPANION_CONFIG: config };

  await run(process.execPath, ["scripts/init.mjs"], { env, cwd: process.cwd() });
  const text = await readFile(config, "utf8");
  const values = Object.fromEntries(text.trim().split("\n").map((line) => line.split(/=(.*)/s).slice(0, 2)));

  assert.match(values.COMPANION_KEY, /^[0-9a-f]{64}$/);
  assert.match(values.PLUGIN_SETUP_KEY, /^[0-9a-f]{64}$/);
  assert.notEqual(values.COMPANION_KEY, values.PLUGIN_SETUP_KEY);
  assert.equal(values.HOST, "127.0.0.1");
  assert.equal((await stat(config)).mode & 0o777, 0o600);
  await assert.rejects(run(process.execPath, ["scripts/init.mjs"], { env, cwd: process.cwd() }));
});
