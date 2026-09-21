// Bound the startup read burst while preserving the result order and all pages.
export async function readBatch(tasks, concurrency = 3) {
  const results = new Array(tasks.length);
  let next = 0, failed = false;
  await Promise.all(Array.from({length: Math.min(concurrency, tasks.length)}, async () => {
    while (!failed && next < tasks.length) {
      const index = next++;
      try { results[index] = await tasks[index](); }
      catch (error) { failed = true; throw error; }
    }
  }));
  return results;
}
