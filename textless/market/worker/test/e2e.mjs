// End to end against `npm run dev` (http://127.0.0.1:8788) with .dev.vars: Turnstile's always-pass test secret,
// AI_FAKE and DEV_ADMIN. Run: node test/e2e.mjs [expected second look: kept|hidden]
import assert from "node:assert/strict"
import fs from "node:fs"

const API = process.env.API || "http://127.0.0.1:8788"
const ORIGIN = "http://127.0.0.1:4318"
const expect = process.argv[2] || "kept"
const rain = fs.readFileSync(new URL("./rain.svg", import.meta.url), "utf8")
let ip = 10 + Math.floor(Math.random() * 200)
const nextIp = () => `203.0.113.${(ip = (ip % 250) + 1)}`

async function upload(file, name, fields = {}, as = nextIp()) {
  const form = new FormData()
  form.append("file", new Blob([file]), name)
  for (const [k, v] of Object.entries({ name: "Rain test", author: "Tester", consent: "yes", token: "XXXX.DUMMY.TOKEN.XXXX", ...fields })) form.append(k, v)
  const res = await fetch(`${API}/scenes`, { method: "POST", body: form, headers: { Origin: ORIGIN, "CF-Connecting-IP": as } })
  return { status: res.status, body: await res.json() }
}
const results = []
const step = async (name, fn) => { try { await fn(); results.push(`✓ ${name}`) } catch (e) { results.push(`✗ ${name}: ${e.message}`) } }

let id, file
await step("a safe SVG goes live and gets a file address", async () => {
  const r = await upload(rain, "rain.svg")
  assert.equal(r.status, 201, JSON.stringify(r.body)); id = r.body.id; file = r.body.file
  assert.match(id, /^rain-test-[a-z0-9]+$/)
})
await step("it shows in the list", async () => {
  const list = await (await fetch(`${API}/scenes`)).json()
  assert.ok(list.scenes.some(s => s.id === id && s.author === "Tester"))
  assert.ok(!JSON.stringify(list).includes("ip_hash") && !JSON.stringify(list).includes("email"))
})
await step("its file is served sandboxed", async () => {
  const res = await fetch(file)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get("content-type"), "image/svg+xml")
  assert.match(res.headers.get("content-security-policy"), /sandbox/)
  assert.equal(res.headers.get("x-content-type-options"), "nosniff")
})
await step("?as=base64 returns the same bytes as base64 text", async () => {
  const res = await fetch(file + "?as=base64")
  assert.equal(res.headers.get("content-type"), "text/plain; charset=utf-8")
  assert.equal(Buffer.from(await res.text(), "base64").toString("utf8"), rain)
})
await step("an SVG with a script is refused with the reason", async () => {
  const r = await upload(rain.replace("</svg>", "<script>alert(1)</script></svg>"), "evil.svg")
  assert.equal(r.status, 400); assert.ok(r.body.problems.some(p => p.includes("<script>")))
})
await step("a fake PNG, a wrong type, a missing licence tick and a bad link are refused", async () => {
  assert.equal((await upload("not a png", "x.png")).status, 400)
  assert.equal((await upload(rain, "x.exe")).status, 400)
  assert.ok((await upload(rain, "a.svg", { consent: "" })).body.problems.some(p => p.includes("CC BY 4.0")))
  assert.ok((await upload(rain, "a.svg", { link: "javascript:alert(1)" })).body.problems.some(p => p.includes("https")))
})
await step("an upload from another site is refused", async () => {
  const form = new FormData(); form.append("file", new Blob([rain]), "a.svg")
  assert.equal((await fetch(`${API}/scenes`, { method: "POST", body: form, headers: { Origin: "https://evil.example" } })).status, 403)
})
await step("one person gets at most 5 uploads an hour", async () => {
  const me = nextIp(); const codes = []
  for (let i = 0; i < 7; i++) { codes.push((await upload(rain, "r.svg", { name: `Burst ${i}` }, me)).status); await new Promise(r => setTimeout(r, 50)) }
  assert.ok(codes.includes(429), codes.join(","))
})
await step("a star counts once per person, can be taken back, and shows in the list", async () => {
  const me = nextIp(), other = nextIp()
  const send = (on, ip = me) => fetch(`${API}/scenes/${id}/star`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify({ on }) }).then(r => r.json())
  assert.equal((await send(true)).stars, 1)
  assert.equal((await send(true)).stars, 1)
  assert.equal((await send(true, other)).stars, 2)
  assert.equal((await send(false)).stars, 1)
  assert.equal((await (await fetch(`${API}/scenes`)).json()).scenes.find(s => s.id === id).stars, 1)
  assert.equal((await fetch(`${API}/scenes/${id}/star`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" })).status, 403)
  assert.equal((await fetch(`${API}/scenes/nope-123/star`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}" })).status, 404)
})
await step("a report counts once per person", async () => {
  const me = nextIp()
  const send = () => fetch(`${API}/scenes/${id}/report`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": me }, body: JSON.stringify({ reason: "ads", token: "XXXX.DUMMY.TOKEN.XXXX" }) }).then(r => r.json())
  assert.equal((await send()).ok, true)
  assert.equal((await send()).already, true)
})
await step(`five reports start the second look (${expect})`, async () => {
  for (let i = 0; i < 4; i++) await fetch(`${API}/scenes/${id}/report`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": nextIp() }, body: JSON.stringify({ reason: "brand", token: "XXXX.DUMMY.TOKEN.XXXX" }) })
  await new Promise(r => setTimeout(r, 1500))
  const live = (await (await fetch(`${API}/scenes`)).json()).scenes.some(s => s.id === id)
  const queue = (await (await fetch(`${API}/admin/api/queue`)).json()).scenes
  const row = queue.find(s => s.id === id)
  assert.ok(row, "on the moderation page")
  assert.equal(live, expect === "kept"); assert.equal(row.status, expect === "kept" ? "live" : "hidden")
})
await step("Keep puts it back for good, and later reports cannot hide it", async () => {
  await fetch(`${API}/admin/api/${id}/keep`, { method: "POST" })
  for (let i = 0; i < 6; i++) await fetch(`${API}/scenes/${id}/report`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": nextIp() }, body: JSON.stringify({ reason: "other", token: "XXXX.DUMMY.TOKEN.XXXX" }) })
  await new Promise(r => setTimeout(r, 800))
  assert.ok((await (await fetch(`${API}/scenes`)).json()).scenes.some(s => s.id === id))
  assert.ok(!(await (await fetch(`${API}/admin/api/queue`)).json()).scenes.some(s => s.id === id))
})
await step("Remove takes it down and deletes the file", async () => {
  await fetch(`${API}/admin/api/${id}/remove`, { method: "POST" })
  assert.ok(!(await (await fetch(`${API}/scenes`)).json()).scenes.some(s => s.id === id))
  assert.equal((await fetch(file)).status, 404)
})
const key = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")
const save = (data, origin = ORIGIN, k = key) => fetch(`${API}/settings/${k}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": nextIp() }, body: JSON.stringify(data) })
await step("settings: an unknown key has nothing saved", async () => {
  assert.equal((await fetch(`${API}/settings/${key}`)).status, 404)
})
await step("settings: the page saves a set and scene, and the plugin reads them back", async () => {
  const r = await save({ set: "clawd", scene: "nap" })
  assert.equal(r.status, 200, await r.clone().text())
  const got = await (await fetch(`${API}/settings/${key}`)).json()
  assert.equal(got.set, "clawd"); assert.equal(got.scene, "nap"); assert.ok(got.updated > 0)
  assert.equal((await save({ set: "abstract", scene: null })).status, 200)
  const again = await (await fetch(`${API}/settings/${key}`)).json()
  assert.equal(again.set, "abstract"); assert.equal(again.scene, null); assert.ok(again.updated >= got.updated)
})
await step("settings: another site, a bad key or a bad name is refused", async () => {
  assert.equal((await save({ set: "clawd", scene: null }, "https://evil.example")).status, 403)
  assert.equal((await save({ set: "clawd", scene: null }, ORIGIN, "not-a-key")).status, 404)
  assert.equal((await save({ set: "../x", scene: null })).status, 400)
  assert.equal((await save({ set: "clawd", scene: "<script>" })).status, 400)
})
await step("settings: the plugin's local copy of the page (Origin null) may save, but not upload or report", async () => {
  const r = await save({ set: "yours", scene: "rain-cloud" }, "null")
  assert.equal(r.status, 200, await r.clone().text())
  assert.equal(r.headers.get("access-control-allow-origin"), "null")
  assert.equal((await (await fetch(`${API}/settings/${key}`)).json()).scene, "rain-cloud")
  const form = new FormData(); form.append("file", new Blob([rain]), "a.svg")
  assert.equal((await fetch(`${API}/scenes`, { method: "POST", body: form, headers: { Origin: "null" } })).status, 403)
})
await step("settings: the person's own sets are saved, kept when a save leaves them out, and checked", async () => {
  const mixes = [{ id: "mix-calm1", name: "Calm", scenes: ["nostalgia/snake", "yours/Rain cloud", "clawd/nap"] }]
  const r = await save({ set: "mix-calm1", scene: null, mixes })
  assert.equal(r.status, 200, await r.clone().text())
  assert.deepEqual((await (await fetch(`${API}/settings/${key}`)).json()).mixes, mixes)
  // A save without sets (an older page) keeps them.
  assert.equal((await save({ set: "clawd", scene: null })).status, 200)
  assert.deepEqual((await (await fetch(`${API}/settings/${key}`)).json()).mixes, mixes)
  // An empty list deletes them.
  assert.equal((await save({ set: "clawd", scene: null, mixes: [] })).status, 200)
  assert.deepEqual((await (await fetch(`${API}/settings/${key}`)).json()).mixes, [])
  assert.equal((await save({ set: "clawd", scene: null, mixes: [{ id: "mix-a", name: "<b>", scenes: [] }] })).status, 400)
  assert.equal((await save({ set: "clawd", scene: null, mixes: [{ id: "mix-a", name: "ok", scenes: ["../etc/passwd"] }] })).status, 400)
  assert.equal((await save({ set: "clawd", scene: null, mixes: [{ id: "evil", name: "ok", scenes: [] }] })).status, 400)
})
await step("settings: cover mode is saved when sent and kept out of a save that leaves it out", async () => {
  assert.equal((await save({ set: "clawd", scene: null, cover: true })).status, 200)
  assert.equal((await (await fetch(`${API}/settings/${key}`)).json()).cover, true)
  assert.equal((await save({ set: "clawd", scene: null, cover: false })).status, 200)
  assert.equal((await (await fetch(`${API}/settings/${key}`)).json()).cover, false)
})
await step("the uploader removes their own scene with the key the upload gave back; nobody else can", async () => {
  const r = await upload(rain, "rain.svg", { name: "Mine to remove" })
  assert.equal(r.status, 201, JSON.stringify(r.body))
  assert.match(r.body.owner, /^[0-9a-f]{32}$/)
  const remove = (owner, origin = ORIGIN) => fetch(`${API}/scenes/${r.body.id}/remove`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ owner }) })
  assert.equal((await remove("0".repeat(32))).status, 403)
  assert.equal((await remove("not-a-key")).status, 403)
  assert.equal((await remove(r.body.owner, "https://evil.example")).status, 403)
  assert.ok((await (await fetch(`${API}/scenes`)).json()).scenes.some(s => s.id === r.body.id))
  assert.equal((await remove(r.body.owner)).status, 200)
  assert.ok(!(await (await fetch(`${API}/scenes`)).json()).scenes.some(s => s.id === r.body.id))
  assert.equal((await fetch(r.body.file)).status, 404)
  assert.ok(!JSON.stringify(await (await fetch(`${API}/scenes`)).json()).includes("owner"))
})
console.log(results.join("\n"))
process.exitCode = results.some(r => r.startsWith("✗")) ? 1 : 0
