import { ok, created, noContent, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { createItem, patchItem, removeItem, listItems} from "../services/items.service.mjs";

export async function handleItems(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod; // REST or HTTP API
        if (method === "OPTIONS") return ok({}); // CORS preflight

        if (method === "GET") {
            const items = await listItems();
            return ok({ items });
        }

        if (method === "POST") {
            const body = parseJsonBody(event);
            if (!body.name) return badRequest("Missing 'name'");
            const doc = await createItem(body);
            return created(doc);
        }

        if (method === "PATCH") {
            const id = event.pathParameters?.itemId;
            if (!id) return badRequest("Missing id");
            const body = parseJsonBody(event);
            const updated = await patchItem(id, body);
            return ok(updated);
        }

        if (method === "DELETE") {
            const id = event.pathParameters?.itemId;
            if (!id) return badRequest("Missing id");
            await removeItem(id);
            return noContent();
        }

        return badRequest("Unsupported method");
    } catch (err) {
        return serverError(err);
    }
}