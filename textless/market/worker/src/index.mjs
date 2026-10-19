// textless marketplace: people upload scenes from the website, the rest of the world sees them right away once two
// checks pass, and the community's reports plus one more AI look take down anything that slips through.
//
//   POST /scenes                 upload (multipart): Turnstile, rate limits, the safety rules, the AI look, then live
//   GET  /scenes                 every live scene, newest first
//   GET  /f/<id>.<ext>           a live scene's file
//   POST /scenes/<id>/report     one report per person per scene; at 5 the AI looks again with the reasons
//   POST /scenes/<id>/star       { on: true|false }: one star per person per scene; returns the new count
//   GET  /settings/<key>         what the settings page saved under that key (the plugin reads it)
//   POST /settings/<key>         the settings page saves { set, scene } under the key its link carried
//   GET  /admin                  the moderation page, behind Cloudflare Access (only on the admin deployment)
//   GET  /admin/api/queue        hidden and flagged scenes
//   POST /admin/api/<id>/keep    put back for good: reports can never hide it again
//   POST /admin/api/<id>/remove  take it down and delete the file
//
// Files live in R2, the list in D1. Uploader emails and addresses are never shown; addresses are kept only as a
// salted hash, to count uploads and reports per person.
import { checkFile, checkFields } from "../../rules.mjs"
import { judge, picture } from "./moderate.mjs"
import { adminEmail } from "./access.mjs"
import { ADMIN_PAGE } from "./admin.mjs"

const MAX_UPLOAD = 1.2 * 1024 * 1024
const UPLOADS_PER_HOUR = 5
const REPORT_LIMIT = 5
const REASONS = ["sexual", "hateful", "violent", "ads", "brand", "broken", "other"]

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const origin = request.headers.get("Origin") || ""
    const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)
    // The settings page also runs as a file the plugin writes on the person's computer (with their own scenes in it,
    // which never leave it); a file page sends Origin "null". Only the settings routes take it: the key in the path is
    // what decides who may read or write there.
    const cors = allowed.includes(origin) || (origin === "null" && url.pathname.startsWith("/settings/"))
      ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" }
      : {}
    const json = (status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors, ...extra } })
    const path = url.pathname

    if (request.method === "OPTIONS") return new Response(null, { status: cors["Access-Control-Allow-Origin"] ? 204 : 403, headers: cors })

    // Two deployments of this code: ROLE=public serves the marketplace and never /admin; ROLE=admin serves only /admin,
    // on its own workers.dev address that Cloudflare Access covers whole. Unset (local dev) serves both.
    const adminPath = path === "/admin" || path.startsWith("/admin/")
    if (env.ROLE === "public" && adminPath) return new Response("Not found", { status: 404 })
    if (env.ROLE === "admin" && !adminPath) return Response.redirect(url.origin + "/admin", 302)

    try {
      if (path === "/scenes" && request.method === "GET") return json(200, { scenes: await listLive(env, url.origin) }, { "Cache-Control": "public, max-age=30" })
      if (path === "/scenes" && request.method === "POST") {
        if (!cors["Access-Control-Allow-Origin"]) return json(403, { ok: false, error: "origin" })
        return await upload(request, env, url, json)
      }
      let m
      if ((m = path.match(/^\/f\/([a-z0-9-]+)\.(svg|gif|png|webp|jpg)$/))) return await serveFile(env, m[1], m[2], url.searchParams.has("download"), false, url.searchParams.get("as") === "base64")
      if ((m = path.match(/^\/scenes\/([a-z0-9-]+)\/report$/)) && request.method === "POST") {
        if (!cors["Access-Control-Allow-Origin"]) return json(403, { ok: false, error: "origin" })
        return await report(request, env, m[1], json, ctx)
      }
      if ((m = path.match(/^\/scenes\/([a-z0-9-]+)\/remove$/)) && request.method === "POST") {
        if (!cors["Access-Control-Allow-Origin"]) return json(403, { ok: false, error: "origin" })
        return await removeOwn(request, env, m[1], json)
      }
      if ((m = path.match(/^\/scenes\/([a-z0-9-]+)\/star$/)) && request.method === "POST") {
        if (!cors["Access-Control-Allow-Origin"]) return json(403, { ok: false, error: "origin" })
        return await star(request, env, m[1], json)
      }
      if ((m = path.match(/^\/settings\/([0-9a-f]{32})$/))) {
        if (request.method === "GET") return await readSettings(env, m[1], json)
        if (request.method === "POST") {
          if (!cors["Access-Control-Allow-Origin"]) return json(403, { ok: false, error: "origin" })
          return await saveSettings(request, env, m[1], json)
        }
      }
      if (path === "/admin" || path.startsWith("/admin/")) {
        const who = await adminEmail(request, env)
        if (!who) return new Response("Not allowed", { status: 403 })
        if (path === "/admin") return new Response(ADMIN_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'self'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'", "Cache-Control": "no-store" } })
        if (path === "/admin/api/queue") return Response.json({ scenes: await queue(env) }, { headers: { "Cache-Control": "no-store" } })
        if ((m = path.match(/^\/admin\/f\/([a-z0-9-]+)\.(svg|gif|png|webp|jpg)$/))) return await serveFile(env, m[1], m[2], false, true)
        if ((m = path.match(/^\/admin\/api\/([a-z0-9-]+)\/(keep|remove)$/)) && request.method === "POST") return Response.json(await decide(env, m[1], m[2], who))
      }
      return json(404, { ok: false, error: "not-found" })
    } catch (err) {
      console.log("error", String(err?.stack || err))
      return json(500, { ok: false, error: "server" })
    }
  },
}

async function ipHash(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "local"
  const data = new TextEncoder().encode(`${env.IP_SALT || "dev-salt"}:${ip}`)
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("")
}

async function human(env, token, request) {
  const body = new FormData()
  body.append("secret", env.TURNSTILE_SECRET || "")
  body.append("response", String(token || ""))
  const ip = request.headers.get("CF-Connecting-IP")
  if (ip) body.append("remoteip", ip)
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body })
    return Boolean((await res.json()).success)
  } catch { return false }
}

const slug = name => (String(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "scene")
// The removal key an upload hands back: whoever holds it may take the scene down. Only its hash is kept.
const ownerKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("")
async function sha256(text) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text))))].map(b => b.toString(16).padStart(2, "0")).join("")
}
const suffix = () => Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(36).padStart(2, "0")).join("").slice(0, 5)

async function upload(request, env, url, json) {
  if (Number(request.headers.get("Content-Length") || 0) > MAX_UPLOAD) return json(413, { ok: false, error: "too-big", problems: ["the file is too large; the limit is 300 KB for SVG and 95 KB for other images"] })
  const who = await ipHash(request, env)
  if (env.UPLOAD_BURST && !(await env.UPLOAD_BURST.limit({ key: who })).success) return json(429, { ok: false, error: "slow-down" })
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM scenes WHERE ip_hash = ? AND created > ?").bind(who, Date.now() - 3600_000).first()
  if (recent.n >= UPLOADS_PER_HOUR) return json(429, { ok: false, error: "hourly-limit", problems: [`you can upload ${UPLOADS_PER_HOUR} scenes an hour; try again later`] })

  let form
  try { form = await request.formData() } catch { return json(400, { ok: false, error: "bad-form" }) }
  if (!(await human(env, form.get("token"), request))) return json(400, { ok: false, error: "turnstile", problems: ["the human check did not pass; try again"] })

  const fields = checkFields(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")))
  const file = form.get("file")
  if (!file || typeof file === "string") return json(400, { ok: false, error: "no-file", problems: ["choose an image to upload", ...fields.problems] })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const checked = checkFile(file.name, bytes)
  const problems = [...fields.problems, ...checked.problems]
  if (problems.length) return json(400, { ok: false, error: "rules", problems })

  const v = fields.values
  const id = `${slug(v.name)}-${suffix()}`
  const verdict = await judge(env, await picture(bytes, checked.ext), `Title: ${v.name}\nAuthor: ${v.author}${v.description ? `\nDescription: ${v.description}` : ""}`)
  const now = Date.now()
  if (!verdict.allowed) {
    // Refused files are not kept: only the fact, for the hourly count and for the moderator's numbers.
    await env.DB.prepare("INSERT INTO scenes (id, name, author, link, email, description, ext, width, height, bytes, status, ai_category, ai_reason, ip_hash, created) VALUES (?, ?, ?, '', '', '', ?, ?, ?, ?, 'refused', ?, ?, ?, ?)")
      .bind(id, v.name, v.author, checked.ext, checked.width ?? 0, checked.height ?? 0, bytes.length, verdict.category, verdict.reason, who, now).run()
    return json(verdict.sure ? 400 : 503, { ok: false, error: verdict.sure ? "not-allowed" : "check-unavailable", problems: [verdict.sure ? `this scene can't be published: ${verdict.reason}` : "the content check is not available right now; try again in a minute"] })
  }
  await env.FILES.put(`scenes/${id}.${checked.ext}`, bytes, { httpMetadata: { contentType: checked.type } })
  const owner = ownerKey()
  await env.DB.prepare("INSERT INTO scenes (id, name, author, link, email, description, ext, width, height, bytes, status, ai_category, ai_reason, ip_hash, created, owner_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?, ?, ?, ?, ?)")
    .bind(id, v.name, v.author, v.link, v.email, v.description, checked.ext, checked.width ?? 0, checked.height ?? 0, bytes.length, verdict.category, verdict.reason, who, now, await sha256(owner)).run()
  return json(201, { ok: true, id, owner, file: `${url.origin}/f/${id}.${checked.ext}` })
}

// The uploader takes their own scene down with the removal key the upload gave them. The file is deleted; the row
// stays as removed, so the id is never reused.
async function removeOwn(request, env, id, json) {
  let body
  try { body = await request.json() } catch { return json(400, { ok: false, error: "bad-json" }) }
  const key = String(body?.owner ?? "")
  if (!/^[0-9a-f]{32}$/.test(key)) return json(403, { ok: false, error: "not-yours" })
  const row = await env.DB.prepare("SELECT ext, status, owner_hash FROM scenes WHERE id = ?").bind(id).first()
  if (!row || !row.owner_hash || row.owner_hash !== (await sha256(key))) return json(403, { ok: false, error: "not-yours" })
  if (row.status !== "removed") {
    await env.DB.prepare("UPDATE scenes SET status = 'removed', flagged = 0, decided_by = 'owner' WHERE id = ?").bind(id).run()
    await env.FILES.delete(`scenes/${id}.${row.ext}`)
  }
  return json(200, { ok: true, id })
}

async function listLive(env, origin) {
  const { results } = await env.DB.prepare("SELECT s.id, s.name, s.author, s.link, s.description, s.ext, s.width, s.height, s.created, (SELECT COUNT(*) FROM stars t WHERE t.scene_id = s.id) AS stars FROM scenes s WHERE s.status = 'live' ORDER BY s.created DESC LIMIT 500").all()
  return results.map(r => ({ id: r.id, name: r.name, author: r.author, link: r.link || undefined, description: r.description || undefined, width: r.width, height: r.height, created: r.created, stars: r.stars, file: `${origin}/f/${r.id}.${r.ext}` }))
}

// Files go out with headers that stop an SVG from doing anything even if opened on its own.
// ?as=base64 returns the bytes as plain base64 text: the plugin can only read and write text, so it takes raster
// scenes this way and wraps them in an SVG itself.
async function serveFile(env, id, ext, download, admin, asBase64 = false) {
  const row = await env.DB.prepare("SELECT status, ext, name FROM scenes WHERE id = ?").bind(id).first()
  if (!row || row.ext !== ext || (!admin && row.status !== "live") || row.status === "removed" || row.status === "refused") return new Response("Not found", { status: 404 })
  const obj = await env.FILES.get(`scenes/${id}.${ext}`)
  if (!obj) return new Response("Not found", { status: 404 })
  const headers = new Headers({
    "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": admin ? "no-store" : "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
  })
  if (asBase64) {
    const bytes = new Uint8Array(await obj.arrayBuffer())
    let bin = ""
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    headers.set("Content-Type", "text/plain; charset=utf-8")
    return new Response(btoa(bin), { headers })
  }
  if (download) headers.set("Content-Disposition", `attachment; filename="${id}.${ext}"`)
  return new Response(obj.body, { headers })
}

// Stars need no Turnstile: one per person per scene (by salted address hash) plus a burst limit keep them honest
// enough for a "most starred" sort, and a star never changes what is shown or hidden.
async function star(request, env, id, json) {
  let body
  try { body = await request.json() } catch { return json(400, { ok: false, error: "bad-json" }) }
  const who = await ipHash(request, env)
  if (env.STAR_BURST && !(await env.STAR_BURST.limit({ key: who })).success) return json(429, { ok: false, error: "slow-down" })
  const scene = await env.DB.prepare("SELECT id FROM scenes WHERE id = ? AND status = 'live'").bind(id).first()
  if (!scene) return json(404, { ok: false, error: "not-found" })
  const on = body?.on !== false
  if (on) await env.DB.prepare("INSERT OR IGNORE INTO stars (scene_id, ip_hash, created) VALUES (?, ?, ?)").bind(id, who, Date.now()).run()
  else await env.DB.prepare("DELETE FROM stars WHERE scene_id = ? AND ip_hash = ?").bind(id, who).run()
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM stars WHERE scene_id = ?").bind(id).first()
  return json(200, { ok: true, on, stars: n })
}

async function report(request, env, id, json, ctx) {
  let body
  try { body = await request.json() } catch { return json(400, { ok: false, error: "bad-json" }) }
  if (!REASONS.includes(body.reason)) return json(400, { ok: false, error: "reason" })
  const note = String(body.note || "").trim().slice(0, 200)
  if (!(await human(env, body.token, request))) return json(400, { ok: false, error: "turnstile" })
  const scene = await env.DB.prepare("SELECT * FROM scenes WHERE id = ? AND status = 'live'").bind(id).first()
  if (!scene) return json(404, { ok: false, error: "not-found" })
  const who = await ipHash(request, env)
  const added = await env.DB.prepare("INSERT OR IGNORE INTO reports (scene_id, ip_hash, reason, note, created) VALUES (?, ?, ?, ?, ?)").bind(id, who, body.reason, note, Date.now()).run()
  if (!added.meta.changes) return json(200, { ok: true, already: true })
  // A scene Isac kept stays up; reports on it are only counted.
  if (scene.kept) return json(200, { ok: true })
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE scene_id = ? AND created > ?").bind(id, scene.checked_at || 0).first()
  if (n >= REPORT_LIMIT) ctx.waitUntil(recheck(env, scene))
  return json(200, { ok: true })
}

// Five reports since the last look: the AI looks again, told what people said. If it is sure the scene is fine, the
// scene stays and Isac sees it flagged; otherwise it hides until Isac decides.
export async function recheck(env, scene) {
  const { results } = await env.DB.prepare("SELECT reason, COUNT(*) AS n FROM reports WHERE scene_id = ? AND created > ? GROUP BY reason").bind(scene.id, scene.checked_at || 0).all()
  const said = results.map(r => `${r.reason} (${r.n})`).join(", ")
  const obj = await env.FILES.get(`scenes/${scene.id}.${scene.ext}`)
  const bytes = new Uint8Array(await obj.arrayBuffer())
  const verdict = await judge(env, await picture(bytes, scene.ext), `Title: ${scene.name}\nAuthor: ${scene.author}${scene.description ? `\nDescription: ${scene.description}` : ""}`,
    `People reported this scene as: ${said}. Reports can be made in bad faith or as a joke; judge only what the image and its text show.`)
  const now = Date.now()
  if (verdict.allowed && verdict.sure) {
    await env.DB.prepare("UPDATE scenes SET flagged = 1, checked_at = ?, ai_reason = ? WHERE id = ?").bind(now, `kept by the second look: ${verdict.reason}`, scene.id).run()
    return "kept"
  }
  await env.DB.prepare("UPDATE scenes SET status = 'hidden', flagged = 1, checked_at = ?, ai_category = ?, ai_reason = ? WHERE id = ?").bind(now, verdict.category, verdict.reason, scene.id).run()
  await notify(env, `textless: "${scene.name}" was hidden`, `${said}\n\nThe second look said: ${verdict.reason}\n\nDecide at /admin.`)
  return "hidden"
}

// Settings live under a random 128-bit key the plugin made; knowing the key is the only way to read or change them.
// They hold only scene choices, so nothing personal sits behind it.
const SET_NAME = /^[a-z0-9-]{1,32}$/
// A scene's name: a file name, or the name of the person's own picture or a market scene (which may have spaces).
const SCENE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._'-]{0,63}$/
// The person's own sets: a name of their choosing and up to 60 scenes from any set, each as "<set>/<scene>".
const MIX_ID = /^mix-[a-z0-9]{1,24}$/
const MIX_NAME = /^[^<>"\\\u0000-\u001f]{1,32}$/
const MAX_MIXES = 20
const MAX_MIX_SCENES = 60

// The sets the page sent, checked: undefined when it sent none (the saved ones stay), null when one is malformed.
export function cleanMixes(raw) {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw) || raw.length > MAX_MIXES) return null
  const seen = new Set()
  const out = []
  for (const m of raw) {
    const id = String(m?.id ?? ""), name = String(m?.name ?? "").trim()
    if (!MIX_ID.test(id) || seen.has(id) || !MIX_NAME.test(name) || !Array.isArray(m?.scenes) || m.scenes.length > MAX_MIX_SCENES) return null
    seen.add(id)
    const scenes = [...new Set(m.scenes.map(String))]
    for (const ref of scenes) {
      const at = ref.indexOf("/")
      if (at < 1 || !SET_NAME.test(ref.slice(0, at)) || !SCENE_NAME.test(ref.slice(at + 1))) return null
    }
    out.push({ id, name, scenes })
  }
  return out
}

async function readSettings(env, key, json) {
  const row = await env.DB.prepare("SELECT data, updated FROM settings WHERE key = ?").bind(key).first()
  if (!row) return json(404, { ok: false, error: "not-found" }, { "Cache-Control": "no-store" })
  return json(200, { ok: true, ...JSON.parse(row.data), updated: row.updated }, { "Cache-Control": "no-store" })
}

async function saveSettings(request, env, key, json) {
  if (Number(request.headers.get("Content-Length") || 0) > 16384) return json(413, { ok: false, error: "too-big" })
  const who = await ipHash(request, env)
  if (env.SETTINGS_BURST && !(await env.SETTINGS_BURST.limit({ key: who })).success) return json(429, { ok: false, error: "slow-down" })
  let body
  try { body = await request.json() } catch { return json(400, { ok: false, error: "bad-json" }) }
  const set = String(body?.set ?? "")
  const scene = body?.scene === null || body?.scene === undefined ? null : String(body.scene)
  // Whether the questions, links and next step show under answers; absent keeps what the plugin has.
  const summary = typeof body?.summary === "boolean" ? body.summary : undefined
  // Cover mode: a finished chat hides behind one big card; absent keeps what the plugin has.
  const cover = typeof body?.cover === "boolean" ? body.cover : undefined
  if (!SET_NAME.test(set) || (scene !== null && !SCENE_NAME.test(scene))) return json(400, { ok: false, error: "bad-settings" })
  let mixes = cleanMixes(body?.mixes)
  if (mixes === null) return json(400, { ok: false, error: "bad-sets" })
  // Sets not sent stay as saved: a page that knows nothing of them must not wipe them.
  if (mixes === undefined) {
    const row = await env.DB.prepare("SELECT data FROM settings WHERE key = ?").bind(key).first()
    try { mixes = row ? JSON.parse(row.data).mixes : undefined } catch { mixes = undefined }
  }
  const updated = Date.now()
  await env.DB.prepare("INSERT INTO settings (key, data, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated = excluded.updated")
    .bind(key, JSON.stringify({ set, scene, summary, cover, mixes }), updated).run()
  return json(200, { ok: true, set, scene, summary, cover, mixes, updated })
}

async function queue(env) {
  const { results } = await env.DB.prepare("SELECT id, name, author, link, description, ext, status, ai_category, ai_reason, created, checked_at FROM scenes WHERE flagged = 1 AND status IN ('live', 'hidden') ORDER BY status = 'hidden' DESC, checked_at DESC LIMIT 200").all()
  for (const r of results) {
    const { results: why } = await env.DB.prepare("SELECT reason, COUNT(*) AS n FROM reports WHERE scene_id = ? GROUP BY reason").bind(r.id).all()
    r.reports = why
    r.file = `/admin/f/${r.id}.${r.ext}`
  }
  return results
}

async function decide(env, id, action, who) {
  if (action === "keep") {
    await env.DB.prepare("UPDATE scenes SET status = 'live', kept = 1, flagged = 0, checked_at = ?, decided_by = ? WHERE id = ? AND status IN ('live', 'hidden')").bind(Date.now(), who, id).run()
    return { ok: true, id, status: "live" }
  }
  const row = await env.DB.prepare("SELECT ext FROM scenes WHERE id = ?").bind(id).first()
  if (row) await env.FILES.delete(`scenes/${id}.${row.ext}`)
  await env.DB.prepare("UPDATE scenes SET status = 'removed', flagged = 0, decided_by = ? WHERE id = ?").bind(who, id).run()
  return { ok: true, id, status: "removed" }
}

// An optional email to Isac through Cloudflare Email Routing. Without the NOTIFY binding it only logs.
async function notify(env, subject, text) {
  if (!env.NOTIFY || !env.NOTIFY_TO || !env.NOTIFY_FROM) { console.log("notify", subject); return }
  const { EmailMessage } = await import("cloudflare:email")
  const raw = [`From: ${env.NOTIFY_FROM}`, `To: ${env.NOTIFY_TO}`, `Subject: ${subject}`, `Message-ID: <${crypto.randomUUID()}@textless>`, "Content-Type: text/plain; charset=utf-8", "", text].join("\r\n")
  try { await env.NOTIFY.send(new EmailMessage(env.NOTIFY_FROM, env.NOTIFY_TO, raw)) } catch (err) { console.log("notify failed", String(err)) }
}
