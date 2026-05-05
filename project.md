# Project Plan - Grepolis Map

## Etat actuel

Le projet est une app web TypeScript/Vite avec un rendu Canvas. Le socle contient deja :

- une demo locale chargee au demarrage ;
- un parser pour `players.txt`, `alliances.txt`, `islands.txt`, `towns.txt` ;
- un import manuel des quatre fichiers Grepolis ;
- une carte avec pan, zoom, grille, hover et couches de villes ;
- deux selections initiales : villes fantomes et villes 10k+ ;
- une persistance locale simple des selections via `localStorage`.

Objectif general : transformer ce scaffold en outil de mapping Grepolis utilisable pour l'analyse strategique, avec filtres avances, snapshots temporels, chargement fiable des mondes, exports et partage.

## Phase 1 - Installer et valider l'environnement

Statut : termine le 2026-05-04 avec Node 24.14.1 LTS local dans `.local/node-v24.14.1-darwin-x64`.

Objectif : rendre le projet executable localement.

Taches :

- Installer Node.js LTS et npm sur la machine si absents du `PATH`.
- Depuis `/Users/maelgrand/Desktop/Campagne_DRA/scrapping/Grepolis Map`, executer `npm install`.
- Lancer `npm run dev` et ouvrir `http://127.0.0.1:5174`.
- Verifier que la carte de demonstration s'affiche sans erreur console.

Zones concernees :

- `package.json`
- `vite.config.ts`
- `README.md`

Criteres de validation :

- `npm install` termine sans erreur.
- `npm run dev` sert l'application.
- La demo locale affiche des villes, les stats et les selections.

Risques / decisions :

- Si Node/npm restent indisponibles dans le shell, corriger le `PATH` avant tout developpement.

## Phase 2 - Stabiliser le socle technique

Statut : termine le 2026-05-04. `npm run typecheck`, `npm run build` et `npm run check` passent. Le dossier est initialise en repo Git.

Objectif : avoir des commandes fiables avant d'ajouter des fonctionnalites.

Taches :

- Verifier `npm run typecheck`.
- Verifier `npm run build`.
- Ajouter une commande de test quand un runner sera choisi.
- Corriger toute erreur TypeScript stricte.
- Initialiser Git si le dossier n'est pas encore versionne.

Zones concernees :

- `package.json`
- `tsconfig.json`
- `src/app`
- `src/domain`
- `src/grepolis`
- `src/rendering`

Criteres de validation :

- `npm run typecheck` passe.
- `npm run build` genere `dist/`.
- L'application reste fonctionnelle apres build.

Risques / decisions :

- Garder le projet sans framework UI tant que l'interface reste simple.
- Ajouter une librairie seulement si elle retire une vraie complexite.

## Phase 3 - Fiabiliser les donnees Grepolis

Statut : termine le 2026-05-04. Le parser utilise la table complete d'offsets, enrichit les villes avec les donnees joueur/alliance, expose `LoadSource`, `WorldSnapshot` et des diagnostics de parsing visibles dans l'UI.

Objectif : parser correctement les donnees monde reelles.

Taches :

- Remplacer les offsets simplifies des slots par la table complete Grepolis.
- Ajouter des retours d'erreur lisibles pour les lignes invalides.
- Conserver les bad lines en diagnostic au lieu de les ignorer silencieusement.
- Enrichir `Town` avec les points/rangs joueur et les points/rangs alliance deja disponibles via `Player` et `Alliance`.
- Ajouter un type `WorldSnapshot` contenant `id`, `serverId`, `loadedAt`, `source`, `world`.
- Ajouter un type `LoadSource` avec `demo`, `manual-import`, `proxy`, `direct`, `snapshot`.

Zones concernees :

- `src/types/grepolis.ts`
- `src/grepolis/parser.ts`
- `src/grepolis/sampleWorld.ts`
- `data/samples`

Criteres de validation :

- Les quatre fichiers sample sont parses sans erreur.
- Un import manuel avec des fichiers Grepolis reels affiche une carte coherent.
- Les villes ont des coordonnees plus proches du placement Grepolis.
- Les erreurs de parsing sont visibles dans l'UI ou dans un panneau diagnostic.

Risques / decisions :

- Les formats Grepolis peuvent contenir des champs vides ; les parsers doivent rester tolerants.
- Les fichiers `islands.txt` peuvent etre volumineux ; eviter les copies inutiles.

## Phase 4 - Ameliorer le rendu carte

Statut : termine le 2026-05-04. Ajout de la recherche ville/joueur/alliance/coordonnees, centrage sur ville, reset camera, legende, hover enrichi, index spatial simple pour le hover et rayons adaptes au zoom.

Objectif : rendre la carte plus lisible et plus performante.

Taches :

- Ajouter une legende visible pour les couches actives.
- Ajouter une recherche rapide par ville, joueur, alliance et coordonnees.
- Centrer la carte sur le resultat selectionne.
- Enrichir le hover : ville, points, joueur, alliance, coordonnees, ile, slot.
- Ajouter un index spatial simple pour accelerer hover et rendu sur gros mondes.
- Ajouter un niveau de detail : points simples loin, points plus grands/proches pres du zoom.
- Ajouter un bouton reset camera.

Zones concernees :

- `src/rendering/canvas.ts`
- `src/app/App.ts`
- `src/styles/global.css`

Criteres de validation :

- Pan/zoom restent fluides sur un gros monde.
- Les villes hors viewport ne sont pas dessinees.
- La recherche centre correctement la carte.
- Le hover reste reactif.

Risques / decisions :

- Si le Canvas 2D devient limite, envisager OffscreenCanvas ou WebGL plus tard, pas en premiere intention.

## Phase 5 - Construire l'editeur visuel de filtres

Statut : termine le 2026-05-04. L'application permet maintenant de creer, renommer, supprimer, ordonner, colorer, activer/desactiver, importer et exporter des selections. Chaque selection dispose d'un mode `AND` / `OR` et d'un editeur de contraintes champ/comparateur/valeur. La persistance `localStorage` utilise un format versionne.

Objectif : permettre de creer, modifier, ordonner et partager des selections.

Taches :

- Ajouter une UI pour creer/supprimer/renommer une selection.
- Ajouter un color picker par selection.
- Ajouter un toggle visible/cache par selection.
- Ajouter un editeur de contraintes : champ, comparateur, valeur.
- Ajouter le choix `AND` / `OR` par selection.
- Ajouter les champs minimum : joueur, alliance, ville, points ville, points joueur, rang joueur, coordonnees, ville fantome.
- Ajouter import/export JSON des selections.
- Conserver les selections dans `localStorage` dans un format versionne.

Zones concernees :

- `src/domain/filters.ts`
- `src/domain/selections.ts`
- `src/storage/localStore.ts`
- `src/app/App.ts`

Criteres de validation :

- Une selection peut etre creee sans editer le code.
- Les filtres se recalculent immediatement.
- Les selections persistent apres reload.
- L'import/export recree les memes couleurs, noms et contraintes.

Risques / decisions :

- Eviter une UI trop compacte au debut ; priorite a la clarte.
- Versionner le format persistant pour eviter de casser les anciennes selections.

## Phase 6 - Ajouter cache controle et snapshots explicites

Statut : cache controle termine le 2026-05-05. `Charger` reutilise le cache local valide, `Rafraichir` force un nouvel appel proxy/API, `Vider cache` supprime l'entree du serveur courant, et l'UI indique si les donnees viennent du cache ou d'un chargement frais. Les snapshots explicites restent a implementer dans une sous-etape separee.

Objectif : accelerer les rechargements et preparer la comparaison temporelle sans transformer le navigateur en stockage permanent automatique.

Taches :

- Ajouter un module `worldCache` base sur IndexedDB ou Cache API.
- Mettre en cache la derniere reponse proxy/API par `serverId`, avec `loadedAt`, `expiresAt`, `source` et compteurs.
- Ajouter un bouton `Rafraichir` qui ignore le cache et recharge Grepolis via proxy/API.
- Ajouter une indication claire : donnees depuis cache ou donnees fraiches.
- Ajouter un bouton explicite `Sauvegarder snapshot` pour figer l'etat courant.
- Ajouter un module `snapshotStore` separe du cache automatique.
- Lister les snapshots sauvegardes volontairement par serveur/date.
- Permettre de recharger, comparer et supprimer un snapshot.
- Ajouter un nettoyage manuel du cache et des snapshots.

Zones concernees :

- `src/storage`
- `src/types/grepolis.ts`
- `src/app/App.ts`
- `src/grepolis/api.ts`

Criteres de validation :

- Un chargement `fr114` recent peut etre reutilise depuis le cache sans nouvel appel reseau.
- `Rafraichir` force un nouvel appel proxy/API et remplace le cache courant.
- Le cache expire ou peut etre vide manuellement.
- Aucun snapshot historique n'est cree sans action explicite de l'utilisateur.
- Un snapshot sauvegarde volontairement peut etre recharge apres fermeture/reouverture.
- Deux snapshots sauvegardes du meme serveur peuvent etre compares.
- La suppression retire bien l'entree IndexedDB ou Cache API.

Risques / decisions :

- Les mondes peuvent etre lourds ; separer cache court terme et snapshots historiques.
- Eviter de stocker les donnees brutes et les donnees normalisees en double si ce n'est pas necessaire.
- Definir une duree de cache raisonnable pour `fr114`, par exemple 15 a 60 minutes.
- Prevoir une migration IndexedDB simple avec numero de version si IndexedDB est retenu.

## Phase 7 - Ajouter le chargement via proxy local

Statut : termine le 2026-05-04 pour `fr114` Phares, reverifie le 2026-05-05. Ajout du proxy Node local sur `127.0.0.1:5175`, route `GET /api/world/:serverId`, chargement proxy avant fallback direct, script `npm run proxy`, serveur par defaut `fr114` et documentation README. Validation proxy `fr114` du 2026-05-05 : 1 193 joueurs, 136 alliances, 118 208 iles, 145 251 villes.

Objectif : contourner proprement les blocages CORS du navigateur.

Taches :

- Ajouter un petit serveur proxy local Node.
- Exposer une route `GET /api/world/:serverId`.
- Le proxy recupere `players.txt`, `alliances.txt`, `islands.txt`, `towns.txt`.
- L'application tente le proxy avant le chargement direct Grepolis.
- Afficher une erreur claire si le proxy n'est pas lance.
- Documenter le lancement du proxy dans le README.

Zones concernees :

- `src/grepolis/api.ts`
- `package.json`
- futur dossier `server`
- `README.md`

Criteres de validation :

- `frXX` ou un autre monde valide peut etre charge sans import manuel.
- Les erreurs reseau sont comprehensibles.
- Le proxy ne stocke pas de donnees par defaut.

Risques / decisions :

- Ne pas exposer le proxy publiquement sans limitation.
- Si le projet devient desktop, Tauri pourra remplacer ce proxy.

## Phase 8 - Exports, partage et finition produit

Statut : termine le 2026-05-05 pour le perimetre sans IndexedDB. Ajout export PNG du viewport, export/import JSON de configuration, partage URL encode sans donnees monde completes, raccourcis clavier, etats de chargement, documentation de tests d'acceptation et logique pure `compareWorldSnapshots`. L'interface complete de comparaison snapshots reste liee a la phase 6, volontairement sautee.

Ajout cartographie mers le 2026-05-05 : affichage des numeros de mer Grepolis, selection multi-mers, surbrillance des mers selectionnees, focus camera sur la selection et mer affichee dans le hover ville.

Objectif : rendre l'outil agreable et partageable.

Taches :

- Ajouter export PNG de la carte visible.
- Ajouter export JSON des selections et snapshots metadata.
- Ajouter partage par URL pour `serverId` et selections encodees.
- Ajouter un mode comparaison entre deux snapshots : nouvelles villes, villes perdues, changements de proprietaire.
- Ajouter polish UI : responsive, raccourcis utiles, etats de chargement, erreurs non bloquantes.
- Ajouter tests d'acceptation manuels dans la documentation.

Zones concernees :

- `src/app`
- `src/rendering`
- `src/storage`
- `docs`

Criteres de validation :

- Une carte peut etre exportee en image.
- Une configuration de selections peut etre partagee et restauree.
- Deux snapshots d'un meme serveur peuvent etre compares.
- L'UI reste utilisable sur desktop et tablette.

Risques / decisions :

- L'export d'une grande carte complete peut etre couteux ; commencer par l'export viewport.
- Le partage URL doit eviter les donnees monde completes, seulement configuration et references.

## Interfaces et types a faire evoluer

Types principaux :

- `WorldData` : ajouter metadata de chargement et diagnostics.
- `Town` : conserver points/rangs joueur et alliance calcules depuis les tables liees.
- `WorldSnapshot` : encapsuler un monde stocke localement.
- `TownSelection` : ajouter version de schema et options d'affichage.
- `Constraint` : garder un format JSON stable et exportable.
- `UserPreferences` : theme, cache, affichage, derniere carte chargee.

Interfaces de chargement :

- `loadDemoWorld()`
- `loadManualImport(files)`
- `loadViaProxy(serverId)`
- `loadCachedWorld(serverId)`
- `refreshWorld(serverId)`
- `loadSnapshot(snapshotId)`

Regle de priorite recommandee :

1. demo locale pour developper vite ;
2. import manuel pour garantir un chemin sans CORS ;
3. proxy local/API pour obtenir les donnees fraiches ;
4. cache local court terme pour eviter des appels repetes ;
5. snapshot explicite pour l'analyse historique.

## Plan de test global

- Executer `npm install`.
- Executer `npm run dev`.
- Executer `npm run typecheck`.
- Executer `npm run build`.
- Tester la demo locale : carte, pan, zoom, hover, stats, selections.
- Tester l'import manuel avec les quatre fichiers obligatoires.
- Tester les filtres par ville fantome, points ville, alliance, joueur et coordonnees.
- Tester un gros monde Grepolis pour verifier fluidite et absence de freeze majeur.
- Tester la persistance des selections apres reload.
- Tester cache : chargement depuis cache, rafraichissement force, expiration, suppression.
- Tester snapshots explicites : sauvegarde volontaire, rechargement, comparaison, suppression.
- Tester erreurs : fichier manquant, fichier mal forme, serveur inaccessible, proxy eteint.

## Definition de fini

Le projet sera considere exploitable en v1 quand :

- un monde Grepolis reel peut etre charge par import manuel ou proxy ;
- la carte reste fluide sur un monde complet ;
- les selections peuvent etre creees, colorees, filtrees, importees et exportees ;
- le cache evite les rechargements inutiles sans masquer le bouton de rafraichissement ;
- les snapshots explicites peuvent etre sauvegardes et recharges ;

## Deploiement public no-code

Statut : prepare le 2026-05-05. Le serveur Node sert maintenant a la fois le frontend compile `dist` et le proxy `/api/world/:serverId`. En local developpement, l'app utilise encore le proxy `127.0.0.1:5175`; en production, elle utilise l'origine courante. Ajout de `npm start`, `render.yaml` et `DEPLOY.md` pour un deploiement Render Free.
- une carte visible peut etre exportee en PNG ;
- les erreurs principales sont comprehensibles pour l'utilisateur.
