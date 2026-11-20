// Corrigé — CinéMatch, TD 16 à 22 : le serveur, port 3000. Lancement : npm run server.
// Il lit le fichier .env au démarrage : copie d'abord .env.example en .env, puis colle ton jeton TMDB.
// En ligne (TD 21), Vercel lance ce même serveur : les secrets sont dans les réglages du projet Vercel.
import express from 'express';
import { db } from './base.ts';

const app = express();
app.use(express.json());

// TD 16 : le serveur tourne-t-il ? A-t-il lu ton jeton TMDB ? (Il ne l'affiche jamais.)
// TD 20 : quelle base utilise-t-il ? Le fichier du poste, ou la base Turso en ligne ?
app.get('/api/sante', (_req, res) => {
  res.json({
    serveur: 'ok',
    jetonTmdb: process.env.TMDB_TOKEN ? 'présent' : 'absent',
    base: process.env.TURSO_DATABASE_URL ? 'Turso' : 'fichier local',
  });
});

// TD 17 : chercher un film sur TMDB, à travers le serveur. Le jeton ne quitte jamais le serveur.
type FilmTmdb = { id: number; title: string; release_date?: string; poster_path: string | null };

// Des 15 champs d'un film de TMDB, la page n'en garde que 4, à nos noms.
const versFilm = (f: FilmTmdb) => ({
  id: f.id,
  titre: f.title,
  annee: (f.release_date ?? '').slice(0, 4),
  affiche: f.poster_path,
});

app.get('/api/recherche', async (req, res) => {
  const titre = String(req.query.titre ?? '').trim();
  if (titre === '') {
    res.status(400).json({ error: 'Écris un titre.' });
    return;
  }
  const url = 'https://api.themoviedb.org/3/search/movie'
    + '?language=fr-FR&query=' + encodeURIComponent(titre);
  try {
    const reponse = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
    });
    // Jeton faux : TMDB répond 401. fetch ne lève pas d'erreur pour autant : on la lève ici.
    if (!reponse.ok) throw new Error(`TMDB a répondu ${reponse.status}`);
    // Côté serveur, reponse.json() est de type unknown : on dit à TypeScript ce que TMDB renvoie.
    const data = (await reponse.json()) as { results: FilmTmdb[] };
    res.json(data.results.map(versFilm));
  } catch (erreur) {
    // Pour toi, dans le terminal : la vraie raison (TMDB a répondu 401, fetch failed…).
    console.error(erreur);
    // Pour le visiteur : le service d'à côté a échoué.
    res.status(502).json({ error: 'TMDB ne répond pas. Réessaie.' });
  }
});

// TD 18 : créer une soirée, puis la retrouver après un redémarrage.
type Soiree = { id: number; nom: string; date: string; membres: string[] };

// Une vraie date, au format AAAA-MM-JJ : « 2026-02-30 » est refusée.
function dateValide(texte: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texte)) return false;
  const d = new Date(texte + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texte;
}

app.get('/api/soirees', async (_req, res) => {
  const soirees = (await db.execute('SELECT id, nom, date FROM soirees ORDER BY date, id')).rows as unknown as Omit<Soiree, 'membres'>[];
  const membres = (await db.execute('SELECT soiree_id, prenom FROM membres ORDER BY id')).rows as unknown as { soiree_id: number; prenom: string }[];
  res.json(soirees.map((s) => ({ id: s.id, nom: s.nom, date: s.date, membres: membres.filter((m) => m.soiree_id === s.id).map((m) => m.prenom) })));
});

// TD 22 : une soirée seule, avec ses membres. 400 si l'identifiant n'est pas un nombre, 404 si elle n'existe pas.
app.get('/api/soirees/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'L’identifiant d’une soirée est un nombre entier.' });
    return;
  }
  const soiree = (await db.execute({ sql: 'SELECT id, nom, date FROM soirees WHERE id = ?', args: [id] })).rows[0];
  if (!soiree) {
    res.status(404).json({ error: 'Cette soirée n’existe pas.' });
    return;
  }
  const membres = (await db.execute({ sql: 'SELECT prenom FROM membres WHERE soiree_id = ? ORDER BY id', args: [id] })).rows;
  res.json({ id: Number(soiree.id), nom: soiree.nom, date: soiree.date, membres: membres.map((m) => m.prenom) });
});

app.post('/api/soirees', async (req, res) => {
  const nom = String(req.body?.nom ?? '').trim();
  const date = String(req.body?.date ?? '');
  const recus: unknown = req.body?.membres;
  if (nom === '') {
    res.status(400).json({ error: 'Donne un nom à la soirée.' });
    return;
  }
  if (!dateValide(date)) {
    res.status(400).json({ error: 'La date doit être une vraie date, au format AAAA-MM-JJ.' });
    return;
  }
  if (!Array.isArray(recus)) {
    res.status(400).json({ error: 'Les membres doivent être une liste de prénoms.' });
    return;
  }
  const membres = recus.map((m) => String(m ?? '').trim());
  if (membres.length < 2 || membres.length > 4) {
    res.status(400).json({ error: 'Une soirée a 2 à 4 membres.' });
    return;
  }
  if (membres.includes('')) {
    res.status(400).json({ error: 'Chaque membre a un prénom.' });
    return;
  }
  if (new Set(membres.map((m) => m.toLowerCase())).size !== membres.length) {
    res.status(400).json({ error: 'Deux membres ont le même prénom.' });
    return;
  }
  // La soirée et ses membres entrent ensemble, ou pas du tout.
  const tx = await db.transaction('write');
  try {
    const { lastInsertRowid } = await tx.execute({ sql: 'INSERT INTO soirees (nom, date) VALUES (?, ?)', args: [nom, date] });
    for (const prenom of membres) await tx.execute({ sql: 'INSERT INTO membres (soiree_id, prenom) VALUES (?, ?)', args: [lastInsertRowid ?? null, prenom] });
    await tx.commit();
    res.status(201).json({ id: Number(lastInsertRowid), nom, date, membres });
  } catch (erreur) {
    await tx.rollback();
    console.error(erreur);
    res.status(500).json({ error: 'La soirée n’a pas été enregistrée. Réessaie.' });
  }
});

// Sur Vercel, pas de app.listen : Vercel reçoit l'application et la lance lui-même.
export default app;
if (!process.env.VERCEL) app.listen(3000, () => console.log('CinéMatch : http://localhost:3000/api/sante'));
