/**
 * Serialize work that uses a persistent browser context.
 *
 * Promise handlers receive the previous promise's value as an argument. The
 * queue deliberately invokes the task with no arguments so a prior status
 * object can never be mistaken for a profile id.
 */
export function serializeBrowserWork(task, session) {
  if (!session || !session.browserWorkQueue) {
    throw new TypeError("A browser session with browserWorkQueue is required");
  }
  const work = session.browserWorkQueue.then(() => task(), () => task());
  session.browserWorkQueue = work.catch(() => {});
  return work;
}
