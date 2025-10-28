import { ok, created, notFound, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { createNewList, getLists, getListWithItems, removeList } from "../services/lists.service.mjs";
import { listItems } from "../services/items.service.mjs";

export async function handleLists(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        const path = (event.rawPath || event.path || "").replace(/^\/+|\/+$/g, "");
        const seg = path.split("/").filter(Boolean);

        if (method === "GET" && seg.length === 1) {
            const userId = null;
            return ok(await getLists());
        }
        if (method === "POST" && seg.length === 1) {
            const body = parseJsonBody(event);
            const doc = await createNewList({ name: body.name });
            return created(doc);
        }
        if (method === "GET" && seg.length === 2) {
            const r = await getListWithItems(seg[1]);
            return r ? ok(r) : notFound("List not found");
        }
        if (method === "DELETE" && seg.length === 2) {
            const deleted = await removeList(seg[1]);
            return deleted ? ok({ message: "List deleted successfully" }) : notFound("List not found");
        }

        // Optional: /lists/{listId}/items to fetch only items with pagination
        if (method === "GET" && seg.length === 3 && seg[2] === "items") {
            const limit = Number(event.queryStringParameters?.limit || 0) || undefined;
            const skip = Number(event.queryStringParameters?.skip || 0) || undefined;
            return ok(await listItems(seg[1], { limit, skip }));
        }

        return notFound("Route not found");
    } catch (e) {
        console.error(e);
        return serverError();
    }
}
