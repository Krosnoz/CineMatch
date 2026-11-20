import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:server/cinematch.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

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
  CREATE TABLE IF NOT EXISTS films (
    soiree_id INTEGER NOT NULL REFERENCES soirees(id) ON DELETE CASCADE,
    film_id INTEGER NOT NULL,
    titre TEXT NOT NULL,
    annee TEXT NOT NULL,
    affiche TEXT,
    PRIMARY KEY (soiree_id, film_id)
  );
  CREATE TABLE IF NOT EXISTS votes (
    soiree_id INTEGER NOT NULL,
    film_id INTEGER NOT NULL,
    prenom TEXT NOT NULL,
    choix TEXT NOT NULL CHECK (choix IN ('oui', 'non', 'vu')),
    PRIMARY KEY (soiree_id, film_id, prenom)
  );
`);
