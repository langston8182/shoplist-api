import { handleLists } from "./controllers/lists.controller.mjs";
import { handleItems } from "./controllers/items.controller.mjs";
import { handleArticles } from "./controllers/articles.controller.mjs";
import { ok, notFound } from "./utils/http.mjs";

function seg(event) {
    const raw = event.rawPath || event.path || "";
    const path = raw.replace(/^\/+|\/+$/g, "");
    return path.split("/").filter(Boolean);
}

export const handler = async (event) => {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const s = seg(event);
    if (method === "OPTIONS") return ok({});

    if (s[0] === "lists") {
        if (s[2] === "items") return handleItems(event);
        return handleLists(event);
    }
    
    if (s[0] === "articles") {
        return handleArticles(event);
    }
    
    return notFound("Route not found");
};
