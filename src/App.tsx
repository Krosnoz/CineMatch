import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { api } from './api';
import { classer, verdicts, type Choix, type Detail, type Film, type Soiree, type Vote } from './types';
import { Ticket } from './Ticket';
import { Programme } from './Programme';
import { OuvertureSeance } from './OuvertureSeance';
import { QuiEsTu } from './QuiEsTu';
import { Cartes } from './Cartes';
import { Revelation } from './Revelation';

type Vue = 'seance' | 'voter' | 'programme';
type Toast = { texte: string; annuler?: () => void };

const heure = (t: number) => new Date(t).toLocaleTimeString('fr-FR');
const enFrancais = (date: string) =>
  new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const court = (date: string) =>
  new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const cle = (id: number) => `cinematch-moi-${id}`;
const idDuHash = () => Number(location.hash.match(/^#\/seance\/(\d+)$/)?.[1]) || null;
const message = (e: unknown) => (e instanceof Error && !(e instanceof TypeError) ? e.message : 'Connexion impossible. Réessayez.');
const revelees = (): number[] => JSON.parse(localStorage.getItem('cinematch-revelees') ?? '[]');
const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function App() {
  const [catalogue, setCatalogue] = useState<Film[] | null>(null);
  const [soirees, setSoirees] = useState<Soiree[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pret, setPret] = useState(false);
  const [ouverture, setOuverture] = useState<false | 'nouvelle' | 'modifier'>(false);
  const [moi, setMoi] = useState<string | null>(null);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [maj, setMaj] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [vue, setVue] = useState<Vue>('seance');
  const [tout, setTout] = useState(false);
  const [vues, setVues] = useState(revelees);
  const votesEnvoyes = useRef(0);

  const classement = useMemo(() => (detail ? classer(detail.films, detail.votes) : []), [detail]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(message(e));
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
  function montrer(d: Detail) {
    const garde = localStorage.getItem(cle(d.id));
    setDetail(d);
    setMoi(garde && d.membres.includes(garde) ? garde : null);
    setMaj(Date.now());
  }
  async function ouvrir(id: number) {
    const d = await api<Detail>(`/soirees/${id}`);
    history.replaceState(null, '', `#/seance/${id}`);
    if (detail && detail.id !== d.id && document.startViewTransition) document.startViewTransition(() => flushSync(() => montrer(d)));
    else montrer(d);
  }
  async function demarrer() {
    try {
      const rows = await chargerSeances();
      const voulu = idDuHash() ?? detail?.id;
      const trouvee = rows.some((r) => r.id === voulu);
      const id = trouvee ? (voulu as number) : rows.length ? Math.max(...rows.map((r) => r.id)) : null;
      if (idDuHash() && !trouvee) setToast({ texte: 'Cette séance n’existe plus : voici la dernière ouverte' });
      if (id) await ouvrir(id);
      else {
        setDetail(null);
        setOuverture('nouvelle');
      }
    } finally {
      setPret(true);
    }
    await chercher('');
  }

  useEffect(() => {
    void run(demarrer);
  }, []);

  useEffect(() => {
    if (!detail || ouverture) return;
    const id = detail.id;
    let actif = true;
    const rafraichir = async () => {
      if (document.visibilityState !== 'visible') return;
      const avant = votesEnvoyes.current;
      const d = await api<Detail>(`/soirees/${id}`).catch(() => null);
      if (actif && d && avant === votesEnvoyes.current) montrer(d);
    };
    const minuterie = setInterval(rafraichir, 10000);
    document.addEventListener('visibilitychange', rafraichir);
    return () => {
      actif = false;
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', rafraichir);
    };
  }, [detail?.id, ouverture]);

  useEffect(() => {
    if (!toast) return;
    const minuterie = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(minuterie);
  }, [toast]);

  const aVote = (filmId: number) => detail?.votes.some((v) => v.filmId === filmId && v.prenom === moi);
  const filmAuGuichet = classement.find((f) => f.id === choisi) ?? classement.find((f) => !aVote(f.id)) ?? classement[0];
  const avisCourant = detail?.votes.find((v) => v.filmId === filmAuGuichet?.id && v.prenom === moi)?.choix;
  const restants = moi ? classement.filter((f) => !aVote(f.id)).length : 0;

  const tousLesAvis = classement.length > 0 && classement.every((f) => f.nombre === detail?.membres.length);
  const enTete = classement.length === 1 || (classement.length > 1 && classement[0].score > classement[1].score);
  const tampon = !enTete || classement[0].score <= 0 ? null : tousLesAvis ? 'Séance retenue' : 'En tête';
  const gagnant = detail && !ouverture && tampon === 'Séance retenue' && !vues.includes(detail.id) ? classement[0] : null;

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gagnant) fermerRevelation();
        else if (ouverture && detail) setOuverture(false);
        else setVue('seance');
      }
      if (ouverture || gagnant || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      const verdict = verdicts.find((v) => v.touche === e.key.toLowerCase());
      if (verdict) voter(verdict.choix);
      const pas = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (pas && filmAuGuichet) {
        const i = classement.findIndex((f) => f.id === filmAuGuichet.id);
        setChoisi(classement[(i + pas + classement.length) % classement.length].id);
      }
    };
    const suivre = () => {
      const id = idDuHash();
      if (id && id !== detail?.id) changerSeance(id);
    };
    window.addEventListener('keydown', touche);
    window.addEventListener('hashchange', suivre);
    return () => {
      window.removeEventListener('keydown', touche);
      window.removeEventListener('hashchange', suivre);
    };
  });

  function fermerRevelation() {
    if (!detail) return;
    const ids = [...vues, detail.id];
    localStorage.setItem('cinematch-revelees', JSON.stringify(ids));
    setVues(ids);
  }
  function choisirMoi(prenom: string | null) {
    if (!detail) return;
    if (prenom) localStorage.setItem(cle(detail.id), prenom);
    else localStorage.removeItem(cle(detail.id));
    setMoi(prenom);
    setChoisi(null);
  }
  function voter(choix: Choix) {
    if (!detail || !filmAuGuichet || !moi) return;
    const film = filmAuGuichet;
    const autres = (v: Vote) => !(v.filmId === film.id && v.prenom === moi);
    const ancien = detail.votes.filter((v) => !autres(v));
    setDetail((d) => d && { ...d, votes: [...d.votes.filter(autres), { filmId: film.id, prenom: moi, choix }] });
    setChoisi(null);
    votesEnvoyes.current += 1;
    api(`/soirees/${detail.id}/films/${film.id}/vote`, 'PUT', { prenom: moi, choix }).catch((e) => {
      setDetail((d) => d && { ...d, votes: [...d.votes.filter(autres), ...ancien] });
      setError(`Ton tampon sur « ${film.titre} » n’est pas parti. ${message(e)}`);
    });
  }
  function ajouter(film: Film) {
    if (!detail) return;
    const id = detail.id;
    void run(async () => {
      await api(`/soirees/${id}/films`, 'POST', { filmId: film.id });
      await ouvrir(id);
      setToast({ texte: `${film.titre} ajouté`, annuler: () => retirer(film) });
      if (vue === 'programme' && matchMedia('(min-width: 700px)').matches) setVue('seance');
    });
  }
  function retirer(film: Film) {
    if (!detail) return;
    const id = detail.id;
    void run(async () => {
      await api(`/soirees/${id}/films/${film.id}`, 'DELETE');
      await ouvrir(id);
      if (choisi === film.id) setChoisi(null);
      setToast({ texte: `${film.titre} retiré, avec ses avis` });
    });
  }
  async function partager() {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: detail?.nom, url: location.href }).catch(() => null);
    else
      await navigator.clipboard.writeText(location.href).then(
        () => setToast({ texte: 'Lien copié : envoie-le au groupe' }),
        () => setToast({ texte: `Le lien : ${location.href}` }),
      );
  }
  function ouvrirSeance(nom: string, date: string, membres: string[]) {
    const modifiee = ouverture === 'modifier' && detail;
    void run(async () => {
      const row = await api<Soiree>(modifiee ? `/soirees/${modifiee.id}` : '/soirees', modifiee ? 'PUT' : 'POST', { nom, date, membres });
      await chargerSeances();
      await ouvrir(row.id);
      setOuverture(false);
      setChoisi(null);
      setVue('seance');
    });
  }
  function changerSeance(id: number) {
    if (!id) return;
    void run(async () => {
      await ouvrir(id);
      setOuverture(false);
      setChoisi(null);
      setTout(false);
    });
  }
  function ouvrirFormulaire(mode: 'nouvelle' | 'modifier') {
    setOuverture(mode);
    setVue('seance');
  }
  function choisirFilm(id: number) {
    setChoisi(id);
    if (matchMedia('(max-width: 699px)').matches) setVue('voter');
  }

  const numero = detail ? String(detail.id).padStart(4, '0') : '';
  const papier = (id: number) => Math.max(0, detail?.films.findIndex((f) => f.id === id) ?? 0);
  const visibles = tout ? classement : classement.slice(0, 5);
  const boutonLien = (
    <button className="partager" disabled={!detail || busy} onClick={() => void run(partager)}>
      Copier le lien
    </button>
  );

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
        <div className="choix-seance">
          <select aria-label="Choisir une séance" value={detail?.id ?? ''} disabled={busy || soirees.length === 0} onChange={(e) => changerSeance(Number(e.target.value))}>
            {soirees.length === 0 && <option value="">Aucune séance</option>}
            {soirees.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom} · {court(s.date)}
              </option>
            ))}
          </select>
          {boutonLien}
          <button className="nouvelle" onClick={() => ouvrirFormulaire('nouvelle')}>
            Nouvelle séance
          </button>
          <button className="nouvelle tiroir" aria-pressed={vue === 'programme'} onClick={() => setVue(vue === 'programme' ? 'seance' : 'programme')}>
            Programme
          </button>
        </div>
        <div className={`etat${maj ? ' direct' : ''}`}>{maj ? `EN DIRECT · ${heure(maj)}` : 'GUICHET OUVERT'}</div>
      </header>

      {error && (
        <div role="alert" className="alerte">
          {error}
          <button onClick={() => void run(demarrer)}>Réessayer</button>
        </div>
      )}
      <main data-vue={vue}>
        <section className="seance" id="seance" aria-label="La séance">
          {!pret ? (
            <div className="squelettes liasse-attente" aria-label="Chargement de la séance">
              <span />
              <span />
              <span />
            </div>
          ) : ouverture || !detail ? (
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
                SÉANCE N° {numero} · {enFrancais(detail.date).toUpperCase()}
                {detail.date < aujourdhui() && ' · PASSÉE'} · {detail.films.length} FILM{detail.films.length > 1 ? 'S' : ''} EN LICE
              </p>
              <h1>{detail.nom}</h1>
              <div className="progres">
                {detail.membres.map((m, i) => {
                  const n = detail.votes.filter((v) => v.prenom === m).length;
                  const fini = detail.films.length > 0 && n === detail.films.length;
                  return (
                    <span key={m} className={`membre-p${fini ? ' fini' : ''}${n === 0 ? ' attente' : ''}${m === moi ? ' moi' : ''}`}>
                      <b className={`p${i + 1}`}>{m[0]}</b>
                      {m.toUpperCase()} {detail.films.length > 0 && (n === 0 ? '· EN ATTENTE' : `${n}/${detail.films.length}`)}
                      {fini && ' ✓'}
                    </span>
                  );
                })}
                <button className="membre-p modifier" onClick={() => ouvrirFormulaire('modifier')}>
                  MODIFIER
                </button>
              </div>
              {!moi ? (
                <QuiEsTu membres={detail.membres} votes={detail.votes} films={detail.films.length} onChoisir={choisirMoi} />
              ) : (
                <>
                  <div className="vote-bar">
                    <div className="toi">
                      TU ES<b>{moi}</b>
                      <button onClick={() => choisirMoi(null)}>ce n’est pas moi</button>
                    </div>
                    <div className="tampons" role="group" aria-label={filmAuGuichet ? `Ton avis sur ${filmAuGuichet.titre}` : 'Aucun film à tamponner'}>
                      {verdicts.map((v) => (
                        <button key={v.choix} className="tampon-btn" aria-pressed={avisCourant === v.choix} disabled={!filmAuGuichet} onClick={() => voter(v.choix)}>
                          {v.libelle}
                        </button>
                      ))}
                    </div>
                    <div className="kbd" aria-hidden="true">
                      <kbd>O</kbd>
                      <kbd>N</kbd>
                      <kbd>V</kbd>
                      <kbd>←</kbd>
                      <kbd>→</kbd>
                    </div>
                    {filmAuGuichet && (
                      <p className="consigne-tour">
                        {restants ? `Encore ${restants} à tamponner · ` : 'Tout est tamponné · '}« {filmAuGuichet.titre} » au guichet
                      </p>
                    )}
                  </div>
                  {classement.length === 0 ? (
                    <div className="liasse-vide">
                      <strong>Aucun film en lice</strong>
                      <ol className="etapes">
                        <li className="ok">Ouvrir la séance</li>
                        <li>
                          Proposer 2 ou 3 films du{' '}
                          <button className="lien" onClick={() => setVue('programme')}>
                            programme
                          </button>
                        </li>
                        <li>Envoyer le lien au groupe</li>
                      </ol>
                      {boutonLien}
                    </div>
                  ) : (
                    <div className="liasse" style={{ '--n': visibles.length } as CSSProperties}>
                      {[...visibles].reverse().map((film, position) => (
                        <Ticket
                          key={film.id}
                          film={film}
                          rang={visibles.length - position}
                          position={position}
                          total={visibles.length}
                          papier={papier(film.id)}
                          membres={detail.membres}
                          votes={detail.votes}
                          seance={numero}
                          auGuichet={film.id === filmAuGuichet?.id}
                          tampon={position === visibles.length - 1 ? tampon : null}
                          onChoisir={() => choisirFilm(film.id)}
                        />
                      ))}
                    </div>
                  )}
                  {classement.length > 5 && (
                    <button className="plus" onClick={() => setTout(!tout)}>
                      {tout ? 'Replier la liasse' : classement.length === 6 ? '+ 1 autre film' : `+ ${classement.length - 5} autres films`}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>

        <section className="cartes-vue" aria-label="Voter">
          {detail &&
            !ouverture &&
            (moi ? (
              <Cartes
                classement={classement}
                film={filmAuGuichet}
                avis={avisCourant}
                moi={moi}
                votes={detail.votes}
                papier={papier}
                onVoter={voter}
                onChoisir={setChoisi}
              />
            ) : (
              <QuiEsTu membres={detail.membres} votes={detail.votes} films={detail.films.length} onChoisir={choisirMoi} />
            ))}
        </section>

        <Programme
          films={catalogue}
          enLice={detail?.films ?? []}
          peutModifier={!!detail && !ouverture}
          busy={busy}
          onChercher={(titre) => void run(() => chercher(titre))}
          onAjouter={ajouter}
          onRetirer={retirer}
          onFermer={() => setVue('seance')}
        />
      </main>

      <nav className="onglets-bas" aria-label="Vues">
        <button aria-pressed={vue === 'seance'} onClick={() => setVue('seance')}>
          Séance
        </button>
        <button aria-pressed={vue === 'voter'} onClick={() => setVue('voter')}>
          Voter {restants > 0 && <sup>{restants}</sup>}
        </button>
        <button aria-pressed={vue === 'programme'} onClick={() => setVue('programme')}>
          Programme
        </button>
      </nav>

      {toast && (
        <div className="toast" role="status" key={toast.texte}>
          {toast.texte}
          {toast.annuler && (
            <button
              onClick={() => {
                toast.annuler?.();
                setToast(null);
              }}
            >
              Annuler
            </button>
          )}
        </div>
      )}
      {gagnant && detail && <Revelation film={gagnant} seance={detail} onFermer={fermerRevelation} />}
    </>
  );
}
