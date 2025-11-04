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
    const normalizedName = normalizeWithoutAccents(name);
    
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
    
    // Recherche simple : commence par ou contient le terme
    const pipeline = [
        {
            $match: {
                normalizedName: { $regex: normalizedQuery, $options: 'i' }
            }
        },
        {
            $addFields: {
                // Score : priorité aux noms qui commencent par le terme recherché
                startsWithQuery: {
                    $cond: [
                        { $eq: [{ $indexOfCP: ["$normalizedName", normalizedQuery] }, 0] },
                        1,
                        0
                    ]
                }
            }
        },
        {
            $addFields: {
                score: {
                    $add: [
                        { $multiply: ["$startsWithQuery", 100] }, // Bonus si commence par
                        "$usageCount" // Popularité
                    ]
                }
            }
        },
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