// Run: node --test test/access.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { verifyJwt } from "../src/access.mjs"

const enc = o => Buffer.from(JSON.stringify(o)).toString("base64url")
async function keypair(kid) {
  const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])
  return { privateKey, jwk: { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid } }
}
async function sign(privateKey, payload, kid = "k1", alg = "RS256") {
  const head = `${enc({ alg, kid })}.${enc(payload)}`
  const sig = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(head))).toString("base64url")
  return `${head}.${sig}`
}

test("a valid Access token is accepted, anything off is not", async () => {
  const { privateKey, jwk } = await keypair("k1")
  const other = await keypair("k1")
  const now = Math.floor(Date.now() / 1000)
  const good = { aud: ["app-aud"], email: "me@example.com", exp: now + 600 }
  assert.equal((await verifyJwt(await sign(privateKey, good), [jwk], { aud: "app-aud" }))?.email, "me@example.com")
  assert.equal(await verifyJwt(await sign(privateKey, good), [jwk], { aud: "other-aud" }), null, "wrong audience")
  assert.equal(await verifyJwt(await sign(privateKey, { ...good, exp: now - 5 }), [jwk], { aud: "app-aud" }), null, "expired")
  assert.equal(await verifyJwt(await sign(other.privateKey, good), [jwk], { aud: "app-aud" }), null, "signed by another key")
  assert.equal(await verifyJwt(await sign(privateKey, good, "k9"), [jwk], { aud: "app-aud" }), null, "unknown key id")
  assert.equal(await verifyJwt(await sign(privateKey, good, "k1", "none"), [jwk], { aud: "app-aud" }), null, "alg none")
  assert.equal(await verifyJwt("garbage", [jwk], { aud: "app-aud" }), null)
})
