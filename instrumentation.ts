/**
 * Next.js Instrumentation — runs once when the server starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Used here to start the automatic hourly database backup.
 */

export async function register() {
  // Only run in Node.js (not Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoBackup } = await import("./src/lib/backup-service");
    startAutoBackup();
  }
}
