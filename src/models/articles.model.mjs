import { getDb } from "../utils/db.mjs";

export const COL = "article_suggestions";

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
    
    // Utilise upsert pour créer ou mettre à jour
    const result = await db.collection(COL).findOneAndUpdate(
        { normalizedName },
        {
            $set: {
                name,
                normalizedName,
                updatedAt: now
            },
            $setOnInsert: {
                createdAt: now,
                usageCount: 0
            },
            $inc: { usageCount: 1 }
        },
        {
            upsert: true,
            returnDocument: "after"
        }
    );
    
    return result;
}

/**
 * Recherche des articles avec fuzzy search basé sur une requête
 * Utilise Atlas Search si disponible, sinon fallback sur regex
 * @param {string} query - Terme de recherche
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Liste des articles correspondants
 */
export async function searchArticles(query, opts = {}) {
    const db = await getDb();
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) return [];
    
    // Essayer d'abord Atlas Search
    try {
        return await searchWithAtlasSearch(db, query, normalizedQuery, opts);
    } catch (error) {
        console.log("Atlas Search non disponible, utilisation du fallback regex:", error.message);
        // Fallback sur la recherche regex
        return await searchWithRegex(db, query, normalizedQuery, opts);
    }
}

/**
 * Recherche avec MongoDB Atlas Search
 * @param {Object} db - Instance de base de données
 * @param {string} originalQuery - Requête originale
 * @param {string} normalizedQuery - Requête normalisée
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Résultats de recherche
 */
async function searchWithAtlasSearch(db, originalQuery, normalizedQuery, opts = {}) {
    const pipeline = [
        {
            $search: {
                index: "articles_search", // Nom de l'index Atlas Search
                compound: {
                    should: [
                        // Recherche fuzzy sur le nom normalisé
                        {
                            autocomplete: {
                                query: originalQuery,
                                path: "name",
                                fuzzy: {
                                    maxEdits: 2,
                                    prefixLength: 1
                                }
                            }
                        },
                        // Recherche fuzzy sur le nom normalisé
                        {
                            text: {
                                query: originalQuery,
                                path: "normalizedName",
                                fuzzy: {
                                    maxEdits: 2
                                }
                            }
                        },
                        // Boost pour les correspondances exactes
                        {
                            phrase: {
                                query: originalQuery,
                                path: "name"
                            }
                        }
                    ]
                }
            }
        },
        {
            $addFields: {
                // Combiner le score Atlas Search avec la popularité
                combinedScore: {
                    $add: [
                        { $multiply: [{ $meta: "searchScore" }, 10] },
                        { $multiply: ["$usageCount", 0.5] }
                    ]
                }
            }
        },
        { $sort: { combinedScore: -1, usageCount: -1, name: 1 } },
        {
            $project: {
                name: 1,
                usageCount: 1,
                createdAt: 1,
                updatedAt: 1,
                score: "$combinedScore"
            }
        }
    ];
    
    if (opts.limit) pipeline.push({ $limit: opts.limit });
    if (opts.skip) pipeline.push({ $skip: opts.skip });
    
    return db.collection(COL).aggregate(pipeline).toArray();
}

/**
 * Recherche fallback avec regex
 * @param {Object} db - Instance de base de données
 * @param {string} originalQuery - Requête originale
 * @param {string} normalizedQuery - Requête normalisée
 * @param {Object} opts - Options de pagination
 * @returns {Promise<Array>} - Résultats de recherche
 */
async function searchWithRegex(db, originalQuery, normalizedQuery, opts = {}) {
    // Fuzzy regex: permet des caractères entre chaque lettre
    const fuzzyRegex = new RegExp(normalizedQuery.split('').join('.*'), 'i');
    const exactRegex = new RegExp(normalizedQuery, 'i');
    const prefixRegex = new RegExp(`^${normalizedQuery}`, 'i');
    
    const pipeline = [
        {
            $match: {
                $or: [
                    { normalizedName: { $regex: prefixRegex } },
                    { normalizedName: { $regex: exactRegex } },
                    { normalizedName: { $regex: fuzzyRegex } }
                ]
            }
        },
        {
            $addFields: {
                // Score basé sur le type de correspondance
                prefixMatch: {
                    $cond: [
                        { $regexMatch: { input: "$normalizedName", regex: prefixRegex } },
                        20,
                        0
                    ]
                },
                exactMatch: {
                    $cond: [
                        { $regexMatch: { input: "$normalizedName", regex: exactRegex } },
                        15,
                        0
                    ]
                },
                fuzzyMatch: {
                    $cond: [
                        { $regexMatch: { input: "$normalizedName", regex: fuzzyRegex } },
                        5,
                        0
                    ]
                }
            }
        },
        {
            $addFields: {
                score: {
                    $add: [
                        "$prefixMatch",
                        "$exactMatch", 
                        "$fuzzyMatch",
                        { $multiply: ["$usageCount", 0.3] }
                    ]
                }
            }
        },
        { $match: { score: { $gt: 0 } } },
        { $sort: { score: -1, usageCount: -1, name: 1 } },
        {
            $project: {
                name: 1,
                usageCount: 1,
                createdAt: 1,
                updatedAt: 1,
                score: 1
            }
        }
    ];
    
    if (opts.limit) pipeline.push({ $limit: opts.limit });
    if (opts.skip) pipeline.push({ $skip: opts.skip });
    
    return db.collection(COL).aggregate(pipeline).toArray();
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