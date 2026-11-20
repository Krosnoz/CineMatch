// Corrigé — CinéMatch, TD 22 : la page d'une soirée (GET /api/soirees/:id), puis « Qui es-tu ? ».
// Sans compte ni mot de passe : chacun choisit son prénom parmi les membres, et le navigateur s'en souvient pour cette soirée.
import { useEffect, useState } from 'react';

type Soiree = { id: number; nom: string; date: string; membres: string[] };

const enFrancais = (date: string) =>
  new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Une clé par soirée : dans une autre soirée, le navigateur ne te prend pas pour Sam.
const cle = (id: number) => `cinematch-moi-${id}`;

export function SoireePage({ id, onRetour }: { id: number; onRetour: () => void }) {
  const [soiree, setSoiree] = useState<Soiree | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [moi, setMoi] = useState<string | null>(() => localStorage.getItem(cle(id)));

  useEffect(() => {
    async function charger() {
      try {
        const reponse = await fetch(`/api/soirees/${id}`);
        const data = await reponse.json();
        if (!reponse.ok) {
          setErreur(data.error);
          return;
        }
        setSoiree(data);
      } catch {
        setErreur('Le serveur ne répond pas. Est-il lancé (npm run server) ?');
      }
    }
    charger();
  }, [id]);

  function choisir(prenom: string | null) {
    if (prenom === null) localStorage.removeItem(cle(id));
    else localStorage.setItem(cle(id), prenom);
    setMoi(prenom);
  }

  // Un prénom gardé qui n'est plus un membre de la soirée ne compte pas.
  const membre = soiree && moi && soiree.membres.includes(moi) ? moi : null;

  return (
    <section>
      <button className="text-button" onClick={onRetour}>← Toutes les soirées</button>
      {erreur && <p className="error">{erreur}</p>}
      {!soiree && !erreur && <p className="hint">Chargement de la soirée…</p>}
      {soiree && (
        <>
          <h2>{soiree.nom}</h2>
          <p className="hint">{enFrancais(soiree.date)} · {soiree.membres.join(', ')}</p>
          {membre ? (
            <p>
              Tu es <strong>{membre}</strong>.{' '}
              <button className="text-button" onClick={() => choisir(null)}>Ce n’est pas moi</button>
            </p>
          ) : (
            <>
              <h3>Qui es-tu ?</h3>
              <div className="inline-form">
                {soiree.membres.map((m) => (
                  <button key={m} onClick={() => choisir(m)}>{m}</button>
                ))}
              </div>
            </>
          )}
          <h3>Les films proposés</h3>
          <p className="hint">Aucun film proposé pour l’instant.</p>
        </>
      )}
    </section>
  );
}
