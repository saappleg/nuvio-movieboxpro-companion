import { readFile } from "node:fs/promises";
import path from "node:path";

const configFile = path.resolve(process.env.COMPANION_CONFIG || ".env");
const text = await readFile(configFile, "utf8");
const env = Object.fromEntries(text.split(/\r?\n/).map((line) => {
  const index = line.indexOf("=");
  return index < 0 ? ["", ""] : [line.slice(0, index), line.slice(index + 1)];
}).filter(([key]) => key));

if (!env.COMPANION_KEY) throw new Error(`COMPANION_KEY is missing from ${configFile}`);
const base = (env.COMPANION_PUBLIC_URL || `http://${env.HOST || "127.0.0.1"}:${env.PORT || "43110"}`).replace(/\/$/, "");
console.log(`${base}/setup?key=${encodeURIComponent(env.COMPANION_KEY)}`);
