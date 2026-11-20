export type Film = { id: number; titre: string; annee: string; affiche: string | null };
export type Choix = 'oui' | 'non' | 'vu';
export type Vote = { filmId: number; prenom: string; choix: Choix };
export type Soiree = { id: number; nom: string; date: string; membres: string[] };
export type Detail = Soiree & { films: Film[]; votes: Vote[] };

const points: Record<Choix, number> = { oui: 1, non: -1, vu: 0 };

export function classer(films: Film[], votes: Vote[]) {
  return films
    .map((film) => {
      const avis = votes.filter((v) => v.filmId === film.id);
      return { ...film, score: avis.reduce((somme, v) => somme + points[v.choix], 0), nombre: avis.length };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id);
}
