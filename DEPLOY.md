# Deploiement no-code gratuit

Objectif : obtenir une URL publique unique pour Grepolis Map, sans demander aux utilisateurs d'installer quoi que ce soit.

## Option recommandee : Render Free

Render propose des web services gratuits adaptes aux projets hobby. La contrepartie habituelle d'un service gratuit est un demarrage parfois lent apres une periode d'inactivite.

## 1. Mettre le projet sur GitHub

1. Creer un compte GitHub si besoin.
2. Creer un nouveau repository, par exemple `grepolis-map`.
3. Envoyer le contenu du dossier `Grepolis Map` dans ce repository.

Ne pas envoyer :

- `node_modules`
- `dist`
- `.local`

Ces dossiers sont deja ignores par `.gitignore`.

## 2. Creer le service Render

1. Creer un compte sur `https://render.com`.
2. Cliquer sur `New`.
3. Choisir `Web Service`.
4. Connecter le compte GitHub.
5. Choisir le repository `grepolis-map`.
6. Configurer :
   - Runtime : `Node`
   - Build Command : `npm install && npm run build`
   - Start Command : `npm start`
   - Instance Type / Plan : `Free`
7. Cliquer sur `Create Web Service`.

Si Render detecte `render.yaml`, il peut aussi proposer une creation automatique du service.

## 3. Attendre le deploy

Render va :

1. installer les dependances ;
2. compiler le frontend Vite dans `dist` ;
3. lancer `server/proxy.mjs`.

Une fois termine, Render donne une URL publique du type :

```text
https://grepolis-map.onrender.com
```

Cette URL sert a la fois :

- l'application web ;
- le proxy Grepolis `/api/world/fr114`.

## 4. Tester l'URL publique

1. Ouvrir l'URL Render.
2. Verifier que le champ serveur contient `fr114`.
3. Cliquer sur `Charger`.
4. Attendre le chargement de Pharès.
5. Tester recherche, mers, selections et export PNG.

## 5. Partager

Envoyer simplement l'URL Render aux autres joueurs.

Ils n'ont rien a installer.

## Notes importantes

- Un service gratuit peut etre lent au premier chargement apres une periode d'inactivite.
- Si l'usage devient intensif, il faudra peut-etre passer sur une petite offre payante.
- Le cache monde reste dans le navigateur de chaque utilisateur, pas sur Render.
- Les donnees Grepolis ne sont pas stockees durablement par le serveur.
- Le proxy public est limite a `fr114` par defaut.
- Variables optionnelles :
  - `ALLOWED_SERVERS` : liste de serveurs autorises, separes par des virgules. Exemple : `fr114`.
  - `RATE_LIMIT_MAX_REQUESTS` : nombre maximal d'appels API par IP et par heure. Valeur par defaut : `60`.
