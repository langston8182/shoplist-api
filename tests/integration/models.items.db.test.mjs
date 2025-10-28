import {jest} from "@jest/globals";
import {MongoMemoryServer} from "mongodb-memory-server";

let mongod;
let listsModel, itemsModel;
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
  itemsModel = await import("../../src/models/items.model.mjs");
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

test("add/list/patch/delete items (model)", async () => {
  const list = await listsModel.createList({ name: "Courses" });
  const listId = String(list._id);

  const item = await itemsModel.addItemToList(listId, { name: "Pâtes", quantity: 2 });
  expect(item._id).toBeDefined();

  const items = await itemsModel.listItemsByListId(listId);
  expect(items.length).toBe(1);

  const patched = await itemsModel.patchItem(listId, String(item._id), { quantity: 3 });
  expect(patched.quantity).toBe(3);

  const deleted = await itemsModel.removeItem(listId, String(item._id));

  const after = await itemsModel.listItemsByListId(listId);
  expect(after.length).toBe(0);
});
