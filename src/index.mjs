import { handleItems } from "./controllers/items.controller.mjs";
import { ok, notFound } from "./utils/http.mjs";

// normalise un path comme /api/v1/expenses/123 -> ["expenses", "123"]
function seg(event) {
    const raw = event.rawPath || event.path || "";
    const path = raw.replace(/^\/+|\/+$/g, "");
    return path.split("/").filter(Boolean);
}

export const handler = async (event) => {
    // Gère aussi les REST API (event.resource / event.path) et HTTP API (event.rawPath)
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const s = seg(event);

    // CORS preflight
    if (method === "OPTIONS") return ok({});

    // Routing simple
    // /expenses, /expenses/{id}
    if (s[0] === "items") return handleItems(event);

    return notFound("Route not found");
};