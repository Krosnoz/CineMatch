import { test, expect } from '@playwright/test';
import { creerSeance, films, ouvrir, votesDe } from './outils';

test('créer une séance, se présenter, ajouter un film puis annuler', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouvelle séance' }).click();
  await page.locator('#nom-seance').fill('Soirée créée');
  await page.locator('#date-seance').fill('2026-12-24');
  await page.getByLabel('Prénom du participant 1').fill('Alex');
  await page.getByLabel('Prénom du participant 2').fill('Sam');
  await page.getByRole('button', { name: 'Ouvrir la séance' }).click();
  await expect(page.locator('.seance h1')).toHaveText('Soirée créée');
  await expect(page).toHaveURL(/#\/seance\/\d+$/);
  await page.locator('.qui').getByRole('button', { name: /Alex/ }).click();
  await expect(page.locator('.toi b')).toHaveText('Alex');
  await page.getByRole('button', { name: /^Ajouter .* à la séance$/ }).first().click();
  await expect(page.locator('.toast')).toContainText('ajouté');
  await expect(page.locator('.ticket')).toHaveCount(1);
  await page.locator('.toast').getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('.liasse-vide')).toBeVisible();
});

test('voter avec les boutons et le clavier, puis retrouver les votes après rechargement', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.locator('.vote-bar').getByRole('button', { name: 'Partant' }).click();
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).length).toBe(1);
  await page.keyboard.press('n');
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).length).toBe(2);
  await page.keyboard.press('v');
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => v.choix).sort()).toEqual(['non', 'oui', 'vu']);
  await page.reload();
  await expect(page.locator('.membre-p.moi')).toContainText('3/3');
});

test('au clavier, la pile tourne en boucle et permet de changer d’avis', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  const consigne = page.locator('.consigne-tour');
  await expect(consigne).toContainText('« Dune »');
  await page.keyboard.press('ArrowLeft');
  await expect(consigne).toContainText('« Inception »');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('o');
  await page.keyboard.press('o');
  await page.keyboard.press('o');
  await expect(consigne).toContainText('Tout est tamponné');
  await expect(consigne).toContainText('« Dune »');
  await page.keyboard.press('n');
  await expect(consigne).toContainText('« Dune : Deuxième partie »');
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => `${v.filmId}:${v.choix}`).sort()).toEqual(
    [`${films.dune}:non`, `${films.dune2}:oui`, `${films.inception}:oui`].sort(),
  );
});

test('changer d’avis sur un film choisi dans la liasse', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: /^Dune, / }).click();
  await page.locator('.vote-bar').getByRole('button', { name: 'Partant' }).click();
  await page.getByRole('button', { name: /^Dune, / }).click();
  await page.locator('.vote-bar').getByRole('button', { name: 'Déjà vu' }).click();
  await expect.poll(async () => (await votesDe(request, id, 'Alex')).map((v) => `${v.filmId}:${v.choix}`)).toEqual([`${films.dune}:vu`]);
});

test('le lien partagé ouvre la séance et demande qui on est', async ({ browser, request }) => {
  const id = await creerSeance(request);
  const ami = await browser.newPage();
  await ami.goto(`/#/seance/${id}`);
  await expect(ami.locator('.seance h1')).toHaveText('Séance E2E');
  await expect(ami.getByRole('heading', { name: 'Qui es-tu ?' })).toBeVisible();
  await expect(ami.getByLabel('Choisir une séance')).toHaveValue(String(id));
  await ami.close();
});

test('retirer un membre retire aussi ses avis', async ({ page, request }) => {
  const id = await creerSeance(request);
  await request.put(`/api/soirees/${id}/films/${films.dune}/vote`, { data: { prenom: 'Lou', choix: 'oui' } });
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: 'MODIFIER' }).click();
  await page.getByRole('button', { name: 'Retirer Lou' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('.membre-p', { hasText: 'LOU' })).toHaveCount(0);
  expect(await votesDe(request, id, 'Lou')).toEqual([]);
});

test('retirer un film depuis le programme', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: 'En lice · 3' }).click();
  await page.getByRole('button', { name: 'Retirer Dune de la séance' }).click();
  await expect(page.locator('.toast')).toContainText('retiré');
  await expect(page.locator('.ticket')).toHaveCount(2);
  expect((await (await request.get(`/api/soirees/${id}`)).json()).films).toHaveLength(2);
});

test('le vote d’un ami apparaît sans recharger', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await request.put(`/api/soirees/${id}/films/${films.dune}/vote`, { data: { prenom: 'Sam', choix: 'oui' } });
  await expect(page.locator('.membre-p', { hasText: 'SAM' })).toContainText('1/3', { timeout: 15000 });
});

test('la révélation s’affiche quand tout le monde a voté, une seule fois', async ({ page, request }) => {
  const id = await creerSeance(request, ['Alex', 'Sam'], [films.dune]);
  await request.put(`/api/soirees/${id}/films/${films.dune}/vote`, { data: { prenom: 'Sam', choix: 'oui' } });
  await ouvrir(page, id, 'Alex');
  await page.locator('.vote-bar').getByRole('button', { name: 'Partant' }).click();
  const revelation = page.getByRole('dialog', { name: /Séance retenue/ });
  await expect(revelation).toBeVisible();
  await revelation.getByRole('button', { name: 'Fermer' }).click();
  await expect(revelation).toBeHidden();
  await page.reload();
  await expect(page.locator('.seance h1')).toHaveText('Séance E2E');
  await expect(revelation).toBeHidden();
});

test('un vote refusé par le serveur est retiré et expliqué', async ({ page, request }) => {
  const id = await creerSeance(request, ['Alex', 'Sam'], [films.dune]);
  await ouvrir(page, id, 'Alex');
  await request.delete(`/api/soirees/${id}/films/${films.dune}`);
  await page.locator('.vote-bar').getByRole('button', { name: 'Partant' }).click();
  await expect(page.getByRole('alert')).toContainText('n’est pas parti');
  await expect(page.locator('.vote-bar').getByRole('button', { name: 'Partant' })).toHaveAttribute('aria-pressed', 'false');
});

test('chercher un film dans le programme puis revenir aux populaires', async ({ page, request }) => {
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByLabel('Rechercher un film').fill('inception');
  await page.locator('.recherche').getByRole('button', { name: 'Chercher' }).click();
  await expect(page.locator('.ligne').first()).toContainText(/inception/i);
  await expect(page.getByRole('button', { name: '« inception »' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Populaires' }).click();
  await expect(page.getByRole('button', { name: 'Populaires' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Rechercher un film')).toHaveValue('');
});

test('tablette : le programme s’ouvre en tiroir et se ferme avec Échap', async ({ page, request }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  const id = await creerSeance(request);
  await ouvrir(page, id, 'Alex');
  await page.getByRole('button', { name: 'Programme', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-vue', 'programme');
  await expect(page.locator('.programme')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('main')).toHaveAttribute('data-vue', 'seance');
});
