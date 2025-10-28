import {jest} from "@jest/globals";
import {MongoMemoryServer} from "mongodb-memory-server";

let mongod;
let listsModel;
let getDb;
const OLD_ENV = {...process.env};

function setEnv(key, value) { if (value !== undefined && value !== null) process.env[key] = String(value); }

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await jest.unstable_mockModule("../../src/utils/config.appconfig.mjs", () => ({
    getConfigValue: async () => uri
  }));

  setEnv("DB_NAME", "testdb");
  setEnv("ENVIRONMENT", "preprod");

  jest.resetModules();

  listsModel = await import("../../src/models/lists.model.mjs");
  ({ getDb } = await import("../../src/utils/db.mjs"));

  const db = await getDb();
  await db.dropDatabase();
});

beforeEach(async () => {
  const db = await getDb();
  await db.dropDatabase();
});

afterAll(async () => {
  for (const k of Object.keys(process.env)) if (!(k in OLD_ENV)) delete process.env[k];
  for (const [k, v] of Object.entries(OLD_ENV)) process.env[k] = v;
  try { const { closeDb } = await import("../../src/utils/db.mjs"); await closeDb(); } catch {}
  if (mongod) await mongod.stop();
});

test("create/list/get lists (model)", async () => {
  const created = await listsModel.createList({ name: "Courses Leclerc" });
  expect(created._id).toBeDefined();
  const all = await listsModel.listLists();
  expect(all.length).toBe(1);
  const one = await listsModel.getListById(String(created._id));
  expect(one.name).toBe("Courses Leclerc");
  await listsModel.updateListTimestamp(String(created._id));
  const updated = await listsModel.getListById(String(created._id));
  expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(created.updatedAt).getTime());
});

test("delete list (model)", async () => {
  const created = await listsModel.createList({ name: "Liste à supprimer" });
  expect(created._id).toBeDefined();
  
  const allBefore = await listsModel.listLists();
  expect(allBefore.length).toBe(1);
  
  const deleted = await listsModel.deleteList(String(created._id));
  expect(deleted).toBe(true);
  
  const allAfter = await listsModel.listLists();
  expect(allAfter.length).toBe(0);
  
  const notFound = await listsModel.getListById(String(created._id));
  expect(notFound).toBe(null);
});

test("delete non-existent list returns false", async () => {
  const deleted = await listsModel.deleteList("507f1f77bcf86cd799439011");
  expect(deleted).toBe(false);
});
