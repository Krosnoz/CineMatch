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

- `src/App.tsx` : le guichet. L'adresse `#/seance/12` ouvre une séance et se partage avec « Copier le lien ».
- « Qui es-tu ? » (`src/QuiEsTu.tsx`) : chacun vote pour soi ; le prénom est gardé dans le navigateur (`localStorage`), une clé par soirée.
- La séance se recharge toutes les 10 s et au retour sur l'onglet ; un tampon s'affiche avant la réponse du serveur, et s'efface s'il est refusé.
- Clavier : `O`, `N`, `V` tamponnent, `←` `→` changent de film.
- Sur mobile, trois vues : Séance, Voter (`src/Cartes.tsx`, une carte à glisser : → partant, ← pas pour moi, ↑ déjà vu) et Programme. Sur tablette, le programme s'ouvre en tiroir.
- Quand tout le monde a voté et qu'un film mène, `src/Revelation.tsx` le montre une fois, avec un fichier `.ics` pour l'agenda.
- `src/types.ts` : les types, les verdicts et le classement : `oui` vaut +1, `non` −1, `vu` 0 ; à égalité, l'identifiant du film départage.
- `src/Ticket.tsx`, `src/Programme.tsx`, `src/OuvertureSeance.tsx`, `src/Affiche.tsx` : un ticket, le catalogue et ses filtres, le formulaire de soirée, une affiche.

## Les tests de bout en bout

- `npm run e2e` : Playwright lance sa propre API sur le port 3100, avec une base jetable `e2e/e2e.db` (jamais Turso), et Vite sur le port 5199, puis rejoue les parcours dans le Chrome du poste.
- `e2e/bureau.spec.ts` : créer, voter aux boutons et au clavier, lien partagé, modifier, retirer, rafraîchissement, révélation, vote refusé, recherche, tiroir tablette.
- `e2e/mobile.spec.ts` : vrais gestes tactiles (glisser vite, glisser peu, vers le haut), boutons ronds, onglets, ajout et modification sur mobile.
- Il faut un `.env` avec `TMDB_TOKEN` : l'ajout de films interroge TMDB.

## Le reste

- `.gitignore` : `node_modules`, `dist`, `.env` et les bases `*.db` ne partent jamais sur GitHub.
- Node 22.18 ou plus lance les fichiers `.ts` du serveur sans autre outil.
