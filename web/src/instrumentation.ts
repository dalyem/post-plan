/**
 * Next.js runs this once at server startup. We import the db singleton inside the
 * nodejs-runtime guard, which opens the connection and runs migrations before any
 * request is served (avoiding a cold-start race between concurrent first requests).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/db');
  }
}
