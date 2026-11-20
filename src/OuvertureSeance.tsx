import { useState } from 'react';
import type { Soiree } from './types';

export function OuvertureSeance({
  seance,
  busy,
  peutAnnuler,
  onOuvrir,
  onAnnuler,
}: {
  seance?: Soiree;
  busy: boolean;
  peutAnnuler: boolean;
  onOuvrir: (nom: string, date: string, membres: string[]) => void;
  onAnnuler: () => void;
}) {
  const [nom, setNom] = useState(seance?.nom ?? '');
  const [date, setDate] = useState(seance?.date ?? '');
  const [membres, setMembres] = useState(seance?.membres ?? ['', '']);
  return (
    <form
      className="ouverture"
      onSubmit={(e) => {
        e.preventDefault();
        onOuvrir(nom, date, membres);
      }}
    >
      <h2>{seance ? 'Modifier la séance' : 'Ouvrir une séance'}</h2>
      <label htmlFor="nom-seance">NOM DE LA SÉANCE</label>
      <input id="nom-seance" autoFocus required maxLength={80} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Vendredi entre amis" />
      <label htmlFor="date-seance">DATE</label>
      <input id="date-seance" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      <fieldset className="membres-saisie">
        <legend>PARTICIPANTS, DE 2 À 4</legend>
        {membres.map((m, i) => (
          <div className="membre" key={i}>
            <input
              aria-label={`Prénom du participant ${i + 1}`}
              required
              maxLength={20}
              value={m}
              onChange={(e) => setMembres(membres.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="Prénom"
            />
            <button
              type="button"
              aria-label={`Retirer ${m || `le participant ${i + 1}`}`}
              disabled={membres.length <= 2}
              onClick={() => setMembres(membres.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {membres.length < 4 && (
          <button type="button" className="ajouter-membre" onClick={() => setMembres([...membres, ''])}>
            + Ajouter une personne
          </button>
        )}
        {seance && <p>Retirer une personne retire aussi ses avis.</p>}
      </fieldset>
      <div className="actions">
        <button type="submit" disabled={busy}>
          {seance ? 'Enregistrer' : 'Ouvrir la séance'}
        </button>
        {peutAnnuler && (
          <button type="button" className="annuler" onClick={onAnnuler}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
