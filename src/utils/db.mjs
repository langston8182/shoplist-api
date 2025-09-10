import { MongoClient } from "mongodb";

const env = process.env.ENVIRONMENT || "preprod";
const uri = env === "prod" ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI_PREPROD;
const dbName = process.env.DB_NAME;

if (!uri) {
    throw new Error("Missing env MONGODB_URI");
}

let cached = globalThis.__finoraDb__;
if (!cached) {
    cached = { client: null, db: null };
    globalThis.__finoraDb__ = cached;
}

export async function getDb() {
    if (cached.db) return cached.db;
    const client = new MongoClient(uri, { maxPoolSize: 5 });
    await client.connect();
    cached.client = client;
    cached.db = client.db(dbName);
    return cached.db;
}