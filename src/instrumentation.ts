const BOOT_PRUNE_DELAY_MS = 15_000

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }
  const { nextPruneDelay, pruneExpiredAuditEvents } = await import('./lib/audit-log-retention')
  let firstRun = true

  function schedule(delayMs: number) {
    const timer = setTimeout(() => {
      void pruneNow()
    }, delayMs)
    timer.unref()
  }

  async function pruneNow() {
    try {
      const pruned = await pruneExpiredAuditEvents()
      if (firstRun) {
        firstRun = false
        console.warn('[audit-log] pruned', pruned, 'expired audit events on first run after boot')
      } else {
        console.warn('[audit-log] pruned', pruned, 'expired audit events')
      }
    } catch (error) {
      console.error('[audit-log] failed to prune expired audit events', error)
    }
    schedule(nextPruneDelay(new Date()))
  }

  schedule(BOOT_PRUNE_DELAY_MS)
}
