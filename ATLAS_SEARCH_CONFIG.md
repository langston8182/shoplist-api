# Configuration Atlas Search pour les Articles

## Vue d'ensemble

L'API utilise MongoDB Atlas Search pour une recherche fuzzy avancée des articles. Si Atlas Search n'est pas disponible, l'API utilise automatiquement un fallback basé sur des expressions régulières.

## Configuration de l'index Atlas Search

### 1. Créer un index de recherche

Dans MongoDB Atlas, créez un index de recherche appelé `articles_search` sur la collection `article_suggestions` avec la configuration suivante :

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [
        {
          "type": "autocomplete",
          "analyzer": "lucene.standard",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 15,
          "foldDiacritics": true
        },
        {
          "type": "string",
          "analyzer": "lucene.standard"
        }
      ],
      "normalizedName": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "usageCount": {
        "type": "number"
      }
    }
  }
}
```

### 2. Configuration via l'interface Atlas

1. Allez dans votre cluster MongoDB Atlas
2. Cliquez sur l'onglet "Search"
3. Cliquez sur "Create Search Index"
4. Sélectionnez la base de données et la collection `article_suggestions`
5. Nommez l'index `articles_search`
6. Utilisez la configuration JSON ci-dessus

### 3. Configuration via MongoDB Compass

Vous pouvez également créer l'index via MongoDB Compass :

1. Connectez-vous à votre cluster
2. Naviguez vers la collection `article_suggestions`
3. Allez dans l'onglet "Search Indexes"
4. Créez un nouvel index avec le nom `articles_search`

## Fonctionnalités Atlas Search utilisées

### **Autocomplete**
- Recherche en temps réel pendant la saisie
- Configuration `edgeGram` pour les suggestions de type-ahead
- `foldDiacritics: true` pour ignorer les accents

### **Text Search avec Fuzzy**
- Tolérance aux fautes de frappe (maxEdits: 2)
- Recherche sur les noms normalisés

### **Phrase Search**
- Boost pour les correspondances exactes
- Priorise les résultats exacts

### **Score combiné**
- Score Atlas Search × 10
- Usage count × 0.5
- Tri par pertinence et popularité

## Exemples de recherche

Avec Atlas Search configuré, la recherche sera beaucoup plus performante :

```bash
# Recherche fuzzy avancée
GET /articles?q=tomat
# Trouvera: "Tomates", "Tomates cerises", "Concentré de tomate"

# Tolérance aux fautes
GET /articles?q=pomm
# Trouvera: "Pommes", "Pomme de terre", "Pamplemousse"

# Recherche avec accents
GET /articles?q=gruyere  
# Trouvera: "Gruyère", "Gruyère râpé"
```

## Fallback automatique

Si Atlas Search n'est pas configuré ou disponible, l'API utilise automatiquement une recherche basée sur des expressions régulières avec :

- Recherche par préfixe (score: 20)
- Correspondance exacte (score: 15) 
- Fuzzy regex (score: 5)
- Bonus basé sur la popularité

## Monitoring

L'API log les erreurs Atlas Search et bascule automatiquement sur le fallback :

```
Atlas Search non disponible, utilisation du fallback regex: [error message]
```

## Performance

- **Atlas Search** : ~10-50ms pour des milliers d'articles
- **Fallback Regex** : ~100-500ms pour des milliers d'articles

Pour des performances optimales en production, il est fortement recommandé de configurer Atlas Search.