import type { Vote } from './types';

export function QuiEsTu({ membres, votes, films, onChoisir }: { membres: string[]; votes: Vote[]; films: number; onChoisir: (prenom: string) => void }) {
  return (
    <div className="qui-es-tu">
      <h2>Qui es-tu ?</h2>
      <p>Choisis ton prénom : ce navigateur s’en souviendra pour cette séance.</p>
      <div className="qui">
        {membres.map((m, i) => {
          const n = votes.filter((v) => v.prenom === m).length;
          return (
            <button key={m} className={`p${i + 1}`} onClick={() => onChoisir(m)}>
              <strong>{m}</strong>
              <span>{n === 0 ? 'PAS ENCORE VOTÉ' : `${n}/${films} TAMPONNÉS`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
