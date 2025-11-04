import { getDb } from "../utils/db.mjs";

export const COL = "article_suggestions";

/**
 * Normalise une chaîne en supprimant les accents et en convertissant en minuscules
 * @param {string} str - Chaîne à normaliser
 * @returns {string} - Chaîne normalisée sans accents
 */
function normalizeWithoutAccents(str) {
    return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ajoute ou met à jour un article dans la collection des suggestions
 * @param {string} name - Nom de l'article
 * @returns {Promise<Object>} - L'article créé ou mis à jour
 */
export async function addOrUpdateArticle(name) {
    const db = await getDb();
    const normalizedName = name.toLowerCase().trim();
    
    if (!normalizedName) return null;
    
    const now = new Date();
    
    // Vérifier si l'article existe déjà
    const existing = await db.collection(COL).findOne({ normalizedName });
    
    if (existing) {
        // Mettre à jour l'article existant
        const result = await db.collection(COL).findOneAndUpdate(
            { normalizedName },
            {
                $set: {
                    name,
                    updatedAt: now
                },
                $inc: { usageCount: 1 }
            },
            { returnDocument: "after" }
        );
        return result;
    } else {
        // Créer un nouvel article
        const result = await db.collection(COL).findOneAndUpdate(
            { normalizedName },
            {
                $set: {
                    name,
                    normalizedName,
                    usageCount: 1,
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                upsert: true,
                returnDocument: "after"
            }
        );
        return result;
    }
}

/**
 * Recherche simple des articles par nom
 * @param {string} query - Terme de recherche
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Liste des articles correspondants
 */
export async function searchArticles(query, opts = {}) {
    const db = await getDb();
    const normalizedQuery = normalizeWithoutAccents(query);
    
    if (!normalizedQuery) return [];
    
    // Recherche avec normalisation côté application : on récupère tous les articles
    // et on filtre en JavaScript pour comparer sans accents
    const allArticles = await db.collection(COL).find({}).toArray();
    
    // Filtrer les articles dont le normalizedName sans accents contient la query
    const filtered = allArticles.filter(article => {
        const normalizedArticleName = normalizeWithoutAccents(article.normalizedName);
        return normalizedArticleName.includes(normalizedQuery);
    });
    
    // Calculer le score et trier
    const scored = filtered.map(article => {
        const normalizedArticleName = normalizeWithoutAccents(article.normalizedName);
        const startsWithQuery = normalizedArticleName.startsWith(normalizedQuery) ? 1 : 0;
        const score = (startsWithQuery * 100) + article.usageCount;
        
        return {
            _id: article._id,
            name: article.name,
            usageCount: article.usageCount,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            score
        };
    });
    
    // Trier par score décroissant, puis par usageCount, puis par nom
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
        return a.name.localeCompare(b.name);
    });
    
    // Appliquer la pagination
    const start = opts.skip || 0;
    const end = opts.limit ? start + opts.limit : scored.length;
    
    return scored.slice(start, end);
}

/**
 * Récupère les articles les plus utilisés
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Liste des articles les plus populaires
 */
export async function getPopularArticles(opts = {}) {
    const db = await getDb();
    
    const cursor = db.collection(COL)
        .find({})
        .sort({ usageCount: -1, name: 1 })
        .project({ name: 1, usageCount: 1, createdAt: 1, updatedAt: 1 });
    
    if (opts.limit) cursor.limit(opts.limit);
    if (opts.skip) cursor.skip(opts.skip);
    
    return cursor.toArray();
}