# Tests d'acceptation manuels

## Environnement

1. Lancer `npm run proxy`.
2. Lancer `npm run dev`.
3. Ouvrir `http://127.0.0.1:5174`.

## Chargement fr114

1. Verifier que le champ serveur contient `fr114`.
2. Cliquer sur `Charger`.
3. Attendre le statut de chargement via proxy local.
4. Verifier que les statistiques affichent les joueurs, alliances, iles et villes.
5. Cliquer a nouveau sur `Charger`.
6. Verifier que le statut indique un chargement depuis le cache local.
7. Cliquer sur `Rafraichir`.
8. Verifier que l'application force un nouvel appel proxy/API.
9. Cliquer sur `Vider cache`.
10. Verifier que l'indication de cache disparait.

Validation attendue : la carte Pharès s'affiche sans import manuel, le cache evite un deuxieme appel inutile, et le rafraichissement force reste disponible.

## Carte et navigation

1. Zoomer avec la molette.
2. Deplacer la carte au pointeur.
3. Survoler une ville.
4. Rechercher une ville, un joueur, une alliance ou des coordonnees.
5. Cliquer un resultat de recherche.
6. Cliquer `Reset`.
7. Verifier que les numeros de mer sont visibles sur la carte.
8. Selectionner une ou plusieurs mers dans la sidebar.
9. Verifier que les mers selectionnees sont mises en evidence.
10. Cliquer `Focus mers`.

Validation attendue : la carte reste fluide, le hover affiche les informations enrichies avec la mer, le reset recadre le monde et le focus mers recadre les mers selectionnees.

## Selections

1. Creer une selection.
2. Renommer la selection.
3. Changer sa couleur.
4. Ajouter une contrainte `Alliance contient ...` ou `Points ville >= 10000`.
5. Passer de `AND` a `OR`.
6. Desactiver puis reactiver la selection.
7. Monter ou descendre la selection.

Validation attendue : les compteurs, la legende et la carte se recalculent immediatement.

## Exports et partage

1. Cliquer `Exporter PNG`.
2. Cliquer `Exporter config`.
3. Cliquer `Importer config` et reprendre le JSON exporte.
4. Cliquer `Copier lien`.
5. Ouvrir le lien dans un nouvel onglet.

Validation attendue : le PNG represente le viewport visible, le JSON restaure `serverId`, affichages et selections, et le lien partage restaure la meme configuration sans inclure les donnees monde completes.

## Erreurs non bloquantes

1. Arreter le proxy.
2. Cliquer `Charger`.
3. Tester l'import avec un fichier JSON invalide.
4. Tester l'import manuel avec un fichier Grepolis manquant.

Validation attendue : l'interface reste utilisable et affiche une erreur claire dans le statut.

## Responsive

1. Reduire la fenetre a une largeur tablette.
2. Verifier les panneaux de selections et les boutons d'action.
3. Tester zoom, pan et recherche.

Validation attendue : aucun texte important ne deborde et la carte garde une zone utilisable.

## Comparaison de snapshots

La logique pure `compareWorldSnapshots` existe dans `src/domain/snapshots.ts` pour comparer deux `WorldSnapshot` d'un meme serveur : nouvelles villes, villes perdues et changements de proprietaire. L'interface de comparaison complete dependra du stockage IndexedDB de la phase 6, qui a ete volontairement sautee avant le proxy.
