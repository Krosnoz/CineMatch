// Corrigé — CinéMatch, TD 17 : chercher un film. La page demande /api/recherche à ton serveur, jamais TMDB.
import { useState, type FormEvent } from 'react';

type Film = { id: number; titre: string; annee: string; affiche: string | null };

export function Recherche() {
  const [titre, setTitre] = useState('');
  const [films, setFilms] = useState<Film[] | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function chercher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch('/api/recherche?titre=' + encodeURIComponent(titre));
      const data = await reponse.json();
      if (!reponse.ok) {
        // 400 ou 502 : le serveur explique, dans data.error.
        setErreur(data.error);
        setFilms(null);
        return;
      }
      setFilms(data);
    } catch {
      setErreur('Le serveur ne répond pas. Est-il lancé (npm run server) ?');
    } finally {
      setChargement(false);
    }
  }

  return (
    <section>
      <h2>Chercher un film</h2>
      <form className="inline-form" onSubmit={chercher}>
        <input aria-label="Titre du film" placeholder="Un titre, par exemple dune" value={titre} onChange={(e) => setTitre(e.target.value)} />
        <button disabled={chargement}>{chargement ? 'Recherche…' : 'Chercher'}</button>
      </form>
      {erreur && <p className="error">{erreur}</p>}
      {films && films.length === 0 && <p>Aucun film trouvé.</p>}
      {films && films.length > 0 && (
        <div className="catalog">
          {films.map((film) => (
            <article className="movie" key={film.id}>
              {film.affiche ? (
                <img className="poster-image" src={`https://image.tmdb.org/t/p/w342${film.affiche}`} alt={`Affiche de ${film.titre}`} />
              ) : (
                <div className={`poster tone-${film.id % 6}`}>
                  <span>Sans affiche</span>
                  <strong>{film.titre}</strong>
                  <span>{film.annee}</span>
                </div>
              )}
              <h3>{film.titre}</h3>
              <p className="year">{film.annee || 'Année inconnue'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
