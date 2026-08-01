/**
 * Planning Center Online API client — READ ONLY.
 *
 * This module is deliberately incapable of writing to Planning Center.
 * It exports `get`, `paginate`, and `count` and nothing else. There is no
 * post/put/patch/delete helper, so a write cannot be made by accident.
 * If you ever think you need one, that is a design conversation, not a patch.
 *
 * Handles the three things the original inline sync did not:
 *   1. Sends a User-Agent header. PCO documents that requests without a
 *      qualifying User-Agent "may result in a 403 Forbidden".
 *   2. Honours the rate limit (100 req / 20s by default) by reading the
 *      X-PCO-API-Request-Rate-* headers rather than hard-coding values —
 *      PCO states limits can change at any time without notice.
 *   3. Retries 429s using the Retry-After header, and 5xx with backoff.
 *
 * Auth is a Personal Access Token over HTTP Basic, which is the correct
 * choice for a single-church integration.
 *
 * Docs: https://api.planningcenteronline.com/docs/overview/getting-started
 */

const BASE_URL = 'https://api.planningcenteronline.com'

/** Must uniquely identify the app and provide a contact. Required by PCO. */
const USER_AGENT = 'HIF Journey Dashboard (hifvietnam@gmail.com)'

const MAX_RETRIES = 5
const DEFAULT_PER_PAGE = 100 // PCO's maximum; the old sync used 25.
const SLOWDOWN_THRESHOLD = 0.8 // Start easing off at 80% of the window's limit.
const SLOWDOWN_MS = 1000
const MAX_RETRY_AFTER_MS = 60_000

// ── JSON-API types ───────────────────────────────────────────────────────────

export type PcoResource<
  A = Record<string, unknown>,
  R = Record<string, { data: { id: string; type: string } | null }>,
> = {
  id: string
  type: string
  attributes: A
  relationships?: R
}

export type PcoCollection<T> = {
  data: T[]
  included?: PcoResource[]
  meta: {
    total_count: number
    count?: number
    next?: { offset: number }
  }
}

export type PcoSingle<T> = {
  data: T
  included?: PcoResource[]
}

// ── Internals ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function authHeader(): string {
  const appId = process.env.PCO_APP_ID?.trim()
  const secret = process.env.PCO_SECRET?.trim()

  if (!appId || !secret) {
    throw new Error(
      '[PCO] PCO_APP_ID and PCO_SECRET must be set. ' +
        'Generate a Personal Access Token at https://api.planningcenteronline.com/personal_access_tokens',
    )
  }

  return `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`
}

function joinPath(path: string, params: Record<string, string | number>): string {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Single GET with rate-limit awareness and retry.
 * Not exported — callers use `get`, `paginate`, or `count`.
 */
async function request(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    method: 'GET', // Hard-coded. This client only ever reads.
    headers: {
      Authorization: authHeader(),
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })

  // ── Rate limited ──
  if (res.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`[PCO] Rate limit: exceeded ${MAX_RETRIES} retries on ${url}`)
    }
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '', 10)
    const waitMs = Math.min(
      (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1) * 1000,
      MAX_RETRY_AFTER_MS,
    )
    console.warn(`[PCO] 429 rate limited — waiting ${waitMs}ms then retrying`)
    await sleep(waitMs)
    return request(url, attempt + 1)
  }

  // ── Transient server error: exponential backoff ──
  if (res.status >= 500 && attempt < MAX_RETRIES) {
    const waitMs = Math.min(2 ** attempt * 1000, MAX_RETRY_AFTER_MS)
    console.warn(`[PCO] ${res.status} on ${url} — retrying in ${waitMs}ms`)
    await sleep(waitMs)
    return request(url, attempt + 1)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[PCO] ${res.status} ${res.statusText} on ${url}${body ? ` — ${body}` : ''}`)
  }

  // ── Proactively slow down near the ceiling ──
  // Never hard-code the limit; read whatever PCO reports for this window.
  const limit = parseInt(res.headers.get('X-PCO-API-Request-Rate-Limit') ?? '', 10)
  const count = parseInt(res.headers.get('X-PCO-API-Request-Rate-Count') ?? '', 10)
  if (Number.isFinite(limit) && Number.isFinite(count) && count >= limit * SLOWDOWN_THRESHOLD) {
    await sleep(SLOWDOWN_MS)
  }

  return res
}

// ── Public API (read-only) ───────────────────────────────────────────────────

/**
 * Fetch a single PCO endpoint.
 *
 * @example
 *   const me = await get<PcoSingle<PcoResource>>('/people/v2/me')
 *   const person = await get<PcoSingle<PcoResource>>('/people/v2/people/123?include=emails')
 */
export async function get<T>(path: string): Promise<T> {
  const res = await request(path.startsWith('http') ? path : `${BASE_URL}${path}`)
  return (await res.json()) as T
}

/**
 * Walk a JSON-API collection endpoint to exhaustion, yielding one page at a time.
 *
 * Yields the whole page object so callers keep access to `included` (JSON-API
 * sideloads related resources there) and `meta.total_count`.
 *
 * @example
 *   for await (const page of paginate<PcoResource>('/people/v2/people?include=emails')) {
 *     for (const person of page.data) { ... }
 *   }
 */
export async function* paginate<T = PcoResource>(
  path: string,
  perPage: number = DEFAULT_PER_PAGE,
): AsyncGenerator<PcoCollection<T>> {
  let offset = 0

  for (;;) {
    const url = joinPath(path, { per_page: perPage, offset })
    const res = await request(url)
    const page = (await res.json()) as PcoCollection<T>

    yield page

    // `meta.next` is absent on the final page.
    if (!page.meta?.next) return
    offset = page.meta.next.offset
  }
}

/**
 * Total record count for a collection endpoint, using a minimal request.
 * Useful for reconciling against known figures before a full backfill.
 */
export async function count(path: string): Promise<number> {
  const res = await request(joinPath(path, { per_page: 1, offset: 0 }))
  const json = (await res.json()) as PcoCollection<unknown>
  return json.meta?.total_count ?? 0
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Index a page's `included` array by "type:id" for O(1) lookup.
 *
 * JSON-API sideloads related records into `included` rather than nesting them,
 * so resolving a relationship means looking it up by type and id.
 *
 * @example
 *   const byKey = indexIncluded(page.included)
 *   const emailId = person.relationships?.emails?.data?.id
 *   const email = emailId ? byKey.get(`Email:${emailId}`) : undefined
 */
export function indexIncluded(included: PcoResource[] = []): Map<string, PcoResource> {
  return new Map(included.map((r) => [`${r.type}:${r.id}`, r]))
}

/**
 * Build a `where[updated_at][gt]=` clause for incremental syncs.
 * Returns an empty string when no watermark exists, so the first run is a full sweep.
 */
export function updatedSince(since: Date | string | null | undefined): string {
  if (!since) return ''
  const iso = typeof since === 'string' ? since : since.toISOString()
  return `where[updated_at][gt]=${encodeURIComponent(iso)}`
}

/** Verify credentials and connectivity. Returns the authenticated PCO user's name. */
export async function whoami(): Promise<{ id: string; name: string }> {
  const res = await get<PcoSingle<PcoResource<{ name: string }>>>('/people/v2/me')
  return { id: res.data.id, name: res.data.attributes.name }
}
