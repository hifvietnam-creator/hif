/**
 * Postgres access for the analytics schemas (pco, ml, hif).
 *
 * Separate from Payload's own connection on purpose. Payload owns `public`
 * and manages it through its adapter; these schemas are ours and are written
 * only by sync jobs, in bulk, with plain SQL. Going through Payload's ORM for
 * that would mean one round-trip per row.
 *
 * Used by both entry points — the local backfill scripts and the Payload cron
 * jobs — so the sync logic exists in exactly one place.
 */

import pg from 'pg'

let pool: pg.Pool | null = null

/** Lazily-created shared pool. Safe to call repeatedly. */
export function getPool(): pg.Pool {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('[db] DATABASE_URL is not set')

  pool = new pg.Pool({
    connectionString,
    max: 5,
    // Neon terminates idle connections; keep the pool modest and let it recycle.
    idleTimeoutMillis: 30_000,
  })

  pool.on('error', (err) => console.error('[db] idle client error:', err.message))
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// ── Bulk upsert ──────────────────────────────────────────────────────────────

/**
 * Upsert many rows in one statement.
 *
 * Builds a single multi-row INSERT ... ON CONFLICT DO UPDATE. Syncing 6,800
 * people becomes ~7 statements instead of 6,800 round-trips, which matters a
 * lot over a network connection to Neon.
 *
 * @param table       Schema-qualified, e.g. 'pco.people'
 * @param columns     Column names, in the same order as each row's values
 * @param rows        Array of value arrays
 * @param conflictKey Column(s) forming the conflict target, usually ['id']
 * @param chunkSize   Rows per statement. Postgres caps parameters at 65535,
 *                    so this must stay under 65535 / columns.length.
 */
export async function upsert(
  client: pg.PoolClient | pg.Pool,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictKey: string[] = ['id'],
  chunkSize = 500,
): Promise<number> {
  if (rows.length === 0) return 0

  const maxRows = Math.floor(65000 / columns.length)
  const effectiveChunk = Math.min(chunkSize, maxRows)

  // Every column except the conflict key gets overwritten on conflict.
  const updates = columns
    .filter((c) => !conflictKey.includes(c))
    .map((c) => `"${c}" = excluded."${c}"`)
    .join(', ')

  let written = 0

  for (let i = 0; i < rows.length; i += effectiveChunk) {
    const chunk = rows.slice(i, i + effectiveChunk)
    const params: unknown[] = []
    const tuples: string[] = []

    for (const row of chunk) {
      const placeholders = row.map((value) => {
        params.push(value)
        return `$${params.length}`
      })
      tuples.push(`(${placeholders.join(', ')})`)
    }

    const sql =
      `insert into ${table} (${columns.map((c) => `"${c}"`).join(', ')}) ` +
      `values ${tuples.join(', ')} ` +
      `on conflict (${conflictKey.map((c) => `"${c}"`).join(', ')}) ` +
      (updates ? `do update set ${updates}` : 'do nothing')

    const res = await client.query(sql, params)
    written += res.rowCount ?? 0
  }

  return written
}

// ── Sync bookkeeping ─────────────────────────────────────────────────────────

export type SyncResult = {
  recordsSeen: number
  watermark?: Date | string | null
}

/** Last successful watermark for a resource, or null if never synced. */
export async function getWatermark(resource: string): Promise<string | null> {
  const { rows } = await getPool().query<{ last_watermark: Date | null }>(
    'select last_watermark from hif.sync_state where resource = $1',
    [resource],
  )
  const value = rows[0]?.last_watermark
  return value ? new Date(value).toISOString() : null
}

/**
 * Wrap a sync in bookkeeping: marks it running, records duration and outcome,
 * and persists the new watermark only on success.
 *
 * A failed sync leaves the previous watermark intact, so the next run retries
 * the same window rather than skipping past whatever it missed.
 */
export async function withSyncState(
  resource: string,
  fn: () => Promise<SyncResult>,
): Promise<SyncResult> {
  const db = getPool()
  const startedAt = Date.now()

  await db.query(
    `insert into hif.sync_state (resource, last_run_at, last_run_status, updated_at)
     values ($1, now(), 'running', now())
     on conflict (resource) do update
       set last_run_at = now(), last_run_status = 'running', updated_at = now()`,
    [resource],
  )

  try {
    const result = await fn()

    await db.query(
      `update hif.sync_state
          set last_run_status = 'ok',
              last_error      = null,
              records_seen    = $2,
              duration_ms     = $3,
              last_watermark  = coalesce($4::timestamptz, last_watermark),
              updated_at      = now()
        where resource = $1`,
      [resource, result.recordsSeen, Date.now() - startedAt, result.watermark ?? null],
    )

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await db.query(
      `update hif.sync_state
          set last_run_status = 'error',
              last_error      = $2,
              duration_ms     = $3,
              updated_at      = now()
        where resource = $1`,
      [resource, message.slice(0, 2000), Date.now() - startedAt],
    )

    throw err
  }
}

// ── Small helpers ────────────────────────────────────────────────────────────

/** PCO sends '' and absent alike; both should be null in the database. */
export const nullIfEmpty = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Parse an ISO timestamp defensively — bad values become null, not exceptions. */
export const toDate = (v: unknown): Date | null => {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

/** Track the highest updated_at seen, for the next incremental run. */
export function maxWatermark(current: string | null, candidate: unknown): string | null {
  const d = toDate(candidate)
  if (!d) return current
  const iso = d.toISOString()
  return !current || iso > current ? iso : current
}
