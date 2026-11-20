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
  onFermer,
}: {
  films: Film[] | null;
  enLice: Film[];
  peutModifier: boolean;
  busy: boolean;
  onChercher: (titre: string) => void;
  onAjouter: (film: Film) => void;
  onRetirer: (film: Film) => void;
  onFermer: () => void;
}) {
  const [titre, setTitre] = useState('');
  const [cherche, setCherche] = useState('');
  const [filtre, setFiltre] = useState<'catalogue' | 'lice'>('catalogue');
  const liste = filtre === 'lice' ? enLice : films;
  const ids = enLice.map((f) => f.id);

  function lancer(texte: string) {
    setCherche(texte.trim());
    setFiltre('catalogue');
    onChercher(texte);
  }

  return (
    <aside className="programme" id="programme" aria-labelledby="titre-programme">
      <div className="programme-tete">
        <h2 id="titre-programme">Au programme</h2>
        <button className="fermer-tiroir" onClick={onFermer} aria-label="Fermer le programme">
          ✕
        </button>
      </div>
      <p className="sous">{films ? `${films.length} FILM${films.length > 1 ? 'S' : ''} · CATALOGUE TMDB` : 'CATALOGUE TMDB'}</p>
      <form
        className="recherche"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          lancer(titre);
        }}
      >
        <input aria-label="Rechercher un film" placeholder="Un titre, une envie…" value={titre} maxLength={100} onChange={(e) => setTitre(e.target.value)} />
        <button disabled={busy}>Chercher</button>
      </form>
      <div className="puces-filtre">
        <button
          aria-pressed={filtre === 'catalogue' && !cherche}
          onClick={() => {
            setTitre('');
            if (cherche) lancer('');
            else setFiltre('catalogue');
          }}
        >
          Populaires
        </button>
        {cherche && (
          <button aria-pressed={filtre === 'catalogue'} onClick={() => setFiltre('catalogue')}>
            « {cherche} »
          </button>
        )}
        <button aria-pressed={filtre === 'lice'} onClick={() => setFiltre('lice')}>
          En lice · {enLice.length}
        </button>
      </div>
      {!liste ? (
        busy ? (
          <div className="squelettes" aria-label="Chargement du programme">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : (
          <p className="programme-etat">Le programme n’a pas pu être chargé.</p>
        )
      ) : liste.length === 0 ? (
        <p className="programme-etat">{filtre === 'lice' ? 'Aucun film en lice pour l’instant.' : `Aucun film pour « ${cherche} ». Essayez un autre titre.`}</p>
      ) : (
        liste.map((f) => (
          <div className="ligne" key={f.id}>
            <Affiche film={f} />
            <div>
              <strong>{f.titre}</strong>
              <em>
                {f.annee}
                {ids.includes(f.id) && ' · en lice'}
              </em>
            </div>
            {ids.includes(f.id) ? (
              <button className="ajout retirer" disabled={busy || !peutModifier} onClick={() => onRetirer(f)} aria-label={`Retirer ${f.titre} de la séance`}>
                Retirer
              </button>
            ) : (
              <button className="ajout" disabled={busy || !peutModifier} onClick={() => onAjouter(f)} aria-label={`Ajouter ${f.titre} à la séance`}>
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
