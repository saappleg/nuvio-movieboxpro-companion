import { randomBytes } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const configFile = path.resolve(process.env.COMPANION_CONFIG || ".env");

try {
  await access(configFile, constants.F_OK);
  console.error(`Configuration already exists at ${configFile}. It was not changed.`);
  process.exit(1);
} catch {}

function detectedLanAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal &&
          (/^192\.168\./.test(address.address) || /^10\./.test(address.address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address.address))) {
        return address.address;
      }
    }
  }
  return null;
}

const host = args.has("--lan") ? detectedLanAddress() : "127.0.0.1";
if (!host) {
  console.error("No private LAN address was detected. Run without --lan and edit HOST later.");
  process.exit(1);
}

const port = 43110;
const values = {
  COMPANION_KEY: randomBytes(32).toString("hex"),
  PLUGIN_SETUP_KEY: randomBytes(32).toString("hex"),
  HOST: host,
  PORT: String(port),
  STREAM_TIMEOUT_MS: "45000",
  TMDB_API_KEY: "",
  MOVIEBOXPRO_PROFILE: "work/movieboxpro-profile",
  COMPANION_PUBLIC_URL: `http://${host}:${port}`
};

await writeFile(configFile, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", {
  mode: 0o600,
  flag: "wx"
});

console.log(`Created private configuration at ${configFile}`);
console.log(`Start with: npm start`);
console.log(`Then run: npm run setup-url`);
