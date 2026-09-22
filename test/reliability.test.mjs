import assert from "node:assert/strict";
import test from "node:test";
import { serializeBrowserWork } from "../src/browser-work.mjs";
import { classifyError, summarizeHealth, withRetry } from "../src/reliability.mjs";

test("browser work queue does not pass the previous result to the next task", async () => {
  const session = { browserWorkQueue: Promise.resolve() };
  await serializeBrowserWork(() => ({ authenticated: true }), session);

  let received;
  const result = await serializeBrowserWork((...args) => {
    received = args;
    return "next";
  }, session);

  assert.equal(result, "next");
  assert.deepEqual(received, []);
});

test("browser work queue continues after a failed task", async () => {
  const session = { browserWorkQueue: Promise.resolve() };
  await assert.rejects(serializeBrowserWork(() => Promise.reject(new Error("first task failed")), session));
  assert.equal(await serializeBrowserWork(() => "recovered", session), "recovered");
});

test("withRetry retries transient failures and returns the eventual result", async () => {
  let attempts = 0;
  const result = await withRetry(() => {
    attempts++;
    if (attempts < 3) throw new Error("fetch failed");
    return "ok";
  }, { retries: 2, delayMs: 0 });

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("error classification provides a recovery action", () => {
  assert.equal(classifyError(new Error("MovieBoxPro login required")).code, "login_required");
  assert.equal(classifyError(new Error("fetch failed")).retryable, true);
  assert.match(classifyError(new Error("TMDb API key rejected (401)")).action, /API key/);
});

test("health summary prioritizes errors, then warnings", () => {
  assert.equal(summarizeHealth({ moviebox: { state: "healthy" }, tmdb: { state: "warning" } }).status, "warning");
  assert.equal(summarizeHealth({ moviebox: { state: "error" }, tmdb: { state: "healthy" } }).status, "error");
  assert.equal(summarizeHealth({ moviebox: { state: "healthy" }, tmdb: { state: "healthy" } }).status, "healthy");
});
