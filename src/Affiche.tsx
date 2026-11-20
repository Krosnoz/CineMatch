import type { Film } from './types';

export function Affiche({ film }: { film: Film }) {
  if (film.affiche)
    return (
      <span className="affiche">
        <img src={`https://image.tmdb.org/t/p/w342${film.affiche}`} alt={`Affiche de ${film.titre}`} loading="lazy" />
      </span>
    );
  return (
    <span className="affiche" role="img" aria-label={`Affiche de ${film.titre} à venir`}>
      AFFICHE
    </span>
  );
}
