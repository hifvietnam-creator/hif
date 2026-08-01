/**
 * MailerLite API client — READ ONLY.
 *
 * MailerLite is an ANALYSIS source for the HIF dashboard, never a campaign
 * management tool. Staff continue to run campaigns in the MailerLite UI; this
 * module only watches.
 *
 * That distinction is load-bearing. The MailerLite API can send campaigns,
 * delete subscribers, and permanently *forget* them (GDPR erasure is
 * irreversible after 30 days). A stray write against a live congregation list
 * cannot be undone. So this module exports `get`, `paginateCursor`,
 * `paginatePage`, and `count` — and no write helper exists to call by mistake.
 *
 * Two API quirks worth knowing before you use this:
 *   - Subscriber endpoints use CURSOR pagination; group and campaign endpoints
 *     use PAGE pagination. Hence two paginate functions.
 *   - `GET /groups/{id}/subscribers` defaults to `filter[status]=active`.
 *     Unsubscribed members are silently omitted unless you ask for them — and
 *     those are exactly the people the dashboard cares about. Always pass the
 *     status explicitly.
 *
 * Docs: https://developers.mailerlite.com/getting-started
 */

const BASE_URL = 'https://connect.mailerlite.com/api'

/**
 * Pin the API version. Without this header every request silently rides
 * "latest", so a breaking change lands unannounced in production.
 * Bump deliberately, after reading the changelog.
 */
const API_VERSION = '2026-07-30'

const RATE_LIMIT_PER_MIN = 120
const MAX_RETRIES = 5
const MAX_RETRY_AFTER_MS = 120_000

/** Max page size for subscriber/group-subscriber sweeps. */
export const MAX_LIMIT = 1000

// ── Types ────────────────────────────────────────────────────────────────────

export type MailerLiteStatus = 'active' | 'unsubscribed' | 'unconfirmed' | 'bounced' | 'junk'

export type MailerLiteSubscriber = {
  id: string
  email: string
  status: MailerLiteStatus
  source: string | null
  /** Lifetime totals — verify windowing before treating these as "recent". */
  sent: number
  opens_count: number
  clicks_count: number
  open_rate: number
  click_rate: number
  ip_address: string | null
  subscribed_at: string | null
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
  fields: Record<string, string | null>
  groups?: MailerLiteGroup[]
  opted_in_at: string | null
  optin_ip: string | null
}

export type MailerLiteGroup = {
  id: string
  name: string
  active_count: number
  sent_count: number
  opens_count: number
  open_rate: { float: number; string: string }
  clicks_count: number
  click_rate: { float: number; string: string }
  unsubscribed_count: number
  unconfirmed_count: number
  bounced_count: number
  junk_count: number
  created_at: string
}

export type MailerLiteCampaign = {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  scheduled_for: string | null
  finished_at: string | null
  emails?: Array<{ id: string; subject: string; from: string; from_name: string }>
  [key: string]: unknown
}

/** Per-subscriber event. One request per subscriber — see the warning on `activityLog`. */
export type MailerLiteActivity = {
  id: string
  log_name: string
  subject_id: string
  subject_type: string
  properties: Record<string, unknown> | unknown[]
  created_at: string
  updated_at: string
}

type CursorPage<T> = {
  data: T[]
  meta: { next_cursor: string | null; prev_cursor: string | null; per_page: number }
}

type NumberedPage<T> = {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

// ── Internals ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Simple client-side pacer. MailerLite's limit is a flat 120 req/min with no
 * "remaining window" header to steer by, so we self-throttle to stay under it
 * rather than discovering the limit by getting 429'd.
 */
let lastRequestAt = 0
const MIN_GAP_MS = Math.ceil(60_000 / RATE_LIMIT_PER_MIN) // 500ms

async function pace(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed)
  lastRequestAt = Date.now()
}

function apiKey(): string {
  const key = process.env.MAILERLITE_API_KEY?.trim()
  if (!key) {
    throw new Error(
      '[MailerLite] MAILERLITE_API_KEY must be set. ' +
        'Generate one at https://dashboard.mailerlite.com/integrations/api',
    )
  }
  return key
}

function buildUrl(path: string, params: Record<string, string | number> = {}): string {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function request(url: string, attempt = 0): Promise<Response> {
  await pace()

  const res = await fetch(url, {
    method: 'GET', // Hard-coded. This client only ever reads.
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Version': API_VERSION,
    },
  })

  // ── Rate limited ──
  if (res.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`[MailerLite] Rate limit: exceeded ${MAX_RETRIES} retries on ${url}`)
    }
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '', 10)
    const waitMs = Math.min(
      (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60) * 1000,
      MAX_RETRY_AFTER_MS,
    )
    console.warn(`[MailerLite] 429 rate limited — waiting ${waitMs}ms then retrying`)
    await sleep(waitMs)
    return request(url, attempt + 1)
  }

  // ── Token revoked ──
  // MailerLite keys are bound to the user who created them: if that user is
  // removed from the account, the key stops working. Fail loudly, not silently.
  if (res.status === 401) {
    throw new Error(
      '[MailerLite] 401 Unauthenticated. The API key is invalid or its owning ' +
        'user was removed from the account. Regenerate under a long-lived admin user.',
    )
  }

  // ── Transient server error ──
  if (res.status >= 500 && attempt < MAX_RETRIES) {
    const waitMs = Math.min(2 ** attempt * 1000, MAX_RETRY_AFTER_MS)
    console.warn(`[MailerLite] ${res.status} on ${url} — retrying in ${waitMs}ms`)
    await sleep(waitMs)
    return request(url, attempt + 1)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `[MailerLite] ${res.status} ${res.statusText} on ${url}${body ? ` — ${body}` : ''}`,
    )
  }

  return res
}

// ── Public API (read-only) ───────────────────────────────────────────────────

/** Fetch a single MailerLite endpoint. */
export async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const res = await request(buildUrl(path, params))
  return (await res.json()) as T
}

/**
 * Walk a CURSOR-paginated endpoint to exhaustion (subscribers, group subscribers).
 *
 * @example
 *   for await (const batch of paginateCursor<MailerLiteSubscriber>('/subscribers')) {
 *     for (const sub of batch) { ... }
 *   }
 */
export async function* paginateCursor<T>(
  path: string,
  params: Record<string, string | number> = {},
  limit: number = MAX_LIMIT,
): AsyncGenerator<T[]> {
  let cursor: string | null = null

  for (;;) {
    const page = (await get<CursorPage<T>>(path, {
      ...params,
      limit,
      ...(cursor ? { cursor } : {}),
    })) as CursorPage<T>

    if (page.data.length > 0) yield page.data

    cursor = page.meta?.next_cursor ?? null
    if (!cursor || page.data.length === 0) return
  }
}

/**
 * Walk a PAGE-paginated endpoint to exhaustion (groups, campaigns).
 */
export async function* paginatePage<T>(
  path: string,
  params: Record<string, string | number> = {},
  limit = 100,
): AsyncGenerator<T[]> {
  let page = 1

  for (;;) {
    const res = (await get<NumberedPage<T>>(path, { ...params, limit, page })) as NumberedPage<T>

    if (res.data.length > 0) yield res.data

    const lastPage = res.meta?.last_page ?? page
    if (page >= lastPage || res.data.length === 0) return
    page += 1
  }
}

/**
 * Total subscriber count. A single cheap request — run this before any full
 * sweep to size the job.
 */
export async function count(): Promise<number> {
  const res = await get<{ total: number }>('/subscribers', { limit: 0 })
  return res.total
}

/**
 * Per-subscriber event history.
 *
 * WARNING: this is ONE REQUEST PER SUBSCRIBER. At 120 req/min a 2,000-person
 * list costs ~17 minutes for a single refresh. Never use it for a full sweep.
 *
 * For engagement analysis use the rollup fields that come free on the
 * subscriber object (`sent`, `opens_count`, `clicks_count`, `open_rate`,
 * `click_rate`) — a whole list is 2 requests at limit=1000.
 *
 * Reserve this for on-demand drill-down on one person, or a small watchlist.
 */
export async function activityLog(
  subscriberId: string,
  logName?: string,
  limit = 100,
): Promise<MailerLiteActivity[]> {
  const res = await get<{ data: MailerLiteActivity[] }>(
    `/subscribers/${subscriberId}/activity-log`,
    { limit, ...(logName ? { 'filter[log_name]': logName } : {}) },
  )
  return res.data
}

/** Verify credentials and connectivity. Returns the total subscriber count. */
export async function ping(): Promise<number> {
  return count()
}
