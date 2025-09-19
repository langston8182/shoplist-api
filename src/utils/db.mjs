import {MongoClient} from "mongodb";
import {getConfigValue} from "./config.appconfig.mjs";

const ENV = process.env.ENVIRONMENT || "preprod";
const DB_NAME = process.env.DB_NAME;

// Simple in-memory cache for the Lambda runtime
const cache = {
    client: null,
    db: null,
    uri: null,
    uriPromise: null,
    dbName: null,
    dbNamePromise: null,
};

async function getUri() {
    if (cache.uri) return cache.uri;
    if (!cache.uriPromise) {
        cache.uriPromise = (async () => {
            const keyMongo = `${ENV}.MONGO_URI`;
            let u = await getConfigValue("mongodb", keyMongo);
            if (!u) throw new Error(`Missing MongoDB URI in AppConfig profile 'mongodb' for env '${ENV}' (keys tried: ${keyMongo})`);
            return u;
        })();
    }
    cache.uri = await cache.uriPromise;
    return cache.uri;
}

async function getDbName() {
    if (cache.dbName) return cache.dbName;
    if (!cache.dbNamePromise) {
        cache.dbNamePromise = (async () => {
            // 1. priorité à la variable d’env DB_NAME
            if (process.env.DB_NAME) return process.env.DB_NAME;

            // 2. sinon, on va chercher dans AppConfig
            const keyName = `${ENV}.DB_NAME`;
            let name = await getConfigValue("mongodb", keyName);
            if (!name) throw new Error(`Missing DB_NAME in AppConfig profile 'mongodb' for env '${ENV}' (key tried: ${keyName})`);
            return name;
        })();
    }
    cache.dbName = await cache.dbNamePromise;
    return cache.dbName;
}

export async function getDb() {
    if (cache.db) return cache.db;
    const uri = await getUri();
    const client = new MongoClient(uri, {maxPoolSize: 5});
    await client.connect();
    cache.client = client;
    const dbName = await getDbName();
    cache.db = client.db(dbName);
    console.log("Connected DB:", dbName);
    return cache.db;
}

export async function getClient() {
    if (cache.client) return cache.client;
    await getDb();
    return cache.client;
}

export async function closeDb() {
    if (cache.client) {
        await cache.client.close();
        cache.client = null;
        cache.db = null;
        cache.uri = null;
        cache.uriPromise = null;
        cache.dbName = null;
        cache.dbNamePromise = null;
    }
}