import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

export const films = { dune: 438631, dune2: 693134, inception: 27205 };

type Vote = { filmId: number; prenom: string; choix: string };

export async function creerSeance(request: APIRequestContext, membres = ['Alex', 'Sam', 'Lou'], ids = [films.dune, films.dune2, films.inception]) {
  const reponse = await request.post('/api/soirees', { data: { nom: 'Séance E2E', date: '2026-12-31', membres } });
  expect(reponse.status()).toBe(201);
  const { id } = await reponse.json();
  for (const filmId of ids) expect((await request.post(`/api/soirees/${id}/films`, { data: { filmId } })).status()).toBe(201);
  return id as number;
}

export async function votesDe(request: APIRequestContext, id: number, prenom: string): Promise<Vote[]> {
  const detail = await (await request.get(`/api/soirees/${id}`)).json();
  return detail.votes.filter((v: Vote) => v.prenom === prenom);
}

export async function ouvrir(page: Page, id: number, moi?: string) {
  if (moi) await page.addInitScript(([cle, prenom]) => localStorage.setItem(cle, prenom), [`cinematch-moi-${id}`, moi]);
  await page.goto(`/#/seance/${id}`);
  await expect(page.locator('.seance h1')).toHaveText('Séance E2E');
}

export async function glisser(page: Page, cible: Locator, dx: number, dy: number) {
  const boite = await cible.boundingBox();
  if (!boite) throw new Error('Carte introuvable');
  const x = boite.x + boite.width / 2;
  const y = boite.y + boite.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const pas = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * n) / 8, y: y + (dy * n) / 8 }] }));
  await Promise.all([...pas, cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })]);
}
