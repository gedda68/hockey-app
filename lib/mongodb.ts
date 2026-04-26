import dns from "node:dns";
import { MongoClient, Db, type MongoClientOptions } from "mongodb";

// Force Node.js to use a public DNS resolver
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '1.1.1.1'])

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
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

/**
 * Atlas URIs copied from dashboards often include raw special characters in credentials.
 * MongoDB's parser requires these to be percent-encoded.
 */
export function normalizeMongoUriCredentials(uri: string): string {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/i);
  if (!match) return uri;

  const prefix = match[1];
  const rest = match[2];

  const atIndex = rest.lastIndexOf("@");
  if (atIndex <= 0) return uri;

  const credentials = rest.slice(0, atIndex);
  const hostAndSuffix = rest.slice(atIndex + 1);
  const hostEnd = hostAndSuffix.search(/[/?#]/);
  const host = hostEnd === -1 ? hostAndSuffix : hostAndSuffix.slice(0, hostEnd);
  const suffix = hostEnd === -1 ? "" : hostAndSuffix.slice(hostEnd);
  if (!host) return uri;

  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex < 0) return uri;

  const rawUser = credentials.slice(0, separatorIndex);
  const rawPassword = credentials.slice(separatorIndex + 1);

  const encodedUser = encodeMongoCredentialComponent(rawUser);
  const encodedPassword = encodeMongoCredentialComponent(rawPassword);

  if (encodedUser === rawUser && encodedPassword === rawPassword) {
    return uri;
  }

  return `${prefix}${encodedUser}:${encodedPassword}@${host}${suffix}`;
}

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local locally or to your Vercel project environment variables."
    );
  }
  return normalizeMongoUriCredentials(uri);
}

function connectMongo(uri: string, options: MongoClientOptions): Promise<MongoClient> {
  return new MongoClient(uri, options).connect().catch((err: unknown) => {
    if (process.env.NODE_ENV === "development") {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };
      globalWithMongo._mongoClientPromise = undefined;
    }
    if (cachedPromise) {
      cachedPromise = undefined;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/tls|ssl|TLS|SSL|MongoServerSelectionError/i.test(msg)) {
      console.error(
        "[mongodb] Connection failed (TLS/network). Check Atlas Network Access, VPN, and MONGODB_URI. " +
          "For a local-only workaround see MONGODB_TLS_ALLOW_INVALID_CERTS in lib/mongodb.ts.",
      );
    }
    throw err;
  });
}

function createClientPromise(): Promise<MongoClient> {
  const uri = getUri();
  const options = buildMongoClientOptions();

  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = connectMongo(uri, options);
    }
    return globalWithMongo._mongoClientPromise;
  }

  return connectMongo(uri, options);
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
  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoTimeoutError" ||
    /MongoServerSelectionError|MongoNetworkError|tlsv1 alert|SSL alert|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(
      msg,
    )
  );
}
