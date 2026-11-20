// Corrigé — CinéMatch, TD 18 : créer une soirée (POST /api/soirees), puis lister les soirées (GET /api/soirees).
// TD 22 : le nom d'une soirée ouvre sa page (onOuvrir).
import { useEffect, useState, type FormEvent } from 'react';

type Soiree = { id: number; nom: string; date: string; membres: string[] };

const enFrancais = (date: string) =>
  new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// TD 22 : un clic sur une soirée ouvre sa page (onOuvrir).
export function Soirees({ onOuvrir }: { onOuvrir: (id: number) => void }) {
  const [soirees, setSoirees] = useState<Soiree[]>([]);
  const [nom, setNom] = useState('');
  const [date, setDate] = useState('');
  const [membres, setMembres] = useState(['', '', '', '']);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      try {
        const reponse = await fetch('/api/soirees');
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        setSoirees(await reponse.json());
      } catch {
        setErreur('Le serveur ne répond pas. Est-il lancé (npm run server) ?');
      }
    }
    charger();
  }, []);

  async function creer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await fetch('/api/soirees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Les cases laissées vides ne sont pas des membres.
        body: JSON.stringify({ nom, date, membres: membres.filter((m) => m.trim() !== '') }),
      });
      const data = await reponse.json();
      if (!reponse.ok) {
        setErreur(data.error);
        return;
      }
      setSoirees((avant) => [...avant, data].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id));
      setNom('');
      setDate('');
      setMembres(['', '', '', '']);
    } catch {
      setErreur('Le serveur ne répond pas. Est-il lancé (npm run server) ?');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section>
      <h2>Créer une soirée</h2>
      <form onSubmit={creer}>
        <label htmlFor="nom">Nom de la soirée</label>
        <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Vendredi Dune" />
        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label>Membres : 2 à 4 prénoms</label>
        <div className="inline-form">
          {membres.map((m, i) => (
            <input key={i} aria-label={`Membre ${i + 1}`} value={m} onChange={(e) => setMembres(membres.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
        </div>
        <button disabled={envoi}>{envoi ? 'Création…' : 'Créer la soirée'}</button>
      </form>
      {erreur && <p className="error">{erreur}</p>}
      <h2>Les soirées</h2>
      {soirees.length === 0 && <p>Aucune soirée pour l’instant.</p>}
      <ul className="soirees">
        {soirees.map((s) => (
          <li key={s.id}>
            <button className="text-button" onClick={() => onOuvrir(s.id)}><strong>{s.nom}</strong></button> · {enFrancais(s.date)}
            <br />
            <span className="hint">{s.membres.join(', ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
