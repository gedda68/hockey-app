import { MongoClient, Db } from "mongodb";

const options = {};

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local locally or to your Vercel project environment variables."
    );
  }
  return uri;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = getUri();

  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  }

  const client = new MongoClient(uri, options);
  return client.connect();
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
