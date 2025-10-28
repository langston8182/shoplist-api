import { ok, badRequest, notFound, serverError, parseJsonBody } from "../utils/http.mjs";
import { addItem, deleteListItem, patchListItem } from "../services/items.service.mjs";

export async function handleItems(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        const path = (event.rawPath || event.path || "").replace(/^\/+|\/+$/g, "");
        const seg = path.split("/").filter(Boolean);

        // POST /lists/{listId}/items
        if (method === "POST" && seg.length === 3 && seg[2] === "items") {
            try { return ok(await addItem(seg[1], parseJsonBody(event))); }
            catch (e) { return badRequest(e.message); }
        }

        // PATCH /lists/{listId}/items/{itemId}
        if (method === "PATCH" && seg.length === 4 && seg[2] === "items") {
            try {
                const r = await patchListItem(seg[1], seg[3], parseJsonBody(event));
                return r ? ok(r) : notFound("Item not found");
            } catch (e) { return badRequest(e.message); }
        }

        // DELETE /lists/{listId}/items/{itemId}
        if (method === "DELETE" && seg.length === 4 && seg[2] === "items") {
            const r = await deleteListItem(seg[1], seg[3]);
            return r ? ok(r) : notFound("Item not found");
        }

        return notFound("Route not found");
    } catch (e) {
        console.error(e);
        return serverError();
    }
}
