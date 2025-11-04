import { searchArticles, getPopularArticles } from "../models/articles.model.mjs";

/**
 * Recherche des articles avec fuzzy search
 * @param {string} query - Terme de recherche
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Liste des articles correspondants
 */
export async function searchArticlesByName(query, opts = {}) {
    if (!query || typeof query !== 'string') {
        throw new Error("Query parameter is required and must be a string");
    }
    
    const limit = opts.limit || 20; // Limite par défaut
    const skip = opts.skip || 0;
    
    return searchArticles(query, { limit, skip });
}

/**
 * Récupère les articles populaires
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Liste des articles populaires
 */
export async function getPopularArticlesList(opts = {}) {
    const limit = opts.limit || 50;
    const skip = opts.skip || 0;
    
    return getPopularArticles({ limit, skip });
}