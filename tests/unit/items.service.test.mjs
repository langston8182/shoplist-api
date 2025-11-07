import { jest } from "@jest/globals";

const modelMock = {
  addItemToList: jest.fn(async (listId, payload) => ({ _id: "mock", ...payload, listId })),
  listItemsByListId: jest.fn(),
  patchItem: jest.fn(),
  removeItem: jest.fn()
};

const articlesMock = {
  addOrUpdateArticle: jest.fn(async (name) => ({ _id: "mock-article", name }))
};

jest.unstable_mockModule("../../src/models/items.model.mjs", () => (modelMock));
jest.unstable_mockModule("../../src/models/articles.model.mjs", () => (articlesMock));
const svc = await import("../../src/services/items.service.mjs");

describe("items.service - business rules", () => {
  test("addItem requires name", async () => {
    await expect(svc.addItem("L1", { quantity: 1 })).rejects.toThrow("Name is required");
  });

  test("addItem forbids both quantity and weight", async () => {
    await expect(svc.addItem("L1", { name: "Pâtes", quantity: 1, weight: { value: 500, unit: "g" } }))
      .rejects.toThrow("Provide either quantity or weight, not both");
  });

  test("addItem with quantity passes through to model", async () => {
    const res = await svc.addItem("L1", { name: "Pâtes", quantity: 3 });
    expect(res.listId).toBe("L1");
    expect(modelMock.addItemToList).toHaveBeenCalled();
  });

  test("patchListItem allows only quantity/weight/purchased", async () => {
    await expect(svc.patchListItem("L1", "I1", { name: "Hack" })).rejects.toThrow("Only quantity, weight, or purchased can be updated");
    modelMock.patchItem.mockResolvedValueOnce({ _id: "I1", quantity: 2 });
    const res = await svc.patchListItem("L1", "I1", { quantity: 2 });
    expect(res.quantity).toBe(2);
  });
});
