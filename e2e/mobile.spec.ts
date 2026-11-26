import { test, expect, type Page } from '@playwright/test';
import { creerSeance, films, glisser, ouvrir, votesDe } from './outils';

const carte = (page: Page) => page.locator('.carte:not(.dessous)');
const titre = (page: Page) => carte(page).locator('.carte-corps b');

async function allerVoter(page: Page) {
  await page.locator('.onglets-bas').getByRole('button', { name: /Voter/ }).click();
  await expect(carte(page)).toBeVisible();
}

test('glisser à droite enregistre « partant » et passe au film suivant', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await allerVoter(page);
  const premier = await titre(page).textContent();
  await glisser(page, carte(page), 220, 0);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix)).toEqual(['oui']);
  await expect(titre(page)).not.toHaveText(premier ?? '');
});

test('glisser à gauche puis vers le haut enregistre « pas pour moi » et « déjà vu »', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await allerVoter(page);
  await glisser(page, carte(page), -220, 0);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix)).toEqual(['non']);
  await glisser(page, carte(page), 0, -220);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix).sort()).toEqual(['non', 'vu']);
  await glisser(page, carte(page), 220, 0);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).length).toBe(3);
  await expect(page.locator('.cartes-haut')).toContainText('TOUT EST TAMPONNÉ');
});

test('un petit glissement ne vote pas et la carte revient', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await allerVoter(page);
  const premier = await titre(page).textContent();
  await glisser(page, carte(page), 40, 0);
  await page.waitForTimeout(800);
  expect(await votesDe(request, id, 'Alex')).toEqual([]);
  await expect(titre(page)).toHaveText(premier ?? '');
});

test('les boutons ronds votent aussi', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await allerVoter(page);
  await page.locator('.ronds').getByRole('button', { name: /Pas pour moi/ }).click();
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix)).toEqual(['non']);
});

test('les onglets du bas et « Nouvelle séance » depuis le programme', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.locator('.onglets-bas').getByRole('button', { name: 'Programme' }).click();
  await expect(page.locator('.programme')).toBeVisible();
  await expect(page.locator('.seance')).toBeHidden();
  await page.getByRole('button', { name: 'Nouvelle séance' }).click();
  await expect(page.locator('.ouverture')).toBeVisible();
});

test('après avoir tout tamponné, on peut encore changer d’avis en glissant', async ({ page, request }) => {
  const id = await creerSeance(request, ['Alex', 'Sam'], [films.dune]);
  await ouvrir(page, id, 'Alex');
  await allerVoter(page);
  await glisser(page, carte(page), 220, 0);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix)).toEqual(['oui']);
  await glisser(page, carte(page), -220, 0);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix)).toEqual(['non']);
});

test('toucher un ticket ouvre le vote sur ce film', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: /^Inception, / }).tap();
  await expect(page.locator('main')).toHaveAttribute('data-vue', 'voter');
  await expect(titre(page)).toHaveText('Inception');
  await glisser(page, carte(page), 220, 0);
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => `${v.filmId}:${v.choix}`)).toEqual([`${films.inception}:oui`]);
});

test('ajouter un film depuis l’onglet Programme', async ({ page, request }) => {
  const id = await creerSeance(request, ['Alex', 'Sam'], [films.dune]);
  await ouvrir(page, id, 'Alex');
  await page.locator('.onglets-bas').getByRole('button', { name: 'Programme' }).click();
  await page.getByRole('button', { name: /^Ajouter .* à la séance$/ }).first().tap();
  await expect(page.locator('.toast')).toContainText('ajouté');
  await expect.poll(async () => (await (await request.get(`/api/soirees/${id}`)).json()).films.length).toBe(2);
});

test('modifier la séance sur mobile', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: 'MODIFIER' }).tap();
  await page.getByRole('button', { name: '+ Ajouter une personne' }).tap();
  await page.getByLabel('Prénom du participant 4').fill('Zoé');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page.locator('.membre-p', { hasText: 'ZOÉ' })).toBeVisible();
  expect((await (await request.get(`/api/soirees/${id}`)).json()).membres).toEqual(['Alex', 'Sam', 'Lou', 'Zoé']);
});

test('« ce n’est pas moi » ramène à « Qui es-tu ? »', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: 'ce n’est pas moi' }).click();
  await expect(page.getByRole('heading', { name: 'Qui es-tu ?' })).toBeVisible();
});
