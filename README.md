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

## L'API

| Demande | Rôle |
|---|---|
| `GET /api/recherche?titre=` | Films TMDB ; sans titre, les films populaires |
| `GET /api/soirees` | Les soirées et leurs membres |
| `POST /api/soirees` | Créer une soirée : `{ nom, date, membres }`, 2 à 4 prénoms |
| `GET /api/soirees/:id` | La soirée, ses membres, ses films et ses votes |
| `PUT /api/soirees/:id` | Modifier une soirée ; un membre retiré perd ses votes |
| `POST /api/soirees/:id/films` | Ajouter un film : `{ filmId }`, lu sur TMDB par le serveur |
| `DELETE /api/soirees/:id/films/:filmId` | Retirer un film et ses votes |
| `PUT /api/soirees/:id/films/:filmId/vote` | Voter : `{ prenom, choix }`, choix `oui`, `non` ou `vu` |

## La page

- `src/App.tsx` : le guichet. La soirée, la liasse de tickets classés, les onglets « Qui tamponne ? » et les tampons de vote.
- `src/types.ts` : les types et le classement : `oui` vaut +1, `non` −1, `vu` 0 ; à égalité, l'identifiant du film départage.
- `src/Ticket.tsx`, `src/Programme.tsx`, `src/OuvertureSeance.tsx`, `src/Affiche.tsx` : un ticket, le catalogue, le formulaire de soirée, une affiche.
- Le prénom choisi est gardé dans le navigateur (`localStorage`), une clé par soirée.

## Le reste

- `.gitignore` : `node_modules`, `dist`, `.env` et les bases `*.db` ne partent jamais sur GitHub.
- Node 22.18 ou plus lance les fichiers `.ts` du serveur sans autre outil.
