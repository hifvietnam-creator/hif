/**
 * wl_songs_scraper/lib/attachments.ts
 *
 * Getting the bytes of a Planning Center attachment.
 *
 * ── Why this file exists, and does not live in src/lib/pco.ts ────────────────
 *
 * src/lib/pco.ts is deliberately incapable of writing to Planning Center, and
 * says so: "If you ever think you need one, that is a design conversation, not
 * a patch." Downloading an attachment needs one POST — the attachment `open`
 * action — so the read-only guarantee on the shared client is kept intact and
 * the single exception is quarantined here, where it is obvious and auditable.
 *
 * What that POST actually does: it asks PCO to mint a short-lived signed URL
 * for the file and records an AttachmentActivity (a download-log entry). It
 * does not create, modify or delete anything you would miss. It is a POST in
 * the HTTP sense and a read in every sense that matters — but it is still the
 * only non-GET request this project makes, which is why it is one small
 * function with a long comment rather than a general `post()` helper.
 *
 * `resolveDownloadUrl` prefers a direct URL when the attachment record already
 * exposes one, and only falls back to the POST when it does not.
 */

const BASE_URL = 'https://api.planningcenteronline.com'
const USER_AGENT = 'HIF Worship Song Archiver (hifvietnam@gmail.com)'
const MAX_RETRIES = 5
const MAX_RETRY_AFTER_MS = 60_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function authHeader(): string {
  const appId = process.env.PCO_APP_ID?.trim()
  const secret = process.env.PCO_SECRET?.trim()
  if (!appId || !secret) {
    throw new Error('[attachments] PCO_APP_ID and PCO_SECRET must be set (project .env).')
  }
  return `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`
}

export type Attachment = {
  id: string
  type: string
  attributes?: Record<string, unknown>
}

/**
 * Fields that carry a directly usable FILE url on an attachment record.
 *
 * Note what is NOT here, and why. A real attachment record looks like this:
 *
 *     url          "https://services.planningcenteronline.com/attachments/103043115"
 *     linked_url   "https://services.planningcenteronline.com/songs/18597977/a"
 *     remote_link  "42144aaed5c70230ae456e6e95c8ecd0"
 *
 * `url` and `linked_url` are web pages in the Services UI, not files — fetching
 * either yields HTML, and would have silently written login pages to disk with
 * a .pdf extension. `remote_link` is an S3 object key, not a URL at all.
 *
 * So in practice this list is empty for stored files and the `open` action
 * below is always required. It stays as a list so that if PCO ever does expose
 * a real file URL, adding the field name here removes a POST per download.
 */
const DIRECT_URL_FIELDS: readonly string[] = ['file_url', 'attachment_url', 'download_url']

/** A directly usable file URL on the record, if there is one. Usually there isn't. */
export function directUrl(att: Attachment): string | null {
  const a = att.attributes ?? {}
  for (const f of DIRECT_URL_FIELDS) {
    const v = a[f]
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v
  }
  return null
}

/**
 * Whether this attachment is a stored file we can fetch, as opposed to a link
 * or a web view that has no bytes of its own.
 *
 * This requires POSITIVE EVIDENCE that a file exists, rather than an absence of
 * evidence that it doesn't — and that is the whole point.
 *
 * PCO's `viewchordsheet` entries pass every negative test. They report
 * `downloadable: true`, they carry a display name, nothing flags them as a
 * link, and the `open` action returns a perfectly valid signed URL. Following
 * that URL serves a 149 KB **HTML page** — the chord sheet as rendered in the
 * Services UI. An earlier version of this function trusted all that and wrote
 * two web pages into the archive named as if they were charts.
 *
 * So: a stored file must show one of
 *   · `pco_type` of AttachmentS3 — PCO's own marker for an object in S3
 *   · a positive `file_size`
 *   · a `content_type` that maps to a known file extension
 *
 * `remote_link` is deliberately not consulted: despite the name it holds the S3
 * key of a perfectly ordinary stored PDF.
 */
export function isDownloadableFile(att: Attachment): boolean {
  const a = att.attributes ?? {}

  if (a.downloadable === false) return false

  const name = a.filename ?? a.display_name
  if (typeof name !== 'string' || name.trim().length === 0) return false

  const pcoType = String(a.pco_type ?? '').toLowerCase()
  if (pcoType.startsWith('attachments3')) return true

  if (typeof a.file_size === 'number' && a.file_size > 0) return true

  return extensionForContentType(a.content_type as string) !== ''
}

/** Inverse of {@link isDownloadableFile}, kept for readability at call sites. */
export const isRemoteLink = (att: Attachment): boolean => !isDownloadableFile(att)

/**
 * THE ONE POST. Asks PCO to mint a short-lived download URL for an attachment.
 *
 * Returns the signed URL, or null if PCO declines. The URL expires quickly —
 * fetch it immediately, do not store it.
 */
export async function openAttachment(attachmentId: string, attempt = 0): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/services/v2/attachments/${attachmentId}/open`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })

  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '', 10)
    const waitMs = Math.min(
      (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1) * 1000,
      MAX_RETRY_AFTER_MS,
    )
    await sleep(waitMs)
    return openAttachment(attachmentId, attempt + 1)
  }

  if (res.status >= 500 && attempt < MAX_RETRIES) {
    await sleep(Math.min(2 ** attempt * 1000, MAX_RETRY_AFTER_MS))
    return openAttachment(attachmentId, attempt + 1)
  }

  if (!res.ok) return null

  const body = (await res.json()) as { data?: { attributes?: Record<string, unknown> } }
  const attrs = body.data?.attributes ?? {}
  for (const f of ['attachment_url', 'url', 'file_url']) {
    const v = attrs[f]
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v
  }
  return null
}

/**
 * The URL to fetch this attachment's bytes from, whichever way PCO offers it.
 * Prefers a direct URL (no POST at all) and falls back to the open action.
 */
export async function resolveDownloadUrl(att: Attachment): Promise<string | null> {
  if (!isDownloadableFile(att)) return null
  return directUrl(att) ?? (await openAttachment(att.id))
}

/**
 * Check that a signed URL actually serves the file, without downloading it all.
 *
 * Uses a one-byte ranged GET rather than HEAD. S3 presigned URLs are signed for
 * a specific HTTP method, so a HEAD against a GET-signed URL comes back 403
 * SignatureDoesNotMatch even when the URL is perfectly good — which is exactly
 * the false alarm the first --test-open run produced.
 */
export async function verifyUrl(
  url: string,
): Promise<{ ok: boolean; status: number; contentType: string | null; contentLength: string | null }> {
  const res = await fetch(url, { headers: { Range: 'bytes=0-0' } })
  // 206 Partial Content is the expected success; 200 means Range was ignored.
  return {
    ok: res.status === 206 || res.status === 200,
    status: res.status,
    contentType: res.headers.get('content-type'),
    contentLength: res.headers.get('content-range') ?? res.headers.get('content-length'),
  }
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'text/plain': '.txt',
}

/** Does this name already end in something that looks like a file extension? */
export const hasExtension = (name: string): boolean => /\.[A-Za-z0-9]{1,8}$/.test(name)

/**
 * `filetype` values that describe nothing.
 *
 * PCO's generated chord sheets report `filetype: "file"`, which is how the
 * first attempt produced `You Are Good - viewchordsheet.file` — a name Windows
 * will happily create and nothing will open.
 */
const USELESS_FILETYPES = new Set(['file', 'files', 'attachment', 'unknown', 'other', 'link', 'url', 'data'])

/** Extension for a MIME type, e.g. "application/pdf; charset=utf-8" → ".pdf". */
export function extensionForContentType(contentType: string | null | undefined): string {
  const ct = String(contentType ?? '').split(';')[0]!.trim().toLowerCase()
  return CONTENT_TYPE_EXT[ct] ?? ''
}

/**
 * The extension a record implies, for names that arrive without one.
 *
 * `content_type` is consulted first because it is a real MIME type and cannot
 * be a vague word; `filetype` is a free-text field that is usually right
 * ("pdf") and occasionally worthless ("file"). When both fail, the extension is
 * settled from the HTTP response at download time instead — see download.ts.
 */
export function inferExtension(att: Attachment): string {
  const a = att.attributes ?? {}

  const fromContentType = extensionForContentType(a.content_type as string)
  if (fromContentType) return fromContentType

  const filetype = typeof a.filetype === 'string' ? a.filetype.trim().toLowerCase() : ''
  if (/^[a-z0-9]{1,8}$/.test(filetype) && !USELESS_FILETYPES.has(filetype)) return `.${filetype}`

  return ''
}

/**
 * A sensible filename for an attachment, before sanitising for the filesystem.
 *
 * Note this can still collide with another attachment's name — several songs in
 * one plan each produce a chord sheet called `viewchordsheet`. Resolving that
 * needs to see the whole plan at once, so it happens in download.ts rather than
 * here.
 */
export function attachmentFilename(att: Attachment): string {
  const a = att.attributes ?? {}
  const raw = String((a.filename as string) || (a.display_name as string) || '').trim()
  const base = raw || `attachment-${att.id}`
  return hasExtension(base) ? base : base + inferExtension(att)
}
