// node --test report-worker/worker.test.mjs
// The worker against a stand-in GitHub: what it files, and every way it refuses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker, { ipBucket } from './worker.js'

const SITE = 'https://heycubit.github.io'
const limiter = (ok = true) => ({ calls: [], async limit(o) { this.calls.push(o.key); return { success: ok } } })
const env = (over = {}) => ({ REPO: 'HeyCubit/effortless', ALLOWED_ORIGINS: SITE, GITHUB_TOKEN: 'test-token', PER_IP: limiter(), ALL: limiter(), ...over })
const good = { kind: 'bug', title: 'The bar stays on Deciding', body: 'I sent a prompt and the bar never moved on.', effortless: '1.64.0', cc: '2.1.0', website: '', ms: 9000 }
const post = (body, { origin = SITE, ip = '203.0.113.7' } = {}) =>
  new Request('https://effortless-report.example/report', { method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) })

let sent
function stubGitHub(status = 201) {
  sent = []
  globalThis.fetch = async (url, init) => {
    sent.push({ url, init, body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ number: 42, html_url: 'https://github.com/HeyCubit/effortless/issues/42' }), { status })
  }
}

test('files a bug as an issue with the bug label and the versions', async () => {
  stubGitHub()
  const res = await worker.fetch(post(good), env())
  assert.equal(res.status, 201)
  assert.deepEqual(await res.json(), { ok: true, number: 42, url: 'https://github.com/HeyCubit/effortless/issues/42' })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, 'https://api.github.com/repos/HeyCubit/effortless/issues')
  assert.equal(sent[0].init.headers.Authorization, 'Bearer test-token')
  assert.deepEqual(sent[0].body.labels, ['bug'])
  assert.equal(sent[0].body.title, 'The bar stays on Deciding')
  assert.match(sent[0].body.body, /### Versions\n- effortless: 1\.64\.0\n- Claude Code: 2\.1\.0/)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), SITE)
})

test('a feature request gets the enhancement label', async () => {
  stubGitHub()
  await worker.fetch(post({ ...good, kind: 'feature' }), env())
  assert.deepEqual(sent[0].body.labels, ['enhancement'])
})

test('@mentions are broken so a report cannot ping anyone', async () => {
  stubGitHub()
  await worker.fetch(post({ ...good, title: 'ping @octocat', body: 'hey @someone and @org/team, mail a@b.se' }), env())
  assert.ok(!/@[A-Za-z0-9]/.test(sent[0].body.title))
  assert.ok(!/@[A-Za-z0-9]/.test(sent[0].body.body))
  assert.match(sent[0].body.body, /@​someone/)
})

test('the hidden field or a too-fast post is told it worked and files nothing', async () => {
  stubGitHub()
  for (const bad of [{ ...good, website: 'http://spam' }, { ...good, ms: 400 }, { ...good, ms: undefined }]) {
    const res = await worker.fetch(post(bad), env())
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
  }
  assert.equal(sent.length, 0)
})

test('refuses a foreign origin, a bad kind and out-of-range fields', async () => {
  stubGitHub()
  assert.equal((await worker.fetch(post(good, { origin: 'https://evil.example' }), env())).status, 403)
  assert.equal((await worker.fetch(post(good, { origin: '' }), env())).status, 403)
  for (const [bad, error] of [
    [{ ...good, kind: 'other' }, 'kind'],
    [{ ...good, title: 'x' }, 'title'],
    [{ ...good, title: 'x'.repeat(141) }, 'title'],
    [{ ...good, body: 'short' }, 'body'],
    [{ ...good, cc: 'v'.repeat(41) }, 'version'],
  ]) {
    const res = await worker.fetch(post(bad), env())
    assert.equal(res.status, 400)
    assert.equal((await res.json()).error, error)
  }
  assert.equal((await worker.fetch(post('{nope'), env())).status, 400)
  assert.equal((await worker.fetch(post({ ...good, body: 'x'.repeat(20000) }), env())).status, 413)
  assert.equal(sent.length, 0)
})

test('rate limits answer 429 and file nothing', async () => {
  stubGitHub()
  assert.equal((await worker.fetch(post(good), env({ PER_IP: limiter(false) }))).status, 429)
  assert.equal((await worker.fetch(post(good), env({ ALL: limiter(false) }))).status, 429)
  assert.equal(sent.length, 0)
})

test('the per-address limit keys an IPv6 client on its /64', async () => {
  stubGitHub()
  const e = env()
  await worker.fetch(post(good, { ip: '2001:db8:1:2:aaaa::1' }), e)
  await worker.fetch(post(good, { ip: '2001:db8:1:2:bbbb::9' }), e)
  assert.deepEqual(e.PER_IP.calls, ['2001:db8:1:2::/64', '2001:db8:1:2::/64'])
  assert.equal(ipBucket('::ffff:198.51.100.4'), '198.51.100.4')
})

test('preflight answers for the site only, and a GitHub failure is a 502', async () => {
  const pre = await worker.fetch(new Request('https://x/report', { method: 'OPTIONS', headers: { Origin: SITE } }), env())
  assert.equal(pre.status, 204)
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), SITE)
  stubGitHub(500)
  const res = await worker.fetch(post(good), env())
  assert.equal(res.status, 502)
  assert.equal((await res.json()).error, 'github')
  assert.equal((await worker.fetch(new Request('https://x/other', { headers: { Origin: SITE } }), env())).status, 404)
})
