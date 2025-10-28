import { ObjectId } from "mongodb";
import { getDb } from "../utils/db.mjs";
import { updateListTimestamp } from "./lists.model.mjs";

export const COL = "items";

export async function listItemsByListId(listId, opts={}) {
    const db = await getDb();
    const q = { listId: new ObjectId(listId) };
    const cursor = db.collection(COL).find(q).sort({ createdAt: -1 });
    if (opts.limit) cursor.limit(opts.limit);
    if (opts.skip) cursor.skip(opts.skip);
    return cursor.toArray();
}

export async function addItemToList(listId, payload) {
    const db = await getDb();
    const now = new Date();
    const item = {
        listId: new ObjectId(listId),
        name: String(payload.name || "").trim(),
        quantity: payload.quantity ?? null,
        weight: payload.weight ?? null, // { value, unit }
        notes: payload.notes ?? null,
        purchased: payload.purchased ?? false,
        createdAt: now,
        updatedAt: now
    };
    const { insertedId } = await db.collection(COL).insertOne(item);
    await updateListTimestamp(listId);
    return { ...item, _id: insertedId };
}

export async function patchItem(listId, itemId, patch) {
    const db = await getDb();
    const set = { updatedAt: new Date() };
    if (patch.quantity !== undefined) set.quantity = patch.quantity;
    if (patch.weight !== undefined) set.weight = patch.weight;
    if (patch.purchased !== undefined) set.purchased = !!patch.purchased;

    const res = await db.collection(COL).findOneAndUpdate(
        { _id: new ObjectId(itemId), listId: new ObjectId(listId) },
        { $set: set },
        { returnDocument: "after" }
    );
    return res;
}

export async function removeItem(listId, itemId) {
    const db = await getDb();
    const res = await db.collection(COL).findOneAndDelete({ _id: new ObjectId(itemId), listId: new ObjectId(listId) });
    if (res.value) await updateListTimestamp(listId);
    return res.value;
}
