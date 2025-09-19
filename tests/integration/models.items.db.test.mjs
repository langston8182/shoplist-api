import {jest} from "@jest/globals";
import {MongoMemoryServer} from "mongodb-memory-server";

let mongod;
let model;
let getDb;   // pour récupérer la connexion et la fermer
const OLD_ENV = {...process.env};

function setEnv(key, value) {
    if (value === undefined || value === null) return;
    process.env[key] = String(value);
}

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Force the app to use the in‑memory Mongo instead of real AppConfig/Secrets
    await jest.unstable_mockModule("../../src/utils/config.appconfig.mjs", () => ({
        getConfigValue: async (profileName, key) => {
            if (profileName === "mongodb") {
                // db.mjs asks for `${ENV}.MONGO_URI` → always return our in‑memory URI
                return uri;
            }
            return undefined;
        }
    }));

    // Provide a DB name for tests (used by db.mjs)
    setEnv("DB_NAME", "testdb");

    setEnv("ENVIRONMENT", "preprod");
    setEnv("APP_NAME", "shoplist");

    jest.resetModules();

    model = await import("../../src/models/items.model.mjs");
    ({ getDb } = await import("../../src/utils/db.mjs"));

    // Ensure clean DB state before starting tests
    const db = await getDb();
    await db.dropDatabase();
});

beforeEach(async () => {
    const db = await getDb();
    await db.dropDatabase();
});

afterAll(async () => {
    // Restore env
    for (const k of Object.keys(process.env)) {
        if (!(k in OLD_ENV)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(OLD_ENV)) {
        process.env[k] = v;
    }

    try {
        const { closeDb } = await import("../../src/utils/db.mjs");
        await closeDb();
    } catch (e) {
        console.error("Error closing DB", e);
    }

    if (mongod) {
        await mongod.stop();
    }
});

test("insert/find/update/delete item (modèle)", async () => {
    const createdAt = new Date().toISOString();
    const doc = await model.insertItem({
        name: "Lait",
        quantity: 2,
        unit: "bouteilles",
        createdAt,
        updatedAt: createdAt
    });
    expect(doc._id).toBeDefined();

    const all = await model.findItems();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe("Lait");

    const updated = await model.updateItem(String(doc._id), {quantity: 3, updatedAt: new Date().toISOString()});
    const allAfterUpdate = await model.findItems();
    expect(allAfterUpdate[0].quantity).toBe(3);

    await model.deleteItem(String(doc._id));
    const after = await model.findItems();
    expect(after.length).toBe(0);
});