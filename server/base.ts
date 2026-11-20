// Corrigé — CinéMatch, TD 18 et 20 : la base, en SQLite.
// Sur ton poste : un fichier (server/cinematch.db, hors de Git).
// En ligne : la même base chez Turso. Son adresse et son jeton sont dans les réglages du projet Vercel.
import { createClient } from '@libsql/client';

// || et pas ?? : une ligne « TURSO_DATABASE_URL= » vide dans .env donne un texte vide, pas undefined.
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:server/cinematch.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Une soirée a 2 à 4 membres : deux tables, reliées par soiree_id.
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS soirees (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    date TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS membres (
    id INTEGER PRIMARY KEY,
    soiree_id INTEGER NOT NULL REFERENCES soirees(id) ON DELETE CASCADE,
    prenom TEXT NOT NULL,
    UNIQUE (soiree_id, prenom)
  );
`);
