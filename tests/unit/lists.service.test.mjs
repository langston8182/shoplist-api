import { jest } from "@jest/globals";

const modelMock = {
  createList: jest.fn(async (doc) => ({ _id: "L1", ...doc })),
  listLists: jest.fn(async () => [{ _id: "L1", name: "Courses" }]),
  getListById: jest.fn(async (id) => id === "L1" ? ({ _id: "L1", name: "Courses" }) : null)
};
const itemsModelMock = {
  listItemsByListId: jest.fn(async () => [{ _id: "I1", name: "Pâtes" }])
};

jest.unstable_mockModule("../../src/models/lists.model.mjs", () => (modelMock));
jest.unstable_mockModule("../../src/models/items.model.mjs", () => (itemsModelMock));

const svc = await import("../../src/services/lists.service.mjs");

describe("lists.service", () => {
  test("createNewList proxies to model", async () => {
    const r = await svc.createNewList({ name: "Courses" });
    expect(r._id).toBe("L1");
  });

  test("getListWithItems merges items", async () => {
    const r = await svc.getListWithItems("L1");
    expect(r.items).toHaveLength(1);
  });
});
