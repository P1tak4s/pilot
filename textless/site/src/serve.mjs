// Serves site/ on http://127.0.0.1:4318 for a local look. Nothing here deploys anything.
// Usage: node site/src/serve.mjs
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const port = Number(process.env.PORT) || 4318
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".jpg": "image/jpeg" }
// Both loopbacks, so http://localhost works where it resolves to ::1; nothing listens beyond this machine.
const handle = (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname)
  if (p.endsWith("/")) p += "index.html"
  const file = path.join(root, p)
  if (!file.startsWith(root)) { res.writeHead(403); return res.end() }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found") }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" })
    res.end(data)
  })
}
http.createServer(handle).listen(port, "127.0.0.1", () => console.log(`textless site on http://127.0.0.1:${port}/ and http://localhost:${port}/`))
http.createServer(handle).listen(port, "::1").on("error", () => {})
