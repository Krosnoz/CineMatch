import type { Classe, Soiree } from './types';
import { Affiche } from './Affiche';

export function Revelation({ film, seance, onFermer }: { film: Classe; seance: Soiree; onFermer: () => void }) {
  const jour = new Date(seance.date + 'T00:00:00Z');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CineMatch//FR',
    'BEGIN:VEVENT',
    `UID:cinematch-${seance.id}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${seance.date.replaceAll('-', '')}`,
    `SUMMARY:${film.titre} · ${seance.nom}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return (
    <div className="revelation" role="dialog" aria-modal="true" aria-label={`Séance retenue : ${film.titre}`} onClick={onFermer}>
      <div className="revelation-ticket" onClick={(e) => e.stopPropagation()}>
        <Affiche film={film} />
        <div className="revelation-corps">
          <span className="seance-meta">{seance.nom.toUpperCase()}</span>
          <strong>{film.titre}</strong>
          <span>
            {film.annee} · SCORE {film.score > 0 ? `+${film.score}` : film.score}
          </span>
          <div className="revelation-actions">
            <a className="partager" href={'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)} download={`cinematch-${seance.id}.ics`}>
              Ajouter à l’agenda
            </a>
            <button className="annuler-lien" onClick={onFermer} autoFocus>
              Fermer
            </button>
          </div>
        </div>
        <span className="revelation-souche">
          {jour.getUTCDate()}
          <small>{jour.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).toUpperCase()}</small>
        </span>
        <span className="grand-tampon revelation-tampon">
          <span style={{ display: 'block' }}>Séance</span>
          <span style={{ display: 'block' }}>retenue</span>
        </span>
      </div>
    </div>
  );
}
