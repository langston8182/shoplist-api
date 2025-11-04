import { ok, badRequest, notFound, serverError } from "../utils/http.mjs";
import { searchArticlesByName, getPopularArticlesList } from "../services/articles.service.mjs";

export async function handleArticles(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        const path = (event.rawPath || event.path || "").replace(/^\/+|\/+$/g, "");
        const seg = path.split("/").filter(Boolean);

        // GET /articles?q=pomme ou GET /articles/search?q=pomme
        if (method === "GET" && seg.length === 1 && seg[0] === "articles") {
            try {
                const queryStringParameters = event.queryStringParameters || {};
                const query = queryStringParameters.q || queryStringParameters.query;
                
                if (!query) {
                    // Si pas de query, retourner les articles populaires
                    const limit = parseInt(queryStringParameters.limit) || 50;
                    const skip = parseInt(queryStringParameters.skip) || 0;
                    const articles = await getPopularArticlesList({ limit, skip });
                    
                    return ok({
                        articles,
                        total: articles.length,
                        type: "popular"
                    });
                }
                
                const limit = parseInt(queryStringParameters.limit) || 20;
                const skip = parseInt(queryStringParameters.skip) || 0;
                const articles = await searchArticlesByName(query, { limit, skip });
                
                return ok({
                    articles,
                    query,
                    total: articles.length,
                    type: "search"
                });
            } catch (e) {
                return badRequest(e.message);
            }
        }

        // GET /articles/search?q=pomme (route alternative)
        if (method === "GET" && seg.length === 2 && seg[0] === "articles" && seg[1] === "search") {
            try {
                const queryStringParameters = event.queryStringParameters || {};
                const query = queryStringParameters.q || queryStringParameters.query;
                
                if (!query) {
                    return badRequest("Query parameter 'q' is required for search");
                }
                
                const limit = parseInt(queryStringParameters.limit) || 20;
                const skip = parseInt(queryStringParameters.skip) || 0;
                const articles = await searchArticlesByName(query, { limit, skip });
                
                return ok({
                    articles,
                    query,
                    total: articles.length,
                    type: "search"
                });
            } catch (e) {
                return badRequest(e.message);
            }
        }

        // GET /articles/popular
        if (method === "GET" && seg.length === 2 && seg[0] === "articles" && seg[1] === "popular") {
            try {
                const queryStringParameters = event.queryStringParameters || {};
                const limit = parseInt(queryStringParameters.limit) || 50;
                const skip = parseInt(queryStringParameters.skip) || 0;
                const articles = await getPopularArticlesList({ limit, skip });
                
                return ok({
                    articles,
                    total: articles.length,
                    type: "popular"
                });
            } catch (e) {
                return serverError();
            }
        }

        return notFound("Route not found");
    } catch (e) {
        console.error(e);
        return serverError();
    }
}