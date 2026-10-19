(() => {
  const host = document.querySelector('[data-plugin-drawn]')
  const root = host.shadowRoot
  const tree = root.querySelector('[data-engine-tree]')
  const sides = ['top', 'right', 'bottom', 'left']
  const props = ['display', 'position', ...sides, 'z-index', 'box-sizing', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-wrap',
    'align-items', 'align-self', 'justify-content', 'row-gap', 'column-gap', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    ...sides.map(s => `margin-${s}`), ...sides.map(s => `padding-${s}`), ...sides.flatMap(s => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
    'background-color', 'background-image', 'color', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
    'text-align', 'text-decoration-line', 'white-space', 'overflow-x', 'overflow-y', 'text-overflow', 'word-break', 'overflow-wrap', 'vertical-align',
    'box-shadow', 'outline-style', 'cursor', 'transform', 'visibility', 'font-variant-numeric', 'font-feature-settings', 'object-fit', 'pointer-events']
  const frame = document.createElement('iframe')
  document.body.appendChild(frame)
  const idoc = frame.contentDocument
  const defaults = {}
  const def = tag => {
    if (!defaults[tag]) {
      const el = idoc.createElement(tag)
      idoc.body.appendChild(el)
      const cs = frame.contentWindow.getComputedStyle(el)
      defaults[tag] = Object.fromEntries(props.map(p => [p, cs.getPropertyValue(p)]))
    }
    return defaults[tag]
  }
  const clone = tree.cloneNode(true)
  const src = [tree, ...tree.querySelectorAll('*')]
  const dst = [clone, ...clone.querySelectorAll('*')]
  src.forEach((el, i) => {
    const cs = getComputedStyle(el)
    const d = def(el.tagName.toLowerCase())
    const st = []
    const sized = ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'flex-basis']
    for (const p of props) {
      // Sizes come from the renderer's own inline style only: a measured px would freeze text widths to this font.
      if (sized.includes(p) && el.tagName !== 'IMG') {
        const own = el.style.getPropertyValue(p)
        if (own) st.push(`${p}:${own}`)
        continue
      }
      const v = cs.getPropertyValue(p)
      if (v !== d[p]) st.push(`${p}:${v}`)
    }
    const o = dst[i]
    for (const a of [...o.attributes]) if (!['src', 'alt', 'width', 'height', 'type'].includes(a.name)) o.removeAttribute(a.name)
    o.setAttribute('style', st.join(';').replace(/"/g, "'"))
  })
  frame.remove()
  return clone.outerHTML
})()
