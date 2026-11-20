import type { CSSProperties } from 'react';
import type { Choix, Film, Vote } from './types';
import { Affiche } from './Affiche';

const libelles: Record<Choix, string> = { oui: 'partant', non: 'pas pour moi', vu: 'déjà vu' };
const papiers = ['var(--canari)', 'var(--rose)', 'var(--menthe)', 'var(--lilas)'];

export function Ticket({
  film,
  rang,
  position,
  total,
  papier,
  membres,
  votes,
  seance,
  auGuichet,
  tampon,
  onChoisir,
}: {
  film: Film & { score: number; nombre: number };
  rang: number;
  position: number;
  total: number;
  papier: number;
  membres: string[];
  votes: Vote[];
  seance: string;
  auGuichet: boolean;
  tampon: string | null;
  onChoisir: () => void;
}) {
  const devant = position === total - 1;
  const style = {
    '--i': position,
    '--n': total,
    '--rang': rang,
    '--rot': devant ? '-.4deg' : position % 2 === 0 ? '2deg' : '-1.4deg',
    '--stock': papiers[papier % papiers.length],
    '--membres': membres.length,
  } as CSSProperties;
  const rangTexte = rang === 1 ? '1ER' : `${rang}E`;
  return (
    <button
      type="button"
      className={`ticket${rang === 1 ? ' premier' : ''}${auGuichet ? ' au-guichet' : ''}`}
      style={style}
      onClick={onChoisir}
      aria-pressed={auGuichet}
      aria-label={`${film.titre}, ${rangTexte}, score ${film.score}, ${film.nombre} avis sur ${membres.length}`}
    >
      <Affiche film={film} />
      <span className="corps">
        <span className="entete-ticket">
          <span>
            <b className="rang">{rangTexte}</b>
            <span className="long"> · ADMISSION · SÉANCE {seance}</span>
          </span>
          <span>N° {film.id}</span>
        </span>
        <span className="titre-film">{film.titre}</span>
        <span className="infos-film">
          <span>{film.annee}</span>
          <span>
            {film.nombre} avis sur {membres.length}
          </span>
          {auGuichet && <span className="a-tamponner">AU GUICHET</span>}
        </span>
      </span>
      <span className="souche">
        <small>SCORE</small>
        <span className="score">{film.score > 0 ? `+${film.score}` : film.score}</span>
        <span className="avis">
          {membres.map((prenom) => {
            const choix = votes.find((v) => v.filmId === film.id && v.prenom === prenom)?.choix;
            return (
              <span key={`${prenom}-${choix ?? 'aucun'}`} className={choix ?? ''} aria-label={`${prenom} : ${choix ? libelles[choix] : 'pas encore d’avis'}`}>
                {prenom[0]}
              </span>
            );
          })}
        </span>
      </span>
      {tampon && (
        <span className="grand-tampon" key={tampon}>
          {tampon.split(' ').map((mot) => (
            <span key={mot} style={{ display: 'block' }}>
              {mot}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
