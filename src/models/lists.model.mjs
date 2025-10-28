import { ObjectId } from "mongodb";
import { getDb } from "../utils/db.mjs";

export const COL = "lists";

export async function createList(doc) {
    const db = await getDb();
    const now = new Date();
    const list = { name: doc.name, createdAt: now, updatedAt: now };
    const { insertedId } = await db.collection(COL).insertOne(list);
    return { ...list, _id: insertedId };
}

export async function getListById(id) {
    const db = await getDb();
    const q = { _id: new ObjectId(id) };
    return db.collection(COL).findOne(q);
}

export async function listLists() {
    const db = await getDb();
    return db.collection(COL).find(q).project({}).sort({ createdAt: -1 }).toArray();
}

export async function updateListTimestamp(id) {
    const db = await getDb();
    await db.collection(COL).updateOne({ _id: new ObjectId(id) }, { $set: { updatedAt: new Date() } });
}
