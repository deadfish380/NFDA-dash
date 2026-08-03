/**
 * Run `worker` over `items` with at most `limit` in flight at once. Preserves
 * input order in the results. Shared by the site scraper and the page crawler so
 * neither opens an unbounded number of sockets. Never rejects — a worker that
 * throws is the worker's own concern; wrap it if you want soft failures.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });

  await Promise.all(runners);
  return results;
}
