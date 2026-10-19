// The AI look: Claude Haiku sees the image with its title and description and says whether it breaks the
// marketplace's content rules. An SVG is drawn to a PNG first so Haiku sees the picture, not the code. Haiku is
// asked for a fixed JSON verdict; anything else (an error, a refusal, an unreadable answer) counts as "not sure",
// and callers treat "not sure" as not allowed. Nothing goes live without a clear yes.
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { initWasm, Resvg } from "@resvg/resvg-wasm"
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm"

const MODEL = "claude-haiku-5-5"
export const CATEGORIES = ["ok", "sexual", "hateful", "violent", "ads", "brand", "other"]
const Verdict = z.object({
  allowed: z.boolean(),
  category: z.enum(CATEGORIES),
  reason: z.string(),
})

const RULES = `You check images people upload to a free gallery of small animations that play inside a coding app while it works.
Allowed: original art, pixel art, abstract art, cute characters, Clawd (Anthropic's orange crab-like mascot) fan art, landscapes, jokes that are kind.
Not allowed:
- sexual: nudity or sexual content of any kind
- hateful: hate symbols, slurs, mocking a group of people
- violent: gore, weapons aimed at people, self-harm
- ads: promotion, QR codes, links, contact details, "buy", crypto
- brand: logos, mascots or characters owned by companies other than Anthropic's Clawd
- other: personal data, harassment of a real person, anything else unsafe for a work screen
Judge what the image shows and what its title and description say. When in doubt, it is not allowed.`

let wasmReady
async function svgToPng(svgText) {
  wasmReady ??= initWasm(resvgWasm)
  await wasmReady
  // Drawn at most 512 px wide: plenty for Haiku to see, small enough to be quick. Animations show their first frame.
  const png = new Resvg(svgText, { fitTo: { mode: "width", value: 512 }, font: { loadSystemFonts: false } }).render().asPng()
  return png
}

function base64(bytes) {
  let s = ""
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// The picture Haiku sees: PNG for SVGs, the file itself for raster types it reads directly.
export async function picture(bytes, ext) {
  if (ext === "svg") return { media: "image/png", data: base64(await svgToPng(new TextDecoder().decode(bytes))) }
  const media = { png: "image/png", gif: "image/gif", webp: "image/webp", jpg: "image/jpeg" }[ext]
  return { media, data: base64(bytes) }
}

// Returns { allowed, category, reason, sure }. `extra` adds context, for example the reasons in reports.
export async function judge(env, image, text, extra = "") {
  if (env.AI_FAKE) {
    // Local development only: no key, no call. "pass", "fail" or "unsure"; AI_FAKE_RECHECK overrides the second look.
    const f = (extra && env.AI_FAKE_RECHECK) || env.AI_FAKE
    return f === "pass" ? { allowed: true, category: "ok", reason: "fake pass", sure: true }
      : f === "fail" ? { allowed: false, category: "other", reason: "fake fail", sure: true }
      : { allowed: false, category: "other", reason: "fake unsure", sure: false }
  }
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "low", format: zodOutputFormat(Verdict) },
      system: RULES,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.media, data: image.data } },
          { type: "text", text: `${text}${extra ? `\n\n${extra}` : ""}\n\nIs this allowed?` },
        ],
      }],
    })
    if (response.stop_reason === "refusal" || !response.parsed_output) return { allowed: false, category: "other", reason: "the check could not decide", sure: false }
    return { ...response.parsed_output, sure: true }
  } catch (err) {
    return { allowed: false, category: "other", reason: "the check is not available right now", sure: false, error: String(err?.status ?? err?.message ?? err) }
  }
}
