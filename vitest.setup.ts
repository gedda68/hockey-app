import "@testing-library/jest-dom";

// ── Test environment variables ────────────────────────────────────────────────
// These are set here (before any module is imported by a test file) so that
// modules which throw on missing env vars at load time (e.g. lib/auth/session.ts
// checking JWT_SECRET) don't blow up in the test environment.
process.env.JWT_SECRET    ??= "test-jwt-secret-at-least-32-chars-long!!";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-chars!!";
process.env.DB_NAME        ??= "hockey-app-test";
process.env.NEXTAUTH_URL   ??= "http://localhost:3000";
