// effortless report: the website's bug report and feature request form posts here, and this files the
// GitHub issue in HeyCubit/effortless as HeyCubit. Reporters need no GitHub account and never leave the page.
//
// The issue list is public, so the form asks for no email and this keeps nothing: no store, no log of the
// text. What stops abuse: the page's origin, a per-address and a global rate limit, a hidden field only
// bots fill, a minimum time on the page, length limits, and @mentions broken so a report can't ping people.

const KINDS = { bug: 'bug', feature: 'enhancement' }
const TITLE = [3, 140]
const BODY = [10, 5000]
const VERSION = 40
const MIN_FILL_MS = 3000
const MAX_BYTES = 16000

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : {}
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (url.pathname !== '/report') return reply(404, { ok: false, error: 'not-found' })
    if (!cors['Access-Control-Allow-Origin']) return reply(403, { ok: false, error: 'origin' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'method' })

    const ip = ipBucket(request.headers.get('CF-Connecting-IP'))
    if (env.PER_IP && !(await env.PER_IP.limit({ key: ip || 'unknown' })).success) return reply(429, { ok: false, error: 'slow-down' })
    if (env.ALL && !(await env.ALL.limit({ key: 'all' })).success) return reply(429, { ok: false, error: 'busy' })

    const raw = await request.text()
    if (raw.length > MAX_BYTES) return reply(413, { ok: false, error: 'too-long' })
    let form
    try { form = JSON.parse(raw) } catch { return reply(400, { ok: false, error: 'bad-json' }) }

    // A bot that fills the hidden field, or posts within a moment of the page loading, is told it worked.
    if (String(form.website || '') !== '' || !(Number(form.ms) >= MIN_FILL_MS)) return reply(200, { ok: true })

    const problem = check(form)
    if (problem) return reply(400, { ok: false, error: problem })

    const issue = toIssue(form)
    const api = env.GITHUB_API || 'https://api.github.com'
    let res
    try {
      res = await fetch(`${api}/repos/${env.REPO}/issues`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'effortless-report', 'Content-Type': 'application/json' },
        body: JSON.stringify(issue),
      })
    } catch {
      return reply(502, { ok: false, error: 'github' })
    }
    if (!res.ok) return reply(502, { ok: false, error: 'github' })
    const made = await res.json()
    return reply(201, { ok: true, number: made.number, url: made.html_url })
  },
}

export function check(form) {
  if (!KINDS[form.kind]) return 'kind'
  const title = clean(form.title), body = clean(form.body)
  if (title.length < TITLE[0] || title.length > TITLE[1]) return 'title'
  if (body.length < BODY[0] || body.length > BODY[1]) return 'body'
  for (const k of ['effortless', 'cc']) if (clean(form[k]).length > VERSION) return 'version'
  return ''
}

export function toIssue(form) {
  const lines = [quiet(clean(form.body))]
  const ver = []
  if (clean(form.effortless)) ver.push(`- effortless: ${quiet(clean(form.effortless))}`)
  if (clean(form.cc)) ver.push(`- Claude Code: ${quiet(clean(form.cc))}`)
  if (ver.length) lines.push('### Versions\n' + ver.join('\n'))
  lines.push('<sub>Sent from the form on the effortless website.</sub>')
  return { title: quiet(clean(form.title)).replace(/\s+/g, ' '), body: lines.join('\n\n'), labels: [KINDS[form.kind]] }
}

const clean = v => String(v ?? '').replace(/\r\n?/g, '\n').trim()
// "@name" would notify that GitHub user; a zero-width space after the @ keeps the text and drops the ping.
const quiet = s => s.replace(/@(?=[A-Za-z0-9-])/g, '@​')

// One bucket per subscriber: an IPv4 address, or an IPv6 /64, since rotating inside a /64 is free.
export function ipBucket(ip) {
  const s = String(ip || '').trim().toLowerCase()
  if (!s) return ''
  if (!s.includes(':')) return s
  if (s.includes('.')) return s.slice(s.lastIndexOf(':') + 1)
  let groups
  if (s.includes('::')) {
    const [head, tail] = s.split('::')
    const h = head ? head.split(':') : [], t = tail ? tail.split(':') : []
    groups = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  } else groups = s.split(':')
  return groups.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '') || '0').join(':') + '::/64'
}
