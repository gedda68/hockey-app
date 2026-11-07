/**
 * scripts/load-env.cjs
 *
 * Side-effect import for CLI scripts. Loads .env.local, then .env, into
 * process.env (variables already set in the shell or by an earlier file are
 * not overwritten, so .env.local wins), then exits if MONGODB_URI is missing.
 *
 * Never hardcode a connection string in a script: this repo is public.
 *
 *   TypeScript (tsx):  import "./load-env";
 *   CommonJS (node):   require("./load-env.cjs");
 */
const path = require("node:path");

const root = path.resolve(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(root, file));
  } catch {
    /* file not present */
  }
}

if (!process.env.MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}
