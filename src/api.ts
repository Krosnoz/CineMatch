export async function api<T>(chemin: string, method = 'GET', corps?: unknown): Promise<T> {
  const reponse = await fetch('/api' + chemin, {
    method,
    headers: corps === undefined ? {} : { 'Content-Type': 'application/json' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  if (!reponse.ok) {
    const probleme = await reponse.json().catch(() => ({}));
    throw new Error(probleme.error ?? `Le serveur a répondu ${reponse.status}. Est-il lancé (npm run server) ?`);
  }
  return reponse.status === 204 ? (undefined as T) : reponse.json();
}
