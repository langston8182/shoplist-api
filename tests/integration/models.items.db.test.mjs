import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod;
let model; // will be dynamically imported after env is set
const OLD_ENV = { ...process.env };

function setEnv(key, value) {
  if (value === undefined || value === null) return;
  process.env[key] = String(value);
}

beforeAll(async () => {
  // Start in-memory MongoDB and set env **before** importing any app modules
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Do NOT reassign process.env; set keys individually
  setEnv("ENVIRONMENT", "preprod");
  setEnv("MONGODB_URI_PREPROD", uri);
  setEnv("DB_NAME", "testdb");

  // Ensure modules read the fresh env
  jest.resetModules();

  // Dynamic import AFTER env is ready
  model = await import("../../src/models/items.model.mjs");

  // If your model connects lazily via a getDb(), you can optionally force init here:
  // const { getDb } = await import("../../src/utils/db.mjs");
  // await getDb();
});

afterAll(async () => {
  // Restore the original env
  for (const k of Object.keys(process.env)) {
    if (!(k in OLD_ENV)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(OLD_ENV)) {
    process.env[k] = v;
  }

  if (mongod) await mongod.stop();
});

test("insert/find/update/delete item (modèle)", async () => {
  // insert
  const createdAt = new Date().toISOString();
  const doc = await model.insertItem({ name: "Lait", quantity: 2, unit: "bouteilles", createdAt, updatedAt: createdAt });
  expect(doc._id).toBeDefined();

  // find
  const all = await model.findItems();
  expect(all.length).toBe(1);
  expect(all[0].name).toBe("Lait");

  // update
  const updated = await model.updateItem(String(doc._id), { quantity: 3, updatedAt: new Date().toISOString() });
    const allAfterUpdate = await model.findItems();
    expect(allAfterUpdate.length).toBe(1);
    expect(allAfterUpdate[0].quantity).toBe(3);

  // delete
  await model.deleteItem(String(doc._id));
  const after = await model.findItems();
  expect(after.length).toBe(0);
});