import { useState, type CSSProperties } from 'react';
import { verdicts, type Choix, type Classe, type Vote } from './types';
import { Affiche } from './Affiche';

const seuil = 90;
const papiers = ['var(--canari)', 'var(--rose)', 'var(--menthe)', 'var(--lilas)'];
const libelle = (choix: Choix) => verdicts.find((v) => v.choix === choix)?.libelle;

export function Cartes({
  classement,
  film,
  avis,
  moi,
  votes,
  papier,
  onVoter,
  onChoisir,
}: {
  classement: Classe[];
  film?: Classe;
  avis?: Choix;
  moi: string;
  votes: Vote[];
  papier: (id: number) => number;
  onVoter: (choix: Choix) => void;
  onChoisir: (id: number) => void;
}) {
  const [depart, setDepart] = useState<{ x: number; y: number } | null>(null);
  const [d, setD] = useState({ x: 0, y: 0 });
  if (!film) return <p className="cartes-vide">Aucun film en lice. Ajoute-en depuis le programme.</p>;

  const fait = (id: number) => votes.some((v) => v.filmId === id && v.prenom === moi);
  const direction: Choix | null = d.x > seuil ? 'oui' : d.x < -seuil ? 'non' : d.y < -seuil ? 'vu' : null;
  const marque = direction ?? avis;
  const restants = classement.filter((f) => !fait(f.id)).length;
  const suivant = classement.find((f) => f.id !== film.id && !fait(f.id));
  const rang = classement.findIndex((f) => f.id === film.id) + 1;

  function lacher() {
    if (direction) onVoter(direction);
    setDepart(null);
    setD({ x: 0, y: 0 });
  }

  return (
    <div className="cartes">
      <div className="cartes-haut">
        <span>{restants ? `${restants} À TAMPONNER` : 'TOUT EST TAMPONNÉ'}</span>
        <span className="points">
          {classement.map((f) => (
            <button key={f.id} aria-label={f.titre} className={`${fait(f.id) ? 'fait' : ''}${f.id === film.id ? ' ici' : ''}`} onClick={() => onChoisir(f.id)} />
          ))}
        </span>
      </div>
      <div className="pile">
        {suivant && (
          <div className="carte dessous" key={`dessous-${suivant.id}`} style={{ '--stock': papiers[papier(suivant.id) % 4] } as CSSProperties}>
            <Affiche film={suivant} />
          </div>
        )}
        <div
          className="carte"
          key={film.id}
          style={{
            '--stock': papiers[papier(film.id) % 4],
            transform: `translate(${d.x}px, ${Math.min(d.y, 0)}px) rotate(${d.x / 18}deg)`,
            transition: depart ? 'none' : undefined,
          } as CSSProperties}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDepart({ x: e.clientX, y: e.clientY });
          }}
          onPointerMove={(e) => depart && setD({ x: e.clientX - depart.x, y: e.clientY - depart.y })}
          onPointerUp={lacher}
          onPointerCancel={lacher}
        >
          <Affiche film={film} />
          <div className="carte-corps">
            <span>{rang === 1 ? '1ER' : `${rang}E`} · {film.annee} · SCORE {film.score > 0 ? `+${film.score}` : film.score}</span>
            <b>{film.titre}</b>
            <span>{film.nombre} AVIS · TON AVIS : {avis ? libelle(avis)?.toUpperCase() : 'AUCUN'}</span>
          </div>
          {marque && (
            <span className={`tampon-carte ${marque}`} key={marque}>
              {libelle(marque)}
            </span>
          )}
        </div>
      </div>
      <div className="ronds">
        {verdicts.map((v) => (
          <button key={v.choix} aria-pressed={avis === v.choix} onClick={() => onVoter(v.choix)}>
            <b>{v.icone}</b>
            {v.libelle}
          </button>
        ))}
      </div>
      <p className="geste">← pas pour moi · ↑ déjà vu · partant →</p>
    </div>
  );
}
