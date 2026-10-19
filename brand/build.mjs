// Builds the brand files from mark.svg: a white version, the icon tile in PNG sizes, the favicon, the lockup with the
// name, and the GitHub social preview. PNGs are rendered in Chromium through Playwright.
//   node brand/build.mjs [path-to-playwright]
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./', import.meta.url))
const pw = process.argv[2] || 'playwright'
const { chromium } = createRequire(import.meta.url)(pw)

const mark = fs.readFileSync(dir + 'mark.svg', 'utf8')
// The mark's inner parts, with its mask and clip ids made unique per use so several copies can share a page.
const inner = (id) => mark.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '').split('em').join(id)
const BG = '#15121f', FONT = 'Outfit'

// White, one colour, for dark photos and print.
fs.writeFileSync(dir + 'mark-white.svg', mark.replace(/fill="#(a79cf7|cfc7ff|7566d8)"/g, 'fill="#ffffff"'))

// The icon: the mark on a rounded dark tile.
const tile = (id = 't') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${BG}"/><g transform="translate(12 12) scale(.76)">${inner(id)}</g></svg>`
fs.writeFileSync(dir + 'favicon.svg', tile())

// The lockup: mark and name side by side.
const lockup = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 120"><g transform="translate(0 10) scale(1)">${inner('l')}</g><text x="118" y="80" font-family="${FONT}, Inter, sans-serif" font-weight="500" font-size="72" letter-spacing="-1.6" fill="${color}">effortless</text></svg>`
fs.writeFileSync(dir + 'lockup.svg', lockup('#f4f2ff'))
fs.writeFileSync(dir + 'lockup-dark-text.svg', lockup('#15121f'))

const fontLink = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500&family=Inter:wght@400&display=swap" rel="stylesheet">`
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())
async function png(html, w, h, file) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await p.setContent(`<!doctype html><html><head>${fontLink}<style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}svg{display:block}</style></head><body>${html}</body></html>`)
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200)
  await p.screenshot({ path: dir + file, omitBackground: true }); await p.close()
}
for (const s of [16, 32, 48, 180, 192, 512]) await png(tile().replace('<svg ', `<svg width="${s}" height="${s}" `), s, s, `icon-${s}.png`)
await png(lockup('#f4f2ff').replace('<svg ', '<svg width="864" height="240" '), 864, 240, 'lockup.png')

// GitHub social preview, 1280x640: the mark large on the site's dark purple, with the name and one line.
await png(`<div style="position:relative;width:1280px;height:640px;background:radial-gradient(60% 80% at 75% 50%,#2a2350 0%,#15121f 60%,#111014 100%);font-family:${FONT},sans-serif;color:#f4f2ff">
  <svg viewBox="0 0 100 100" style="position:absolute;right:120px;top:120px;width:400px;height:400px">${inner('s')}</svg>
  <div style="position:absolute;left:96px;top:220px;font-weight:500;font-size:112px;letter-spacing:-3px">effortless</div>
  <div style="position:absolute;left:100px;top:360px;font:400 34px Inter,sans-serif;color:#c3bfd2;width:640px;line-height:1.35">Picks the reasoning effort for every prompt in Claude Code.</div></div>`, 1280, 640, 'social-preview.png')
await browser.close()
console.log('built')
