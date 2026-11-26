import express from 'express';
import { db } from './base.ts';

const app = express();
app.use(express.json());

app.get('/api/sante', (_req, res) => {
  res.json({
    serveur: 'ok',
    jetonTmdb: process.env.TMDB_TOKEN ? 'présent' : 'absent',
    base: process.env.TURSO_DATABASE_URL ? 'Turso' : 'fichier local',
  });
});

type FilmTmdb = { id: number; title: string; release_date?: string; poster_path: string | null };

const versFilm = (f: FilmTmdb) => ({
  id: f.id,
  titre: f.title,
  annee: (f.release_date ?? '').slice(0, 4),
  affiche: f.poster_path,
});

async function tmdb(chemin: string) {
  const reponse = await fetch('https://api.themoviedb.org/3' + chemin, {
    headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
  });
  if (reponse.status === 404) return null;
  if (!reponse.ok) throw new Error(`TMDB a répondu ${reponse.status}`);
  return reponse.json();
}

app.get('/api/recherche', async (req, res) => {
  const titre = String(req.query.titre ?? '').trim();
  const chemin = titre === ''
    ? '/movie/popular?language=fr-FR'
    : '/search/movie?language=fr-FR&query=' + encodeURIComponent(titre);
  try {
    const data = (await tmdb(chemin)) as { results: FilmTmdb[] };
    res.json(data.results.map(versFilm));
  } catch (erreur) {
    console.error(erreur);
    res.status(502).json({ error: 'TMDB ne répond pas. Réessaie.' });
  }
});

const choix = ['oui', 'non', 'vu'];

function entier(texte: string) {
  const n = Number(texte);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function dateValide(texte: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texte)) return false;
  const d = new Date(texte + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texte;
}

function lireSoiree(corps: { nom?: unknown; date?: unknown; membres?: unknown } | undefined) {
  const nom = String(corps?.nom ?? '').trim();
  const date = String(corps?.date ?? '');
  if (nom === '') return { erreur: 'Donne un nom à la soirée.' };
  if (!dateValide(date)) return { erreur: 'La date doit être une vraie date, au format AAAA-MM-JJ.' };
  if (!Array.isArray(corps?.membres)) return { erreur: 'Les membres doivent être une liste de prénoms.' };
  const membres = corps.membres.map((m) => String(m ?? '').trim());
  if (membres.length < 2 || membres.length > 4) return { erreur: 'Une soirée a 2 à 4 membres.' };
  if (membres.includes('')) return { erreur: 'Chaque membre a un prénom.' };
  if (new Set(membres.map((m) => m.toLowerCase())).size !== membres.length) return { erreur: 'Deux membres ont le même prénom.' };
  return { nom, date, membres };
}

async function detail(id: number) {
  const soiree = (await db.execute({ sql: 'SELECT id, nom, date FROM soirees WHERE id = ?', args: [id] })).rows[0];
  if (!soiree) return null;
  const membres = (await db.execute({ sql: 'SELECT prenom FROM membres WHERE soiree_id = ? ORDER BY id', args: [id] })).rows;
  const films = (await db.execute({ sql: 'SELECT film_id, titre, annee, affiche FROM films WHERE soiree_id = ? ORDER BY rowid', args: [id] })).rows;
  const votes = (await db.execute({ sql: 'SELECT film_id, prenom, choix FROM votes WHERE soiree_id = ?', args: [id] })).rows;
  return {
    id: Number(soiree.id),
    nom: String(soiree.nom),
    date: String(soiree.date),
    membres: membres.map((m) => String(m.prenom)),
    films: films.map((f) => ({ id: Number(f.film_id), titre: f.titre, annee: f.annee, affiche: f.affiche })),
    votes: votes.map((v) => ({ filmId: Number(v.film_id), prenom: v.prenom, choix: v.choix })),
  };
}

app.get('/api/soirees', async (_req, res) => {
  const soirees = (await db.execute('SELECT id, nom, date FROM soirees ORDER BY date, id')).rows;
  const membres = (await db.execute('SELECT soiree_id, prenom FROM membres ORDER BY id')).rows;
  res.json(soirees.map((s) => ({ id: Number(s.id), nom: s.nom, date: s.date, membres: membres.filter((m) => m.soiree_id === s.id).map((m) => m.prenom) })));
});

app.get('/api/soirees/:id', async (req, res) => {
  const id = entier(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'L’identifiant d’une soirée est un nombre entier.' });
    return;
  }
  const soiree = await detail(id);
  if (!soiree) {
    res.status(404).json({ error: 'Cette soirée n’existe pas.' });
    return;
  }
  res.json(soiree);
});

app.post('/api/soirees', async (req, res) => {
  const lu = lireSoiree(req.body);
  if ('erreur' in lu) {
    res.status(400).json({ error: lu.erreur });
    return;
  }
  const { nom, date, membres } = lu;
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

app.put('/api/soirees/:id', async (req, res) => {
  const id = entier(req.params.id);
  const lu = lireSoiree(req.body);
  if (id === null || 'erreur' in lu) {
    res.status(400).json({ error: id === null ? 'L’identifiant d’une soirée est un nombre entier.' : lu.erreur });
    return;
  }
  if (!(await detail(id))) {
    res.status(404).json({ error: 'Cette soirée n’existe pas.' });
    return;
  }
  const { nom, date, membres } = lu;
  const restants = membres.map(() => '?').join(', ');
  await db.batch([
    { sql: 'UPDATE soirees SET nom = ?, date = ? WHERE id = ?', args: [nom, date, id] },
    { sql: `DELETE FROM votes WHERE soiree_id = ? AND prenom NOT IN (${restants})`, args: [id, ...membres] },
    { sql: 'DELETE FROM membres WHERE soiree_id = ?', args: [id] },
    ...membres.map((prenom) => ({ sql: 'INSERT INTO membres (soiree_id, prenom) VALUES (?, ?)', args: [id, prenom] })),
  ], 'write');
  res.json({ id, nom, date, membres });
});

app.post('/api/soirees/:id/films', async (req, res) => {
  const id = entier(req.params.id);
  const filmId = entier(String(req.body?.filmId));
  if (id === null || filmId === null) {
    res.status(400).json({ error: 'La soirée et le film sont des nombres entiers.' });
    return;
  }
  if (!(await detail(id))) {
    res.status(404).json({ error: 'Cette soirée n’existe pas.' });
    return;
  }
  try {
    const trouve = (await tmdb(`/movie/${filmId}?language=fr-FR`)) as FilmTmdb | null;
    if (!trouve) {
      res.status(400).json({ error: 'Ce film n’existe pas sur TMDB.' });
      return;
    }
    const film = versFilm(trouve);
    await db.execute({ sql: 'INSERT OR IGNORE INTO films (soiree_id, film_id, titre, annee, affiche) VALUES (?, ?, ?, ?, ?)', args: [id, film.id, film.titre, film.annee, film.affiche] });
    res.status(201).json(film);
  } catch (erreur) {
    console.error(erreur);
    res.status(502).json({ error: 'TMDB ne répond pas. Réessaie.' });
  }
});

app.delete('/api/soirees/:id/films/:filmId', async (req, res) => {
  const id = entier(req.params.id);
  const filmId = entier(req.params.filmId);
  if (id === null || filmId === null) {
    res.status(400).json({ error: 'La soirée et le film sont des nombres entiers.' });
    return;
  }
  const [, retire] = await db.batch([
    { sql: 'DELETE FROM votes WHERE soiree_id = ? AND film_id = ?', args: [id, filmId] },
    { sql: 'DELETE FROM films WHERE soiree_id = ? AND film_id = ?', args: [id, filmId] },
  ], 'write');
  if (retire.rowsAffected === 0) {
    res.status(404).json({ error: 'Ce film n’est pas dans la soirée.' });
    return;
  }
  res.sendStatus(204);
});

app.put('/api/soirees/:id/films/:filmId/vote', async (req, res) => {
  const id = entier(req.params.id);
  const filmId = entier(req.params.filmId);
  const prenom = String(req.body?.prenom ?? '');
  const avis = String(req.body?.choix ?? '');
  if (id === null || filmId === null || !choix.includes(avis)) {
    res.status(400).json({ error: 'Un avis est oui, non ou vu, sur un film de la soirée.' });
    return;
  }
  const soiree = await detail(id);
  if (!soiree?.films.some((f) => f.id === filmId)) {
    res.status(404).json({ error: 'Ce film n’est pas dans la soirée.' });
    return;
  }
  if (!soiree.membres.includes(prenom)) {
    res.status(400).json({ error: 'Ce prénom ne fait pas partie de la soirée.' });
    return;
  }
  await db.execute({
    sql: 'INSERT INTO votes (soiree_id, film_id, prenom, choix) VALUES (?, ?, ?, ?) ON CONFLICT (soiree_id, film_id, prenom) DO UPDATE SET choix = excluded.choix',
    args: [id, filmId, prenom, avis],
  });
  res.json({ filmId, prenom, choix: avis });
});

export default app;
const port = Number(process.env.PORT) || 3000;
if (!process.env.VERCEL) app.listen(port, () => console.log(`CinéMatch : http://localhost:${port}/api/sante`));
