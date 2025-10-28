import { addItemToList, listItemsByListId, patchItem, removeItem } from "../models/items.model.mjs";

export async function listItems(listId, opts) { return listItemsByListId(listId, opts); }

export async function addItem(listId, payload) {
    const name = String(payload.name || "").trim();
    if (!name) throw new Error("Name is required");
    const hasQuantity = payload.quantity != null;
    const hasWeight = payload.weight != null;
    if (hasQuantity && hasWeight) throw new Error("Provide either quantity or weight, not both");
    return addItemToList(listId, payload);
}

export async function patchListItem(listId, itemId, patch) {
    const allowed = {};
    if (patch.quantity !== undefined) allowed.quantity = patch.quantity;
    if (patch.weight !== undefined) allowed.weight = patch.weight;
    if (patch.purchased !== undefined) allowed.purchased = !!patch.purchased;
    if (Object.keys(allowed).length === 0) throw new Error("Only quantity, weight, or purchased can be updated");
    return patchItem(listId, itemId, allowed);
}

export async function deleteListItem(listId, itemId) { return removeItem(listId, itemId); }
