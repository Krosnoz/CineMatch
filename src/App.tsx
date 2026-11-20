import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { api } from './api';
import { classer, type Choix, type Detail, type Film, type Soiree } from './types';
import { Ticket } from './Ticket';
import { Programme } from './Programme';
import { OuvertureSeance } from './OuvertureSeance';

const verdicts: { choix: Choix; libelle: string }[] = [
  { choix: 'oui', libelle: 'Partant' },
  { choix: 'non', libelle: 'Pas pour moi' },
  { choix: 'vu', libelle: 'Déjà vu' },
];

const heure = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const enFrancais = (date: string) =>
  new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const cle = (id: number) => `cinematch-moi-${id}`;

export function App() {
  const [catalogue, setCatalogue] = useState<Film[] | null>(null);
  const [soirees, setSoirees] = useState<Soiree[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [ouverture, setOuverture] = useState<false | 'nouvelle' | 'modifier'>(false);
  const [participant, setParticipant] = useState('');
  const [choisi, setChoisi] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [horloge, setHorloge] = useState(heure);

  const classement = useMemo(() => (detail ? classer(detail.films, detail.votes) : []), [detail]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error && !(e instanceof TypeError) ? e.message : 'Connexion impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }
  async function chercher(titre: string) {
    setCatalogue(null);
    setCatalogue(await api<Film[]>('/recherche?titre=' + encodeURIComponent(titre)));
  }
  async function chargerSeances() {
    const rows = await api<Soiree[]>('/soirees');
    setSoirees(rows);
    return rows;
  }
  async function ouvrir(id: number) {
    const d = await api<Detail>(`/soirees/${id}`);
    const garde = localStorage.getItem(cle(id));
    setDetail(d);
    setParticipant(garde && d.membres.includes(garde) ? garde : d.membres[0]);
  }
  async function demarrer() {
    const rows = await chargerSeances();
    const affichee = rows.find((r) => r.id === detail?.id);
    if (rows.length) await ouvrir(affichee?.id ?? Math.max(...rows.map((r) => r.id)));
    else {
      setDetail(null);
      setOuverture('nouvelle');
    }
    await chercher('');
  }

  useEffect(() => {
    void run(demarrer);
  }, []);
  useEffect(() => {
    const minuterie = setInterval(() => setHorloge(heure()), 30000);
    return () => clearInterval(minuterie);
  }, []);

  const aVote = (filmId: number) => detail?.votes.some((v) => v.filmId === filmId && v.prenom === participant);
  const filmAuGuichet = classement.find((f) => f.id === choisi) ?? classement.find((f) => !aVote(f.id)) ?? classement[0];
  const avisCourant = detail?.votes.find((v) => v.filmId === filmAuGuichet?.id && v.prenom === participant)?.choix;

  const tousLesAvis = classement.length > 0 && classement.every((f) => f.nombre === detail?.membres.length);
  const enTete = classement.length === 1 || (classement.length > 1 && classement[0].score > classement[1].score);
  const tampon = !enTete || classement[0].score <= 0 ? null : tousLesAvis ? 'Séance retenue' : 'En tête';

  function choisirParticipant(prenom: string) {
    if (detail) localStorage.setItem(cle(detail.id), prenom);
    setParticipant(prenom);
    setChoisi(null);
  }
  function voter(choix: Choix) {
    if (!detail || !filmAuGuichet) return;
    const film = filmAuGuichet;
    void run(async () => {
      await api(`/soirees/${detail.id}/films/${film.id}/vote`, 'PUT', { prenom: participant, choix });
      await ouvrir(detail.id);
      setChoisi(null);
    });
  }
  function ajouter(filmId: number) {
    if (!detail) return;
    void run(async () => {
      await api(`/soirees/${detail.id}/films`, 'POST', { filmId });
      await ouvrir(detail.id);
    });
  }
  function retirer(filmId: number) {
    if (!detail) return;
    void run(async () => {
      await api(`/soirees/${detail.id}/films/${filmId}`, 'DELETE');
      await ouvrir(detail.id);
      if (choisi === filmId) setChoisi(null);
    });
  }
  function ouvrirSeance(nom: string, date: string, membres: string[]) {
    const modifiee = ouverture === 'modifier' && detail;
    void run(async () => {
      const row = await api<Soiree>(modifiee ? `/soirees/${modifiee.id}` : '/soirees', modifiee ? 'PUT' : 'POST', { nom, date, membres });
      await chargerSeances();
      await ouvrir(row.id);
      setOuverture(false);
      setChoisi(null);
    });
  }
  function changerSeance(id: number) {
    if (!id) return;
    void run(async () => {
      await ouvrir(id);
      setOuverture(false);
      setChoisi(null);
    });
  }

  const numero = detail ? String(detail.id).padStart(4, '0') : '';
  const papier = (id: number) => Math.max(0, detail?.films.findIndex((f) => f.id === id) ?? 0);

  return (
    <>
      <svg className="filtres" aria-hidden="true">
        <filter id="encre">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
      </svg>

      <header className="guichet">
        <a className="marque" href="#seance">
          Ciné<span>Match</span>
        </a>
        <nav className="nav" aria-label="Sections">
          <a href="#seance">La séance</a>
          <a href="#programme">Programme</a>
        </nav>
        <div className="choix-seance">
          <select aria-label="Choisir une séance" value={detail?.id ?? ''} disabled={busy || soirees.length === 0} onChange={(e) => changerSeance(Number(e.target.value))}>
            {soirees.length === 0 && <option value="">Aucune séance</option>}
            {soirees.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
          <button className="nouvelle" onClick={() => setOuverture('nouvelle')}>
            Nouvelle séance
          </button>
        </div>
        <div className="etat">GUICHET OUVERT · {horloge}</div>
      </header>

      <main>
        <section className="seance" id="seance" aria-label="La séance">
          {error && (
            <div role="alert" className="alerte">
              {error}
              <button onClick={() => void run(demarrer)}>Réessayer</button>
            </div>
          )}
          {ouverture || !detail ? (
            <OuvertureSeance
              key={ouverture || 'nouvelle'}
              seance={ouverture === 'modifier' && detail ? detail : undefined}
              busy={busy}
              peutAnnuler={!!detail}
              onOuvrir={ouvrirSeance}
              onAnnuler={() => setOuverture(false)}
            />
          ) : (
            <>
              <p className="seance-meta">
                SÉANCE N° {numero} · {enFrancais(detail.date).toUpperCase()} · {detail.films.length} FILM
                {detail.films.length > 1 ? 'S' : ''} EN LICE
              </p>
              <h1>{detail.nom}</h1>
              <p className="membres">
                {detail.membres.map((m) => (
                  <span key={m}>
                    <b>{m}</b>
                  </span>
                ))}
                <button onClick={() => setOuverture('modifier')}>Modifier</button>
              </p>
              {classement.length === 0 ? (
                <div className="liasse-vide">
                  <strong>Aucun film en lice</strong>
                  Ajoutez des films depuis le programme : chacun deviendra un ticket à tamponner.
                </div>
              ) : (
                <div className="liasse" style={{ '--n': classement.length } as CSSProperties}>
                  {[...classement].reverse().map((film, position) => (
                    <Ticket
                      key={film.id}
                      film={film}
                      rang={classement.length - position}
                      position={position}
                      total={classement.length}
                      papier={papier(film.id)}
                      membres={detail.membres}
                      votes={detail.votes}
                      seance={numero}
                      auGuichet={film.id === filmAuGuichet?.id}
                      tampon={position === classement.length - 1 ? tampon : null}
                      onChoisir={() => setChoisi(film.id)}
                    />
                  ))}
                </div>
              )}
              <div className="tour">
                <div className="onglets" role="group" aria-label="Qui tamponne ?">
                  {detail.membres.map((m, i) => (
                    <button key={m} className={`onglet m${i + 1}`} aria-pressed={participant === m} onClick={() => choisirParticipant(m)}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="tampons" role="group" aria-label={filmAuGuichet ? `Avis de ${participant} sur ${filmAuGuichet.titre}` : 'Aucun film à tamponner'}>
                  {verdicts.map((v) => (
                    <button key={v.choix} className="tampon-btn" aria-pressed={avisCourant === v.choix} disabled={busy || !filmAuGuichet} onClick={() => voter(v.choix)}>
                      {v.libelle}
                    </button>
                  ))}
                </div>
                {filmAuGuichet && (
                  <p className="consigne-tour">
                    <b>{participant}</b> tamponne « {filmAuGuichet.titre} »
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <Programme
          films={catalogue}
          enLice={detail?.films.map((f) => f.id) ?? []}
          peutModifier={!!detail && !ouverture}
          busy={busy}
          onChercher={(titre) => void run(() => chercher(titre))}
          onAjouter={ajouter}
          onRetirer={retirer}
        />
      </main>
    </>
  );
}
