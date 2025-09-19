import { insertItem, findItems, updateItem, deleteItem } from "../models/items.model.mjs";

export async function listItems() {
    return findItems();
}

export async function createItem(payload) {
    const now = new Date().toISOString();
    return insertItem({
        name: payload.name,
        quantity: payload.quantity,
        unit: payload.unit,
        createdAt: now,
        updatedAt: now
    });
}

export async function patchItem(id, payload) {
    const patch = { ...payload, updatedAt: new Date().toISOString() };
    return updateItem(id, patch);
}

export async function removeItem(id) {
    await deleteItem(id);
    return true;
}