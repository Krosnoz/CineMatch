import { useState } from 'react';
import type { Film } from './types';
import { Affiche } from './Affiche';

export function Programme({
  films,
  enLice,
  peutModifier,
  busy,
  onChercher,
  onAjouter,
  onRetirer,
}: {
  films: Film[] | null;
  enLice: number[];
  peutModifier: boolean;
  busy: boolean;
  onChercher: (titre: string) => void;
  onAjouter: (filmId: number) => void;
  onRetirer: (filmId: number) => void;
}) {
  const [titre, setTitre] = useState('');
  const [cherche, setCherche] = useState('');
  return (
    <aside className="programme" id="programme" aria-labelledby="titre-programme">
      <h2 id="titre-programme">Au programme</h2>
      <p className="sous">
        {films ? `${films.length} FILM${films.length > 1 ? 'S' : ''} · CATALOGUE TMDB` : 'CATALOGUE TMDB'}
      </p>
      <form
        className="recherche"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setCherche(titre.trim());
          onChercher(titre);
        }}
      >
        <input aria-label="Rechercher un film" placeholder="Un titre, une envie…" value={titre} maxLength={100} onChange={(e) => setTitre(e.target.value)} />
        <button disabled={busy}>Chercher</button>
      </form>
      {!films ? (
        <p className="programme-etat">{busy ? 'Chargement du programme…' : 'Le programme n’a pas pu être chargé.'}</p>
      ) : films.length === 0 ? (
        <p className="programme-etat">Aucun film pour « {cherche} ». Essayez un autre titre.</p>
      ) : (
        films.map((f) => (
          <div className="ligne" key={f.id}>
            <Affiche film={f} />
            <div>
              <strong>{f.titre}</strong>
              <em>{f.annee}</em>
            </div>
            {enLice.includes(f.id) ? (
              <button className="ajout retirer" disabled={busy || !peutModifier} onClick={() => onRetirer(f.id)} aria-label={`Retirer ${f.titre} de la séance`}>
                Retirer
              </button>
            ) : (
              <button className="ajout" disabled={busy || !peutModifier} onClick={() => onAjouter(f.id)} aria-label={`Ajouter ${f.titre} à la séance`}>
                + Séance
              </button>
            )}
          </div>
        ))
      )}
      <p className="demo">
        Films et affiches : <a href="https://www.themoviedb.org">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </aside>
  );
}
