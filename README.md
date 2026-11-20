# CinéMatch : corrigé des TD 16 à 22 (vendredi 20 novembre 2026)

Un serveur Express et une page React. Sur ton poste, la base est un fichier. En ligne, Vercel sert la page et le serveur, et la base est chez Turso.

## Sur ton poste

1. Dans ce dossier : `npm install`.
2. Copie `.env.example` en `.env`, puis colle le jeton TMDB du groupe. Laisse les deux lignes Turso vides.
3. Terminal 1 : `npm run server`. http://localhost:3000/api/sante répond `"base": "fichier local"`.
4. Terminal 2 : `npm run dev`, puis ouvre http://localhost:5173.

## En ligne

- `api/index.ts` : sur Vercel, chaque appel à `/api` passe par ce fichier, qui donne le serveur Express.
- `vercel.json` : Vercel construit la page avec Vite, puis envoie `/api/...` au serveur.
- `server/index.ts` : `export default app`. Le serveur n'appelle `app.listen` que hors de Vercel.
- `tsconfig.json` : `rewriteRelativeImportExtensions` laisse Vercel compiler les imports en `.ts`.
- `server/base.ts` : le client Turso (`@libsql/client`). Même SQL qu'avec `node:sqlite`, mais chaque requête se fait avec `await`.
- Les réglages du projet Vercel contiennent `TMDB_TOKEN`, `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`. Après un changement de réglage, il faut redéployer.

## La page d'une soirée (TD 22)

- `GET /api/soirees/:id` : la soirée et ses membres ; 400 si l'identifiant n'est pas un nombre entier, 404 si la soirée n'existe pas.
- `src/Soiree.tsx` : « Qui es-tu ? ». Le prénom choisi est gardé dans le navigateur (`localStorage`), une clé par soirée.

## Le reste

- `.gitignore` : `node_modules`, `dist`, `.env` et les bases `*.db` ne partent jamais sur GitHub.
- Node 22.18 ou plus lance les fichiers `.ts` du serveur sans autre outil.
