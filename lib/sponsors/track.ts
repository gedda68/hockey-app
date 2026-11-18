// lib/sponsors/track.ts — keeping automated visits out of sponsor numbers. Pure.

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python-requests|facebookexternalhit|embedly|whatsapp|bingpreview/i;
export const isAutomated = (userAgent: string | null | undefined) => !userAgent || BOT.test(userAgent);
export const cleanSource = (v: unknown): "site" | "portal" => (v === "portal" ? "portal" : "site");
