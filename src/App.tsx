// Corrigé — CinéMatch : la page. TD 17 : chercher un film. TD 18 : créer une soirée. TD 22 : la page d'une soirée.
import { useState } from 'react';
import { Recherche } from './Recherche';
import { SoireePage } from './Soiree';
import { Soirees } from './Soirees';

export function App() {
  // La soirée ouverte, ou null pour la liste.
  const [ouverte, setOuverte] = useState<number | null>(null);
  return (
    <main>
      <h1>CinéMatch</h1>
      <p className="hint">Ce soir, on regarde quoi ?</p>
      {ouverte === null ? (
        <>
          <Recherche />
          <Soirees onOuvrir={setOuverte} />
        </>
      ) : (
        <SoireePage id={ouverte} onRetour={() => setOuverte(null)} />
      )}
      {/* Les conditions de TMDB demandent cette phrase et son logo (developer.themoviedb.org/docs/faq). */}
      <footer className="hint">
        Films et affiches : <a href="https://www.themoviedb.org">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </main>
  );
}
