// The safety rules every community scene must pass before anyone else can get it. Pure functions on bytes and
// text, no file system, so the upload Worker and the plugin can both run them. Anything that could run code, load
// something from the internet or slow the chat down is refused, never silently cleaned: the uploader is told what
// to fix.

export const LIMITS = { svgBytes: 300 * 1024, rasterBytes: 95 * 1024, maxSide: 1024, minSide: 32 }
export const TYPES = { svg: "image/svg+xml", gif: "image/gif", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" }
// Recommended shapes, the ones the built-in scenes use.
export const SIZES = { wide: [560, 350], square: [560, 560], tall: [560, 840] }

// SVG elements a scene may use: shapes, paint, masks, filters and SMIL animation. Everything else is refused,
// including script, foreignObject (HTML inside SVG), iframe, audio and video.
const ELEMENTS = new Set([
  "svg", "g", "defs", "title", "desc", "symbol", "use", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "path", "text", "tspan", "image", "linearGradient", "radialGradient", "stop", "pattern", "mask", "clipPath",
  "marker", "style", "filter", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix",
  "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB",
  "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset",
  "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "animate", "animateMotion",
  "animateTransform", "set", "mpath",
])
// A link may point inside the file (#id) or hold a small embedded raster image; nothing may be fetched.
const SAFE_HREF = /^(#[\w.:-]+|data:image\/(png|gif|webp|jpeg);base64,[A-Za-z0-9+/=\s]+)$/
// url(...) in styles and paint may only point inside the file.
const BAD_URL = /url\(\s*(['"]?)(?!#)[^)]*\)/i

function side(w, h) {
  const out = []
  if (Math.max(w, h) > LIMITS.maxSide) out.push(`the image is ${w}x${h}; the longest side may be ${LIMITS.maxSide} px`)
  if (Math.min(w, h) < LIMITS.minSide) out.push(`the image is ${w}x${h}; the shortest side must be at least ${LIMITS.minSide} px`)
  return out
}

// Returns { problems, width, height } for an SVG's text.
export function checkSvg(text) {
  const problems = []
  const bytes = new TextEncoder().encode(text).length
  if (bytes > LIMITS.svgBytes) problems.push(`the SVG is ${Math.round(bytes / 1024)} KB; the limit is ${LIMITS.svgBytes / 1024} KB`)
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) problems.push("DOCTYPE and ENTITY declarations are not allowed")
  if (/<\?(?!xml\s)/i.test(text)) problems.push("processing instructions other than <?xml ...?> are not allowed")
  const body = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?xml[^>]*\?>/i, "")
  if (/<!\[CDATA\[/i.test(body)) problems.push("CDATA sections are not allowed")
  const tags = [...body.matchAll(/<\s*([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)]
  if (!tags.length || tags[0][1] !== "svg") problems.push("the file must start with an <svg> element")
  for (const [, name, attrs] of tags) {
    const local = name.replace(/^svg:/, "")
    if (!ELEMENTS.has(local)) { problems.push(`<${name}> is not allowed`); continue }
    for (const m of attrs.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const key = m[1], value = m[3] ?? m[4] ?? "", k = key.toLowerCase()
      if (k.startsWith("on")) problems.push(`<${name}> has an event handler (${key}); scenes cannot run code`)
      else if (/(^|:)(href|src)$/.test(k)) {
        if (!SAFE_HREF.test(value.trim())) problems.push(`<${name} ${key}> points outside the file; only #ids and embedded PNG, GIF, WebP or JPEG are allowed`)
      } else if (BAD_URL.test(value)) problems.push(`<${name} ${key}> uses url() outside the file`)
      else if (/javascript:|expression\s*\(/i.test(value)) problems.push(`<${name} ${key}> holds code`)
      if ((local === "set" || local.startsWith("animate")) && k === "attributename" && /(^|:)(href|on\w+)$/i.test(value)) problems.push(`<${name}> may not animate ${value}`)
    }
  }
  for (const [, css] of body.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (/@import/i.test(css)) problems.push("@import in <style> is not allowed")
    if (BAD_URL.test(css)) problems.push("url() in <style> may only point inside the file")
  }
  const root = tags[0]?.[2] ?? ""
  const width = Number(root.match(/\swidth\s*=\s*["']([\d.]+)/)?.[1])
  const height = Number(root.match(/\sheight\s*=\s*["']([\d.]+)/)?.[1])
  if (!width || !height) problems.push('the <svg> element needs width and height in pixels, for example width="560" height="350"')
  else problems.push(...side(width, height))
  return { problems: [...new Set(problems)], width, height }
}

// Reads width and height from a raster file's own header; null when the bytes are not that type.
export function rasterSize(bytes, ext) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const str = (from, to) => String.fromCharCode(...b.subarray(from, to))
  const type = TYPES[ext]
  if (type === "image/png" && b.length > 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => b[i] === x)) return [v.getUint32(16), v.getUint32(20)]
  if (type === "image/gif" && b.length > 10 && /^GIF8[79]a$/.test(str(0, 6))) return [v.getUint16(6, true), v.getUint16(8, true)]
  if (type === "image/webp" && b.length > 30 && str(0, 4) === "RIFF" && str(8, 12) === "WEBP") {
    const chunk = str(12, 16)
    const u24 = o => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)
    if (chunk === "VP8X") return [1 + u24(24), 1 + u24(27)]
    if (chunk === "VP8 ") return [v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff]
    if (chunk === "VP8L") { const x = v.getUint32(21, true); return [1 + (x & 0x3fff), 1 + ((x >>> 14) & 0x3fff)] }
  }
  if (type === "image/jpeg" && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue }
      const marker = b[i + 1], len = v.getUint16(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [v.getUint16(i + 7), v.getUint16(i + 5)]
      i += 2 + len
    }
  }
  return null
}

export function checkRaster(bytes, ext) {
  const problems = []
  if (bytes.byteLength > LIMITS.rasterBytes) problems.push(`the image is ${Math.round(bytes.byteLength / 1024)} KB; the limit is ${LIMITS.rasterBytes / 1024} KB`)
  const size = rasterSize(bytes, ext)
  if (!size) problems.push(`the file is not a real .${ext} image`)
  else problems.push(...side(size[0], size[1]))
  return { problems, width: size?.[0], height: size?.[1] }
}

// One uploaded file, judged by its name's extension and its bytes.
export function checkFile(filename, bytes) {
  const ext = String(filename).toLowerCase().split(".").pop()
  if (!TYPES[ext] || !/\./.test(filename)) return { problems: ["the file must be an .svg, .gif, .png, .webp or .jpg"], ext }
  const out = ext === "svg" ? checkSvg(new TextDecoder("utf-8", { fatal: false }).decode(bytes)) : checkRaster(bytes, ext)
  return { ...out, ext: ext === "jpeg" ? "jpg" : ext, type: TYPES[ext] }
}

// The text fields of an upload. Returns problems and the cleaned values.
export function checkFields(f) {
  const problems = []
  const text = (k, max, required) => {
    const v = String(f[k] ?? "").trim().replace(/\s+/g, " ")
    if (!v) { if (required) problems.push(`${k} is required`); return "" }
    if (v.length > max) problems.push(`${k} may be at most ${max} characters`)
    if (/[<>]/.test(v)) problems.push(`${k} may not contain < or >`)
    return v
  }
  const name = text("name", 40, true)
  const author = text("author", 40, true)
  const description = text("description", 140, false)
  let link = String(f.link ?? "").trim()
  if (link) {
    try { const u = new URL(link); if (u.protocol !== "https:" || link.length > 200) throw 0; link = u.href } catch { problems.push("link must be an https address"); link = "" }
  }
  let email = String(f.email ?? "").trim()
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) { problems.push("email does not look right"); email = "" }
  if (f.consent !== "yes" && f.consent !== true) problems.push("tick the box to confirm you made this and share it under CC BY 4.0")
  return { problems, values: { name, author, description, link, email } }
}
