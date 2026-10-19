// Run: node --test market/rules.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { checkSvg, checkRaster, checkFile, checkFields, rasterSize } from "./rules.mjs"

const svg = inner => `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 560 350">${inner}</svg>`
const bytes = s => new TextEncoder().encode(s)

test("a plain animated scene passes and reports its size", () => {
  const out = checkSvg(svg('<rect width="10" height="10" fill="#d97757"><animate attributeName="x" from="0" to="20" dur="2s" repeatCount="indefinite"/></rect><use href="#a"/><g id="a" fill="url(#g)"/>'))
  assert.deepEqual(out.problems, [])
  assert.equal(out.width, 560)
})

test("an embedded raster image passes, a fetched one does not", () => {
  assert.deepEqual(checkSvg(svg('<image href="data:image/png;base64,iVBORw0KGgo=" width="10" height="10"/>')).problems, [])
  assert.ok(checkSvg(svg('<image href="https://example.com/x.png"/>')).problems.some(p => p.includes("points outside")))
  assert.ok(checkSvg(svg('<image xlink:href="data:image/svg+xml;base64,PHN2Zz4="/>')).problems.some(p => p.includes("points outside")))
})

test("anything that can run code is refused", () => {
  const cases = {
    script: svg("<script>alert(1)</script>"),
    handler: svg('<rect onload="alert(1)" width="1" height="1"/>'),
    handlerSingle: svg("<rect onclick='x()' width='1' height='1'/>"),
    foreign: svg("<foreignObject><div>hi</div></foreignObject>"),
    link: svg('<a href="javascript:alert(1)"><rect/></a>'),
    animateHref: svg('<set attributeName="href" to="javascript:alert(1)"/>'),
    namespaced: svg("<svg:script>alert(1)</svg:script>"),
    cdata: svg("<style><![CDATA[rect{}]]></style>"),
  }
  for (const [name, text] of Object.entries(cases)) assert.ok(checkSvg(text).problems.length > 0, name)
})

test("nothing can be fetched from outside the file", () => {
  assert.ok(checkSvg(svg('<rect fill="url(https://x.example/a)" width="1" height="1"/>')).problems.length)
  assert.ok(checkSvg(svg('<style>@import "https://x.example/a.css";</style>')).problems.length)
  assert.ok(checkSvg(svg("<style>rect{fill:url(https://x.example/a)}</style>")).problems.length)
  assert.deepEqual(checkSvg(svg("<style>rect{fill:url(#g)}</style>")).problems, [])
})

test("entities, doctype and oversized or tiny images are refused", () => {
  assert.ok(checkSvg('<!DOCTYPE svg [<!ENTITY a "aaaa">]>' + svg("")).problems.length)
  assert.ok(checkSvg(svg("<rect/>").replace('width="560"', 'width="4000"')).problems.some(p => p.includes("longest side")))
  assert.ok(checkSvg(svg("<rect/>").replace('height="350"', 'height="8"')).problems.some(p => p.includes("shortest side")))
  assert.ok(checkSvg(svg("x".repeat(310 * 1024))).problems.some(p => p.includes("limit")))
  assert.ok(checkSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>').problems.some(p => p.includes("width and height")))
})

test("raster headers are read, and a file must be what its name says", () => {
  const png = new Uint8Array(33); png.set([137, 80, 78, 71, 13, 10, 26, 10]); new DataView(png.buffer).setUint32(16, 200); new DataView(png.buffer).setUint32(20, 120)
  assert.deepEqual(rasterSize(png, "png"), [200, 120])
  assert.deepEqual(checkRaster(png, "png").problems, [])
  const gif = new Uint8Array([...bytes("GIF89a"), 64, 0, 48, 0, ...new Uint8Array(10)])
  assert.deepEqual(rasterSize(gif, "gif"), [64, 48])
  assert.ok(checkRaster(png, "gif").problems.some(p => p.includes("not a real")))
  assert.ok(checkFile("scene.exe", png).problems.length)
  assert.equal(checkFile("Rain.SVG", bytes(svg("<rect/>"))).ext, "svg")
})

test("form fields are checked and cleaned", () => {
  const ok = checkFields({ name: " Rain  cloud ", author: "Isac", link: "https://x.com/heycubit", consent: "yes" })
  assert.deepEqual(ok.problems, [])
  assert.equal(ok.values.name, "Rain cloud")
  assert.ok(checkFields({ name: "Rain", author: "Isac" }).problems.some(p => p.includes("CC BY 4.0")))
  assert.ok(checkFields({ name: "<b>", author: "Isac", consent: "yes" }).problems.some(p => p.includes("< or >")))
  assert.ok(checkFields({ name: "Rain", author: "Isac", link: "javascript:alert(1)", consent: "yes" }).problems.some(p => p.includes("https")))
  assert.ok(checkFields({ name: "Rain", author: "Isac", email: "nope", consent: "yes" }).problems.some(p => p.includes("email")))
})

test("a link under any namespace prefix is checked like href", () => {
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xlink" width="100" height="100">${body}</svg>`
  assert.ok(checkSvg(wrap('<image x:href="https://example.com/p.png" width="10" height="10"/>')).problems.some(p => p.includes("points outside")))
  assert.ok(checkSvg(wrap('<set attributeName="x:href" to="https://example.com/p.png"/>')).problems.some(p => p.includes("may not animate")))
})
