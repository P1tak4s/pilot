// Who may use /admin. Cloudflare Access sits in front of /admin and signs a token for whoever logged in; this checks
// that token's signature, audience and expiry, and that the email is on the list. A header alone proves nothing, so
// nothing here trusts one. For `wrangler dev` only, DEV_ADMIN=1 lets requests through without Access.

let certs = { at: 0, keys: [] }

async function accessKeys(team) {
  if (Date.now() - certs.at < 10 * 60 * 1000 && certs.keys.length) return certs.keys
  const res = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`)
  if (!res.ok) throw new Error("access certs")
  certs = { at: Date.now(), keys: (await res.json()).keys ?? [] }
  return certs.keys
}

const b64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0))

// Verifies an RS256 JWT against a JWKS list. Returns the payload or null.
export async function verifyJwt(token, keys, { aud, now = Date.now() / 1000 } = {}) {
  const parts = String(token || "").split(".")
  if (parts.length !== 3) return null
  let header, payload
  try { header = JSON.parse(new TextDecoder().decode(b64url(parts[0]))); payload = JSON.parse(new TextDecoder().decode(b64url(parts[1]))) } catch { return null }
  if (header.alg !== "RS256") return null
  const jwk = keys.find(k => k.kid === header.kid)
  if (!jwk) return null
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"])
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  if (!ok) return null
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (aud && !auds.includes(aud)) return null
  if (!(payload.exp > now)) return null
  return payload
}

export async function adminEmail(request, env) {
  if (env.DEV_ADMIN === "1") return "dev@localhost"
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return null
  const token = request.headers.get("Cf-Access-Jwt-Assertion")
  const payload = await verifyJwt(token, await accessKeys(env.ACCESS_TEAM), { aud: env.ACCESS_AUD })
  const allowed = String(env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
  const email = String(payload?.email || "").toLowerCase()
  return payload && allowed.includes(email) ? email : null
}
