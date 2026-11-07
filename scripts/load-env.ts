/**
 * scripts/load-env.ts
 *
 * Side-effect import for CLI scripts: loads .env.local, then .env, into
 * process.env. Variables already set (in the shell or by an earlier file)
 * are not overwritten, so .env.local wins over .env.
 *
 *   import "./load-env";
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file not present */
  }
}
