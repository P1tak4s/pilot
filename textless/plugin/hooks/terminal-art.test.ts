import { describe, expect, test } from 'claude-code/testing'
import { readable, sceneCells } from './terminal-art'

// A frame of two groups that swap on a discrete opacity clock, and a block that steps right with a translate.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8" viewBox="0 0 16 8">
<g><animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.5" dur="2s" repeatCount="indefinite"/><rect x="0" y="0" width="4" height="4" fill="#ff0000"/></g>
<g opacity="0"><animate attributeName="opacity" calcMode="discrete" values="0;1" keyTimes="0;0.5" dur="2s" repeatCount="indefinite"/><rect x="0" y="0" width="4" height="4" fill="#00ff00"/></g>
<g><animateTransform attributeName="transform" type="translate" calcMode="discrete" values="0 0;8 0" keyTimes="0;0.5" dur="2s" repeatCount="indefinite"/><rect x="0" y="4" width="4" height="4" fill="#0000ff"/></g>
</svg>`

describe('terminal art plays', () => {
  test('the same scene read at later times gives other frames, and loops', () => {
    const a = sceneCells(SVG, 16, 4, 0.2)
    const b = sceneCells(SVG, 16, 4, 1.2)
    const c = sceneCells(SVG, 16, 4, 2.2)
    expect(a).not.toBeNull()
    expect(a!.cells).not.toBe(b!.cells)
    expect(a!.cells).toBe(c!.cells)
  })
})

describe('terminal art reads more of the scenes', () => {
  test('a group fill is inherited, a moving shape moves, and a scene of embedded pictures is not readable', () => {
    const grouped = `<svg width="8" height="4" viewBox="0 0 8 4"><g fill="#ff0000"><rect x="0" y="0" width="2" height="2"/></g></svg>`
    expect(sceneCells(grouped, 8, 4)).not.toBeNull()
    const moving = `<svg width="16" height="4" viewBox="0 0 16 4"><rect y="0" width="2" height="2" fill="#fff"><animate attributeName="x" values="0;8" keyTimes="0;0.5" calcMode="discrete" dur="2s" repeatCount="indefinite"/></rect></svg>`
    expect(sceneCells(moving, 16, 4, 0.2)!.cells).not.toBe(sceneCells(moving, 16, 4, 1.2)!.cells)
    expect(readable(moving)).toBe(true)
    expect(readable(`<svg width="8" height="4" viewBox="0 0 8 4"><image href="data:image/png;base64,AA"/><rect width="2" height="2" fill="#fff"/></svg>`)).toBe(false)
  })
})
