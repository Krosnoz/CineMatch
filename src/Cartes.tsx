import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { verdicts, type Choix, type Classe, type Vote } from './types';
import { Affiche } from './Affiche';

const seuil = 90;
const papiers = ['var(--canari)', 'var(--rose)', 'var(--menthe)', 'var(--lilas)'];
const libelle = (choix: Choix) => verdicts.find((v) => v.choix === choix)?.libelle;
const sens = (x: number, y: number): Choix | null => (x > seuil ? 'oui' : x < -seuil ? 'non' : y < -seuil ? 'vu' : null);

export function Cartes({
  films,
  film,
  suivant,
  rang,
  avis,
  moi,
  votes,
  papier,
  onVoter,
  onChoisir,
}: {
  films: Classe[];
  film?: Classe;
  suivant?: Classe;
  rang: number;
  avis?: Choix;
  moi: string;
  votes: Vote[];
  papier: (id: number) => number;
  onVoter: (choix: Choix) => void;
  onChoisir: (id: number) => void;
}) {
  const depart = useRef<{ x: number; y: number } | null>(null);
  const [d, setD] = useState({ x: 0, y: 0 });
  const [envol, setEnvol] = useState<{ x: number; y: number; choix: Choix } | null>(null);
  const seuilAtteint = useRef<Choix | null>(null);
  const carte = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = carte.current;
    if (!element) return;
    const bloquer = (e: TouchEvent) => e.preventDefault();
    element.addEventListener('touchmove', bloquer, { passive: false });
    return () => element.removeEventListener('touchmove', bloquer);
  }, [film?.id]);
  if (!film) return <p className="cartes-vide">Aucun film en lice. Ajoute-en depuis le programme.</p>;

  const fait = (id: number) => votes.some((v) => v.filmId === id && v.prenom === moi);
  const marque = envol?.choix ?? sens(d.x, d.y) ?? avis;
  const glisse = d.x !== 0 || d.y !== 0;
  const restants = films.filter((f) => !fait(f.id)).length;
  const position = films.findIndex((f) => f.id === film.id) + 1;

  function lacher(e: PointerEvent<HTMLDivElement>, compte: boolean) {
    const debut = depart.current;
    depart.current = null;
    seuilAtteint.current = null;
    const dx = debut ? e.clientX - debut.x : 0;
    const dy = debut ? e.clientY - debut.y : 0;
    const choix = compte ? sens(dx, dy) : null;
    if (!choix) {
      setD({ x: 0, y: 0 });
      return;
    }
    setEnvol({ x: choix === 'vu' ? dx : Math.sign(dx) * 700, y: choix === 'vu' ? -900 : dy - 160, choix });
    setTimeout(() => {
      setEnvol(null);
      setD({ x: 0, y: 0 });
      onVoter(choix);
    }, 280);
  }

  return (
    <div className="cartes">
      <div className="cartes-haut">
        <span>
          FILM {position}/{films.length} · {restants ? `${restants} À TAMPONNER` : 'TOUT EST TAMPONNÉ'}
        </span>
        <span className="points">
          {films.map((f) => (
            <button key={f.id} aria-label={f.titre} className={`${fait(f.id) ? 'fait' : ''}${f.id === film.id ? ' ici' : ''}`} onClick={() => onChoisir(f.id)} />
          ))}
        </span>
      </div>
      <div className="pile">
        {suivant && suivant.id !== film.id && (
          <div className="carte dessous" key={`dessous-${suivant.id}`} style={{ '--stock': papiers[papier(suivant.id) % 4] } as CSSProperties}>
            <Affiche film={suivant} />
          </div>
        )}
        <div
          className="carte"
          key={film.id}
          ref={carte}
          style={{
            '--stock': papiers[papier(film.id) % 4],
            transform: envol
              ? `translate(${envol.x}px, ${envol.y}px) rotate(${envol.x / 12}deg)`
              : `translate(${d.x}px, ${Math.min(d.y, 0)}px) rotate(${d.x / 14}deg)`,
            transition: envol ? 'transform .3s cubic-bezier(.5, 0, .8, .6), opacity .3s' : glisse ? 'none' : undefined,
            opacity: envol ? 0 : undefined,
          } as CSSProperties}
          onPointerDown={(e) => {
            if (envol) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            depart.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const debut = depart.current;
            if (!debut) return;
            const x = e.clientX - debut.x;
            const y = e.clientY - debut.y;
            const choix = sens(x, y);
            if (choix && choix !== seuilAtteint.current) navigator.vibrate?.(10);
            seuilAtteint.current = choix;
            setD({ x, y });
          }}
          onPointerUp={(e) => lacher(e, true)}
          onPointerCancel={(e) => lacher(e, false)}
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
