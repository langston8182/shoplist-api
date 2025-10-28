import { createList, listLists, getListById, deleteList } from "../models/lists.model.mjs";
import { listItemsByListId } from "../models/items.model.mjs";

export async function createNewList({ name }) { return createList({ name }); }
export async function getLists() { return listLists(); }
export async function getList(id) { return getListById(id); }

export async function getListWithItems(id) {
    const list = await getListById(id);
    if (!list) return null;
    const items = await listItemsByListId(id);
    return { ...list, items };
}

export async function removeList(id) {
    return deleteList(id);
}
