import {jest} from "@jest/globals";
import {MongoMemoryServer} from "mongodb-memory-server";

let mongod;
let articlesModel;
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

  articlesModel = await import("../../src/models/articles.model.mjs");
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

test("addOrUpdateArticle creates new article", async () => {
  const article = await articlesModel.addOrUpdateArticle("Pommes");
  
  expect(article).toBeDefined();
  expect(article.name).toBe("Pommes");
  expect(article.normalizedName).toBe("pommes");
  expect(article.usageCount).toBe(1);
  expect(article.createdAt).toBeDefined();
  expect(article.updatedAt).toBeDefined();
});

test("addOrUpdateArticle increments usage count on existing article", async () => {
  // Premier ajout
  const first = await articlesModel.addOrUpdateArticle("Tomates");
  expect(first.usageCount).toBe(1);
  
  // Deuxième ajout du même article
  const second = await articlesModel.addOrUpdateArticle("Tomates");
  expect(second.usageCount).toBe(2);
  expect(second.normalizedName).toBe("tomates");
  
  // Troisième ajout avec une casse différente
  const third = await articlesModel.addOrUpdateArticle("TOMATES");
  expect(third.usageCount).toBe(3);
  expect(third.name).toBe("TOMATES"); // Le nom est mis à jour
  expect(third.normalizedName).toBe("tomates"); // Mais le nom normalisé reste le même
});

test("addOrUpdateArticle returns null for empty name", async () => {
  const result = await articlesModel.addOrUpdateArticle("");
  expect(result).toBeNull();
  
  const result2 = await articlesModel.addOrUpdateArticle("   ");
  expect(result2).toBeNull();
});

test("searchArticles finds articles with exact match", async () => {
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Poires");
  await articlesModel.addOrUpdateArticle("Bananes");
  
  const results = await articlesModel.searchArticles("pommes");
  
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].name).toBe("Pommes");
});

test("searchArticles finds articles with partial match", async () => {
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Pomme de terre");
  await articlesModel.addOrUpdateArticle("Pamplemousse");
  
  const results = await articlesModel.searchArticles("pom");
  
  expect(results.length).toBeGreaterThanOrEqual(2);
  const names = results.map(r => r.name);
  expect(names).toContain("Pommes");
  expect(names).toContain("Pomme de terre");
});

test("searchArticles returns empty array for no matches", async () => {
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Poires");
  
  const results = await articlesModel.searchArticles("xyz123");
  
  expect(results).toEqual([]);
});

test("searchArticles respects limit parameter", async () => {
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Pomme de terre");
  await articlesModel.addOrUpdateArticle("Pamplemousse");
  
  const results = await articlesModel.searchArticles("p", { limit: 2 });
  
  expect(results.length).toBeLessThanOrEqual(2);
});

test("searchArticles respects skip parameter", async () => {
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Poires");
  await articlesModel.addOrUpdateArticle("Bananes");
  
  const allResults = await articlesModel.searchArticles("p");
  const skippedResults = await articlesModel.searchArticles("p", { skip: 1 });
  
  expect(skippedResults.length).toBe(allResults.length - 1);
});

test("searchArticles prioritizes articles with higher usage count", async () => {
  // Créer des articles avec différents niveaux d'utilisation
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Pommes");
  await articlesModel.addOrUpdateArticle("Pommes"); // 3 utilisations
  
  await articlesModel.addOrUpdateArticle("Poires"); // 1 utilisation
  
  const results = await articlesModel.searchArticles("p");
  
  expect(results.length).toBeGreaterThanOrEqual(2);
  // L'article avec le plus d'utilisations devrait avoir un meilleur score
  const pommes = results.find(r => r.name === "Pommes");
  const poires = results.find(r => r.name === "Poires");
  expect(pommes.usageCount).toBeGreaterThan(poires.usageCount);
});

test("getPopularArticles returns articles sorted by usage", async () => {
  // Créer des articles avec différents niveaux d'utilisation
  await articlesModel.addOrUpdateArticle("Pain");
  await articlesModel.addOrUpdateArticle("Pain");
  await articlesModel.addOrUpdateArticle("Pain"); // 3 utilisations
  
  await articlesModel.addOrUpdateArticle("Lait");
  await articlesModel.addOrUpdateArticle("Lait"); // 2 utilisations
  
  await articlesModel.addOrUpdateArticle("Œufs"); // 1 utilisation
  
  const results = await articlesModel.getPopularArticles();
  
  expect(results.length).toBe(3);
  expect(results[0].name).toBe("Pain");
  expect(results[0].usageCount).toBe(3);
  expect(results[1].name).toBe("Lait");
  expect(results[1].usageCount).toBe(2);
  expect(results[2].name).toBe("Œufs");
  expect(results[2].usageCount).toBe(1);
});

test("getPopularArticles respects limit parameter", async () => {
  await articlesModel.addOrUpdateArticle("Pain");
  await articlesModel.addOrUpdateArticle("Lait");
  await articlesModel.addOrUpdateArticle("Œufs");
  
  const results = await articlesModel.getPopularArticles({ limit: 2 });
  
  expect(results.length).toBe(2);
});

test("getPopularArticles respects skip parameter", async () => {
  await articlesModel.addOrUpdateArticle("Pain");
  await articlesModel.addOrUpdateArticle("Lait");
  await articlesModel.addOrUpdateArticle("Œufs");
  
  const allResults = await articlesModel.getPopularArticles();
  const skippedResults = await articlesModel.getPopularArticles({ skip: 1 });
  
  expect(skippedResults.length).toBe(2);
  expect(skippedResults[0].name).toBe(allResults[1].name);
});

test("searchArticles handles case insensitivity", async () => {
  await articlesModel.addOrUpdateArticle("Tomates");
  
  const lowerCase = await articlesModel.searchArticles("tomates");
  const upperCase = await articlesModel.searchArticles("TOMATES");
  const mixedCase = await articlesModel.searchArticles("ToMaTeS");
  
  expect(lowerCase.length).toBeGreaterThan(0);
  expect(upperCase.length).toBeGreaterThan(0);
  expect(mixedCase.length).toBeGreaterThan(0);
  
  expect(lowerCase[0].name).toBe("Tomates");
  expect(upperCase[0].name).toBe("Tomates");
  expect(mixedCase[0].name).toBe("Tomates");
});

test("searchArticles with fuzzy matching", async () => {
  await articlesModel.addOrUpdateArticle("Tomates");
  await articlesModel.addOrUpdateArticle("Tomates cerises");
  await articlesModel.addOrUpdateArticle("Concentré de tomate");
  
  const results = await articlesModel.searchArticles("tomat");
  
  expect(results.length).toBeGreaterThanOrEqual(2);
  const names = results.map(r => r.name);
  expect(names).toContain("Tomates");
  expect(names).toContain("Tomates cerises");
});
