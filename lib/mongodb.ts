import dns from "node:dns";
import { MongoClient, Db, type MongoClientOptions } from "mongodb";

// Prefer IPv4 for mongodb+srv on Windows — dual-stack / IPv6 paths sometimes fail TLS to Atlas.
// Set MONGODB_DNS_IPV4FIRST=false to skip (e.g. if you must prefer IPv6).
if (
  typeof dns.setDefaultResultOrder === "function" &&
  process.env.MONGODB_DNS_IPV4FIRST !== "false" &&
  (process.platform === "win32" || process.env.MONGODB_DNS_IPV4FIRST === "true")
) {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* ignore */
  }
}

/**
 * Builds driver options. TLS failures (e.g. `MongoServerSelectionError` / OpenSSL
 * `tlsv1 alert internal error`) are usually environment-specific: Atlas IP access list,
 * VPN/proxy MITM, or Node/OpenSSL vs cluster TLS settings — not application query code.
 *
 * If you hit TLS handshake errors **only in local dev**, you may set (temporary workaround):
 *   MONGODB_TLS_ALLOW_INVALID_CERTS=true
 * in `.env.local` (honoured **only** when `NODE_ENV === "development"`). Prefer fixing Atlas
 * network access, VPN/proxy, or using an LTS Node build. Never enable cert skipping in production.
 */
function buildMongoClientOptions(): MongoClientOptions {
  const opts: MongoClientOptions = {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
    socketTimeoutMS: 120_000,
  };

  if (
    process.env.NODE_ENV === "development" &&
    process.env.MONGODB_TLS_ALLOW_INVALID_CERTS === "true"
  ) {
    Object.assign(opts, { tlsAllowInvalidCertificates: true });
  }

  return opts;
}

function encodeMongoCredentialComponent(value: string): string {
  let out = "";

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const h1 = value[i + 1];
    const h2 = value[i + 2];

    // Preserve existing percent-encoded octets as-is.
    if (ch === "%" && /[0-9a-fA-F]/.test(h1 ?? "") && /[0-9a-fA-F]/.test(h2 ?? "")) {
      out += `%${h1}${h2}`;
      i += 2;
      continue;
    }

    // RFC 3986 unreserved chars for URI userinfo.
    if (/[A-Za-z0-9\-._~]/.test(ch)) {
      out += ch;
      continue;
    }

    out += encodeURIComponent(ch);
  }

  return out;
}

function sanitizeMongoUriInput(uri: string): string {
  const trimmed = uri.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

/**
 * Atlas URIs copied from dashboards often include raw special characters in credentials.
 * MongoDB's parser requires these to be percent-encoded.
 */
export function normalizeMongoUriCredentials(uri: string): string {
  const sanitizedUri = sanitizeMongoUriInput(uri);
  const match = sanitizedUri.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/i);
  if (!match) return sanitizedUri;

  const prefix = match[1];
  const rest = match[2];

  const atIndex = rest.lastIndexOf("@");
  if (atIndex <= 0) return sanitizedUri;

  const credentials = rest.slice(0, atIndex);
  const hostAndSuffix = rest.slice(atIndex + 1);
  const hostEnd = hostAndSuffix.search(/[/?#]/);
  const host = hostEnd === -1 ? hostAndSuffix : hostAndSuffix.slice(0, hostEnd);
  const suffix = hostEnd === -1 ? "" : hostAndSuffix.slice(hostEnd);
  if (!host) return sanitizedUri;

  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex < 0) return sanitizedUri;

  const rawUser = credentials.slice(0, separatorIndex);
  const rawPassword = credentials.slice(separatorIndex + 1);

  const encodedUser = encodeMongoCredentialComponent(rawUser);
  const encodedPassword = encodeMongoCredentialComponent(rawPassword);

  if (encodedUser === rawUser && encodedPassword === rawPassword) {
    return sanitizedUri;
  }

  return `${prefix}${encodedUser}:${encodedPassword}@${host}${suffix}`;
}

export function deriveMongoUriCandidates(uri: string): {
  primary: string;
} {
  const sanitized = sanitizeMongoUriInput(uri);
  const normalized = normalizeMongoUriCredentials(sanitized);
  return { primary: normalized };
}

function getUriCandidates(): { primary: string } {
  const rawUri = process.env.MONGODB_URI;
  const uri =
    typeof rawUri === "string" ? sanitizeMongoUriInput(rawUri) : rawUri;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local locally or to your Vercel project environment variables."
    );
  }
  return deriveMongoUriCandidates(uri);
}

function resetMongoCachesOnFailure() {
  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    globalWithMongo._mongoClientPromise = undefined;
  }
  if (cachedPromise) {
    cachedPromise = undefined;
  }
}

function isMongoSrvDnsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /querySrv .*ECONNREFUSED|ECONNREFUSED .*_mongodb\._tcp\./i.test(msg);
}

function withPublicDnsResolver<T>(fn: () => Promise<T>): Promise<T> {
  const previous = dns.getServers();
  try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
  } catch {
    return fn();
  }
  return fn().finally(() => {
    try {
      dns.setServers(previous);
    } catch {
      /* ignore */
    }
  });
}

function logMongoConnectError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/tls|ssl|TLS|SSL|MongoServerSelectionError/i.test(msg)) {
    console.error(
      "[mongodb] Connection failed (TLS/network). Check Atlas Network Access, VPN, and MONGODB_URI. " +
        "For a local-only workaround see MONGODB_TLS_ALLOW_INVALID_CERTS in lib/mongodb.ts.",
    );
  }
  if (isMongoAuthError(err)) {
    console.error(
      "[mongodb] Authentication failed. Verify MongoDB username/password and auth source in MONGODB_URI.",
    );
  }
}

function connectMongo(
  primaryUri: string,
  options: MongoClientOptions,
): Promise<MongoClient> {
  return new MongoClient(primaryUri, options)
    .connect()
    .catch((err: unknown) => {
      if (isMongoSrvDnsError(err)) {
        console.warn(
          "[mongodb] SRV DNS lookup failed (querySrv ECONNREFUSED). Retrying with public DNS resolvers.",
        );
        return withPublicDnsResolver(() =>
          new MongoClient(primaryUri, options).connect(),
        );
      }
      throw err;
    })
    .catch((err: unknown) => {
      resetMongoCachesOnFailure();
      logMongoConnectError(err);
      throw err;
    });
}

function createClientPromise(): Promise<MongoClient> {
  const { primary } = getUriCandidates();
  const options = buildMongoClientOptions();

  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = connectMongo(primary, options);
    }
    return globalWithMongo._mongoClientPromise;
  }

  return connectMongo(primary, options);
}

let cachedPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!cachedPromise) {
    cachedPromise = createClientPromise();
  }
  return cachedPromise;
}

/** Resolves only when awaited; avoids throwing during Next.js build when env is unset. */
const clientPromise = {
  then<TResult1 = MongoClient, TResult2 = never>(
    onfulfilled?:
      | ((value: MongoClient) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ) {
    return getClientPromise().then(onfulfilled, onrejected);
  },
  catch<TResult = never>(
    onrejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ) {
    return getClientPromise().catch(onrejected);
  },
  finally(onfinally?: (() => void) | null | undefined) {
    return getClientPromise().finally(onfinally);
  },
  [Symbol.toStringTag]: "Promise",
} as Promise<MongoClient>;

export default clientPromise;

/** Same default as seed scripts (`DB_NAME` in `.env.local`). Must match where users/clubs are written. */
export function getDatabaseName(): string {
  return process.env.DB_NAME?.trim() || "hockey-app";
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(getDatabaseName());
}

/** True when the DB is unreachable (TLS, network, Atlas selection) — safe to degrade UI. */
export function isMongoConnectionError(e: unknown): boolean {
  const name =
    e && typeof e === "object" && "name" in e
      ? String((e as { name?: unknown }).name)
      : "";
  const msg = e instanceof Error ? e.message : String(e);
  const code =
    e && typeof e === "object" && "code" in e
      ? String((e as { code?: unknown }).code)
      : "";
  const syscall =
    e && typeof e === "object" && "syscall" in e
      ? String((e as { syscall?: unknown }).syscall)
      : "";
  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoTimeoutError" ||
    (code === "ECONNREFUSED" && syscall === "querySrv") ||
    /MongoServerSelectionError|MongoNetworkError|tlsv1 alert|SSL alert|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|querySrv/i.test(
      msg,
    )
  );
}

/** True when MongoDB rejects credentials (e.g. Atlas code 8000: bad auth). */
export function isMongoAuthError(e: unknown): boolean {
  const name =
    e && typeof e === "object" && "name" in e
      ? String((e as { name?: unknown }).name)
      : "";
  const msg = e instanceof Error ? e.message : String(e);
  const codeName =
    e && typeof e === "object" && "codeName" in e
      ? String((e as { codeName?: unknown }).codeName)
      : "";
  const code =
    e && typeof e === "object" && "code" in e
      ? Number((e as { code?: unknown }).code)
      : NaN;
  const errorResponseCode =
    e &&
    typeof e === "object" &&
    "errorResponse" in e &&
    (e as { errorResponse?: unknown }).errorResponse &&
    typeof (e as { errorResponse?: unknown }).errorResponse === "object" &&
    "code" in ((e as { errorResponse?: Record<string, unknown> }).errorResponse ?? {})
      ? Number(
          (
            (e as { errorResponse?: Record<string, unknown> }).errorResponse as Record<
              string,
              unknown
            >
          ).code,
        )
      : NaN;

  return (
    (name === "MongoServerError" || codeName === "AtlasError" || code === 8000 || errorResponseCode === 8000) &&
    (code === 8000 ||
      errorResponseCode === 8000 ||
      codeName === "AtlasError" ||
      /bad auth|authentication failed|auth failed/i.test(msg))
  );
}
