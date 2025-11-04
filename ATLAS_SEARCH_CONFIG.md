# Recherche d'articles

## Vue d'ensemble

L'API utilise une recherche simple et performante basée sur des expressions régulières MongoDB.
La recherche privilégie les articles qui commencent par le terme recherché, puis ceux qui le contiennent.

## Fonctionnalités de recherche

### **Recherche simple et performante**
- Utilise des regex MongoDB natives (pas besoin d'Atlas Search)
- Recherche insensible à la casse
- Normalisation des noms en minuscules

### **Algorithme de scoring**
- **Bonus "commence par"** : Articles qui commencent par le terme (score +100)
- **Popularité** : Score basé sur `usageCount`
- Tri : Score → Popularité → Nom alphabétique

### **Optimisation**
- Pas de configuration complexe requise
- Fonctionne sur n'importe quel MongoDB (local, Atlas, etc.)
- Performance optimale pour des milliers d'articles

## Exemples de recherche

```bash
# Recherche simple
GET /articles?q=tomat
# Trouvera: "Tomates", "Tomates cerises", "Concentré de tomate"

# Commence par
GET /articles?q=pom
# Trouvera en priorité: "Pommes" (commence par), puis "Pamplemousse" (contient)

# Recherche partielle
GET /articles?q=terre
# Trouvera: "Pomme de terre", "Terrine", etc.
```

## Pipeline MongoDB (pour tester dans Compass)

```javascript
[
  {
    $match: {
      normalizedName: { $regex: "pom", $options: 'i' }
    }
  },
  {
    $addFields: {
      startsWithQuery: {
        $cond: [
          { $eq: [{ $indexOfCP: ["$normalizedName", "pom"] }, 0] },
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
          { $multiply: ["$startsWithQuery", 100] },
          "$usageCount"
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
]
```

## Performance

- **Regex MongoDB** : ~50-200ms pour des milliers d'articles
- Simple et efficace sans configuration supplémentaire
- Index recommandé sur `normalizedName` pour optimiser les performances