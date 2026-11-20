export type Film = { id: number; titre: string; annee: string; affiche: string | null };
export type Choix = 'oui' | 'non' | 'vu';
export type Vote = { filmId: number; prenom: string; choix: Choix };
export type Soiree = { id: number; nom: string; date: string; membres: string[] };
export type Detail = Soiree & { films: Film[]; votes: Vote[] };
export type Classe = Film & { score: number; nombre: number };

export const verdicts: { choix: Choix; libelle: string; touche: string; icone: string }[] = [
  { choix: 'oui', libelle: 'Partant', touche: 'o', icone: '✓' },
  { choix: 'non', libelle: 'Pas pour moi', touche: 'n', icone: '✕' },
  { choix: 'vu', libelle: 'Déjà vu', touche: 'v', icone: '◎' },
];

const points: Record<Choix, number> = { oui: 1, non: -1, vu: 0 };

export function classer(films: Film[], votes: Vote[]): Classe[] {
  return films
    .map((film) => {
      const avis = votes.filter((v) => v.filmId === film.id);
      return { ...film, score: avis.reduce((somme, v) => somme + points[v.choix], 0), nombre: avis.length };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id);
}
