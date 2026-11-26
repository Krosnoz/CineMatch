import type { CSSProperties } from 'react';

const poussieres = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 10 + ((i * 53) % 80),
  dx: ((i * 29) % 60) - 30,
  dy: -20 - ((i * 41) % 70),
  retard: (i % 6) * 0.12,
}));

export function Rideau({ leve }: { leve: boolean }) {
  return (
    <div className={`rideau-scene${leve ? ' leve' : ''}`} aria-hidden="true">
      <div className="faisceau" />
      {poussieres.map((p, i) => (
        <span key={i} className="poussiere" style={{ left: `${p.left}%`, top: `${p.top}%`, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.retard}s` } as CSSProperties} />
      ))}
      <div className="lambrequin" />
      <div className="rideau g" />
      <div className="rideau d" />
    </div>
  );
}
