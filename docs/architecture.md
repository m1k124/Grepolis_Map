# Architecture

## Objectif

Construire une alternative web moderne a Turun/GrepolisMap, plus simple a faire evoluer et plus ergonomique pour l'analyse strategique.

## Flux de donnees

1. Recuperation des fichiers Grepolis (`players.txt`, `alliances.txt`, `islands.txt`, `towns.txt`).
2. Parsing vers `WorldData`.
3. Indexation progressive des joueurs, alliances, iles et villes.
4. Application des selections/filtres.
5. Rendu canvas par couches.
6. Sauvegarde locale des selections.
7. Cache court terme optionnel du dernier monde charge via proxy/API.
8. Snapshots historiques uniquement sur action explicite.

## Modules

- `grepolis/parser.ts` convertit les fichiers Grepolis en donnees applicatives et remonte les diagnostics de parsing.
- `grepolis/api.ts` tente le proxy local avant le chargement direct Grepolis.
- `grepolis/offsets.ts` contient les offsets Grepolis complets par type d'ile et slot.
- `domain/filters.ts` contient les contraintes, les champs filtrables et l'evaluation des selections.
- `domain/seas.ts` centralise la numerotation des mers Grepolis et leurs limites.
- `domain/selections.ts` cree les selections par defaut et les nouvelles selections utilisateur.
- `domain/snapshots.ts` contient la comparaison pure de deux snapshots d'un meme serveur.
- `rendering/canvas.ts` gere camera, pan, zoom, grille et hover.
- `rendering/canvas.ts` expose aussi l'export PNG du viewport.
- `rendering/canvas.ts` affiche les numeros de mer et met en evidence les mers selectionnees.
- `rendering/canvas.ts` maintient aussi un index spatial simple pour accelerer le hover.
- `app/App.ts` connecte l'interface au domaine et au renderer.
- `storage/appConfig.ts` encode/decode la configuration partageable et l'export JSON applicatif.
- `storage/localStore.ts` garde les selections entre deux sessions dans un format versionne et sert aussi a l'import/export JSON.
- `storage/worldCache.ts` conserve le dernier chargement proxy/API par serveur avec expiration et compteurs.
- `server/proxy.mjs` expose `GET /api/world/:serverId` et relaie les quatre fichiers Grepolis sans stockage local.

## Prochaines briques

- Ajouter des snapshots explicites, separes du cache automatique.
- Ajouter une interface de comparaison temporelle quand les snapshots explicites seront actifs.
