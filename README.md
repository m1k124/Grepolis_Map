# Grepolis Map

Outil de cartographie Grepolis en TypeScript, avec rendu Canvas et architecture prevue pour evoluer vers un import complet des donnees monde, des filtres avances et des snapshots temporels.

## Demarrage

```bash
npm install
npm run proxy
npm run dev
```

Le serveur Vite est configure sur `http://127.0.0.1:5174`. Le proxy local Grepolis tourne sur `http://127.0.0.1:5175` et expose `GET /api/world/:serverId`.

Si `node` et `npm` ne sont pas disponibles globalement, utiliser le Node local du projet :

```bash
export PATH="$PWD/.local/node-v24.14.1-darwin-x64/bin:$PATH"
npm install
npm run proxy
npm run dev
```

Pour Pharès, laisser le champ serveur sur `fr114` puis cliquer sur `Charger`.
`Charger` reutilise le cache local si les donnees sont encore valides. `Rafraichir` force un nouvel appel proxy/API, et `Vider cache` supprime le cache du serveur courant.

## Validation

```bash
npm run typecheck
npm run build
npm run check
```

Les tests d'acceptation manuels sont decrits dans `docs/acceptance.md`.

## Partage public

Le projet peut etre deploye comme une seule application web Node : le serveur sert le frontend compile et le proxy Grepolis. La procedure no-code recommandee avec Render Free est decrite dans `DEPLOY.md`.

## Structure

- `src/types` : types Grepolis partages.
- `src/grepolis` : chargement, parsing et donnees de demonstration.
- `src/domain` : filtres, selections et logique metier.
- `src/rendering` : camera, grille, villes et interactions canvas.
- `src/storage` : persistance locale versionnee des preferences/selections.
- `src/app` : assemblage de l'interface.
- `docs` : notes d'architecture et feuille de route.

## Etat actuel

Le socle affiche une carte de demonstration, supporte le pan/zoom, la recherche, le centrage sur ville, les infobulles enrichies, les villes fantomes, deux selections initiales et l'import manuel des fichiers `players.txt`, `alliances.txt`, `islands.txt`, `towns.txt`. Le parser utilise les offsets Grepolis complets et affiche les diagnostics de donnees dans la sidebar.

Les selections peuvent etre creees, renommees, colorees, activees, ordonnees et composees avec plusieurs contraintes. Elles sont conservees en local dans un format versionne et peuvent etre importees/exportees en JSON.

Le chargement monde tente d'abord le proxy local, puis le direct Grepolis en fallback. Le monde par defaut est `fr114` Pharès.
Le dernier chargement proxy/API est garde en cache local court terme pour accelerer les rechargements sans figer les donnees dans le projet.

La carte affiche les numeros de mer Grepolis. Une ou plusieurs mers peuvent etre selectionnees depuis la sidebar, mises en evidence sur la carte et recadrees avec `Focus mers`.

La carte visible peut etre exportee en PNG. La configuration courante peut etre exportee/importee en JSON ou partagee par URL sans embarquer les donnees monde completes.
