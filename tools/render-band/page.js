// Runs in the rig page. Loads the desktop app's own renderer chunk (the module that turns a plugin's Box/Text/Button/Svg
// tree into DOM inside a shadow root), evaluates it with its imports stubbed, and draws the dumped tree with it, inside
// the same wrappers and classes the app puts around the band above the prompt. Nothing here re-implements the mapping:
// the element-to-CSS code, the button and hotkey-chip styles and the band's surface CSS all come from the app's bundle.
/* global RIG */
;(async () => {
  const status = (text) => {
    document.documentElement.setAttribute('data-rig-status', text)
  }
  try {
    const R = window.RIG
    // In --serve mode, make one CSS px as many device px as in the app (its page zoom), whatever this browser's own is.
    if (R.matchZoom) document.documentElement.style.zoom = String(R.matchZoom / devicePixelRatio)
    const [source, ...modules] = await Promise.all([
      fetch(R.rendererUrl).then((r) => r.text()),
      ...R.realModules.map((m) => import(m.url)),
    ])

    // --- Turn the ES module into a function body ---------------------------------------------------------------
    // Named imports become look-ups in a scope object; the module's own top-level vars land there too (see below).
    const imports = new Map() // local name -> { from, name }
    let body = source.replace(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)";?/g, (_m, list, from) => {
      for (const part of list.split(',')) {
        const m = part.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
        if (m) imports.set(m[2] ?? m[1], { from, name: m[1] })
      }
      return ';'
    })
    body = body.replace(/import\s*"[^"]+";?/g, ';')
    body = body.replace(/export\s*\{[^}]*\}(?=[;\s]*$)/, '')
    body = body.replace(/import\.meta/g, '__importMeta')

    // --- The scope: real values for what the renderer needs, inert stubs for the rest of the app ----------------
    const stub = (() => {
      const target = function () {}
      let proxy
      proxy = new Proxy(target, {
        get(_t, key) {
          if (key === Symbol.toPrimitive) return () => ''
          if (key === Symbol.iterator) return function* () {}
          if (key === Symbol.asyncIterator) return async function* () {}
          if (key === Symbol.hasInstance) return () => false
          if (key === 'then') return undefined
          if (key === 'prototype') return target.prototype
          if (key === 'toString' || key === 'valueOf') return () => ''
          if (key === 'length') return 0
          return proxy
        },
        apply: () => proxy,
        construct: () => proxy,
        set: () => true,
        has: () => false,
        defineProperty: () => true,
        deleteProperty: () => true,
      })
      return proxy
    })()
    const real = {
      // Self-contained modules imported for real: the design tokens (plain data) and DOMPurify (interactive Svg).
      ...Object.fromEntries(R.realModules.map((m, i) => [m.key, modules[i][m.export]])),
      // ownerWindow and asElement, two one-liners in the app's shared chunks (render.mjs checks their source).
      [R.windowImport]: (e) => (e ? (e.nodeType === 9 ? e : e.ownerDocument)?.defaultView ?? null : null),
      [R.elementImport]: (e) => (e?.nodeType === 1 ? e : null),
    }
    const resolved = new Map()
    for (const [local, { from, name }] of imports) {
      const key = `${from.replace(/^\.\//, '').replace(/-[\w-]{8}\.js$/, '')}:${name}` // same key as render.mjs keyOf
      resolved.set(local, key in real ? real[key] : stub)
      if (key in real) R.used.push(`${local} = ${key}`)
    }
    const store = new Map()
    const scope = new Proxy(Object.create(null), {
      has: (_t, key) => key !== '__scope' && typeof key === 'string',
      get(_t, key) {
        if (key === Symbol.unscopables) return undefined
        if (store.has(key)) return store.get(key)
        if (resolved.has(key)) return resolved.get(key)
        if (key === '__importMeta') return { url: location.href, env: {} }
        if (key in globalThis) {
          const v = globalThis[key]
          // Native functions called through the scope would get it as `this`; constructors and namespaces stay as is.
          return typeof v === 'function' && /^[a-z]/.test(key) ? v.bind(globalThis) : v
        }
        return stub
      },
      set(_t, key, value) {
        store.set(key, value)
        return true
      },
    })
    // The functions to call, by role. render.mjs found their minified names in the chunk by content (rendererNames);
    // the module's top-level bindings are local to the function below, so it hands them back by those names.
    const grab = Object.entries(R.names).map(([role, n]) => `${role}:typeof ${n}==="undefined"?undefined:${n}`).join(',')
    // eslint-disable-next-line no-new-func
    const run = new Function('__scope', `with(__scope){${body}\n;return {${grab}}}`)
    const app = run(scope)
    const expect = { surfaceCss: 'string' }
    const wrong = Object.keys(R.names).filter((role) => typeof app[role] !== (expect[role] ?? 'function'))
    if (wrong.length) throw new Error(`renderer chunk changed: ${wrong.map((r) => `${r} (${R.names[r]}) is ${typeof app[r]}`).join(', ')}`)
    if (!app.surfaceCss.includes('--engine-band-line')) throw new Error(`renderer chunk changed: surfaceCss (${R.names.surfaceCss}) has no --engine-band-line`)

    // --- Draw ---------------------------------------------------------------------------------------------------
    const host = document.querySelector('[data-plugin-drawn]')
    const root = app.attachRoot(host, app.surfaceCss) // shadow root + the app's engine CSS + the band's surface CSS
    const handlers = { press: () => undefined, input: () => undefined, select: () => undefined }
    // One redraw as the app does it: the tree shaped and built again, the old band swapped out whole (which is why an
    // image's CSS animation starts over on every redraw).
    const draw = (tree) => {
      root.querySelector('[data-engine-tree]')?.remove()
      const shaped = app.shapeTree(tree) // the band's shapeTree (without the host's "Turn off" button)
      const marks = app.newMarks()
      const drawn = app.buildTree(shaped, handlers, app.colorOf, marks, app.inkOf(host), true)
      if (drawn) {
        drawn.setAttribute('data-engine-tree', '')
        if (!drawn.matches('a[href],button,input,select,textarea')) drawn.setAttribute('tabindex', '-1')
        root.insertBefore(drawn, root.children[1] ?? null)
      }
      app.applyHover(root, marks.hoverRules)
    }
    draw(R.tree)
    // --trace: replay the recorded redraws at their clock times (ms after the first act). Renders inside one act come
    // a frame apart, as the app draws them.
    window.RIG_PLAY = () => {
      for (const step of R.trace.slice(1))
        for (let k = 0; k < step.renders; k++) setTimeout(() => draw(step.tree), step.t + k * 16)
    }
    await document.fonts.ready
    // Images (the Svg leaves are <img> with data: URLs) decode before the screenshot.
    await Promise.all([...root.querySelectorAll('img')].map((i) => i.decode().catch(() => undefined)))
    window.RIG_MEASURE = measure(root)
    // --hit: render.mjs calls this right before the shot (after --wait), so it sees what a click would see then.
    window.RIG_HIT = () => R.hit.map((key) => hitTest(root, R.tree, key))
    status('ready')
  } catch (err) {
    console.error(err)
    document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88">${String(err && err.stack || err)}</pre>`)
    status('error')
  }

  /**
   * --hit: where a click on the thing keyed `key` lands. A Button key reaches the DOM as data-press-key; a Box key
   * does not, so a Box is found from the tree: the smallest element around its buttons that also holds its texts and
   * its images (the Box itself, since its overlay buttons sit inside it). Points across the visible part of that box
   * (clipped by every ancestor that clips) go through the shadow root's elementFromPoint, which honours
   * pointer-events and stacking as a real click does, and each reports the key of the button it hits.
   */
  function hitTest(root, tree, key) {
    const band = root.querySelector('[data-engine-tree]').getBoundingClientRect()
    const rel = (r) => ({ x: +(r.left - band.left).toFixed(2), y: +(r.top - band.top).toFixed(2), w: +(r.right - r.left).toFixed(2), h: +(r.bottom - r.top).toFixed(2) })
    const node = findNode(tree, key)
    const sel = (k) => `button[data-press-key="${CSS.escape(k)}"]`
    let target = root.querySelector(sel(key))
    let kind = 'Button'
    const leaves = { buttons: [], texts: [], alts: [] }
    if (!target) {
      if (!node) return { key, error: 'no element with this key in the tree' }
      collect(node, leaves)
      const buttons = leaves.buttons.flatMap((k) => [...root.querySelectorAll(sel(k))])
      if (!buttons.length) return { key, error: 'no button under this key: nothing to click' }
      kind = node.type
      target = buttons.reduce(commonAncestor)
      const holds = (el) =>
        leaves.texts.every((t) => el.textContent.includes(t)) && leaves.alts.every((a) => el.matches(`img[alt="${CSS.escape(a)}"]`) || el.querySelector(`img[alt="${CSS.escape(a)}"]`))
      while (target !== root && !holds(target)) target = target.parentNode
      if (target === root) return { key, error: 'could not find the element around its buttons, texts and images' }
    }
    const box = visible(target)
    if (!box) return { key, kind, error: 'not visible (clipped away)' }
    const xs = [['left+2', box.left + 2], ['25%', box.left + box.width * 0.25], ['center', box.left + box.width / 2], ['75%', box.left + box.width * 0.75], ['right-2', box.right - 2]]
    const ys = [['top+2', box.top + 2], ['middle', box.top + box.height / 2], ['bottom-2', box.bottom - 2]]
    const rows = ys.map(([yName, y]) => ({
      y: yName,
      hits: xs.map(([xName, x]) => {
        const el = root.elementFromPoint(x, y)
        const button = el?.closest?.('button')
        const what = !el ? '(nothing)' : button ? (button.getAttribute('data-press-key') ?? '(button, no key)') : `(no button: ${el.tagName.toLowerCase()})`
        return { x: xName, at: [+(x - band.left).toFixed(1), +(y - band.top).toFixed(1)], hit: what }
      }),
    }))
    // The buttons that belong to the target, with their full and their visible boxes: a button narrower than the
    // box it covers, or clipped by an overflow:hidden layer, explains a dead zone.
    const own = (kind === 'Button' ? [target] : leaves.buttons.flatMap((k) => [...root.querySelectorAll(sel(k))])).map((b) => {
      const v = visible(b)
      return { key: b.getAttribute('data-press-key'), box: rel(b.getBoundingClientRect()), visible: v ? rel(v) : null }
    })
    return { key, kind, box: rel(target.getBoundingClientRect()), visible: rel(box), buttons: own, rows }
  }

  function findNode(node, key) {
    if (typeof node !== 'object' || node === null) return null
    if (node.props?.key === key) return node
    for (const c of node.children ?? []) {
      const f = findNode(c, key)
      if (f) return f
    }
    return null
  }

  function collect(node, leaves) {
    if (typeof node === 'string') return
    if (node.type === 'Button' && node.props?.key) leaves.buttons.push(node.props.key)
    if (node.type === 'Svg' && node.props?.alt) leaves.alts.push(node.props.alt)
    for (const c of node.children ?? []) {
      // The texts a Box holds, trimmed; a label of no-break spaces (an overlay button) is not text to look for.
      if (typeof c === 'string' && node.type === 'Text' && c.trim()) leaves.texts.push(c.trim())
      else collect(c, leaves)
    }
  }

  function commonAncestor(a, b) {
    for (let p = a; p; p = p.parentNode) if (p.contains(b)) return p
    return null
  }

  /** The element's box clipped by each ancestor (across the shadow root) that clips its content, and the viewport. */
  function visible(el) {
    const r = el.getBoundingClientRect()
    let left = r.left, top = r.top, right = r.right, bottom = r.bottom
    const up = (n) => (n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentElement)
    for (let p = up(el); p; p = up(p)) {
      const cs = getComputedStyle(p)
      const clipsX = cs.overflowX !== 'visible' || /paint/.test(cs.contain)
      const clipsY = cs.overflowY !== 'visible' || /paint/.test(cs.contain)
      if (clipsX || clipsY) {
        const q = p.getBoundingClientRect()
        if (clipsX) (left = Math.max(left, q.left)), (right = Math.min(right, q.right))
        if (clipsY) (top = Math.max(top, q.top)), (bottom = Math.min(bottom, q.bottom))
      }
    }
    left = Math.max(left, 0), top = Math.max(top, 0), right = Math.min(right, innerWidth), bottom = Math.min(bottom, innerHeight)
    return right - left < 1 || bottom - top < 1 ? null : { left, top, right, bottom, width: right - left, height: bottom - top }
  }

  /** Boxes of the parts worth comparing with a screenshot of the app, in CSS px relative to the band. */
  function measure(root) {
    const band = root.querySelector('[data-engine-tree]')
    const base = band.getBoundingClientRect()
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: +(r.left - base.left).toFixed(2), y: +(r.top - base.top).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }
    }
    const out = { band: box(band), site: box(document.querySelector('[data-rig-band]')) }
    for (const b of root.querySelectorAll('button[data-press-key]')) out[`button:${b.getAttribute('data-press-key')}`] = box(b)
    for (const c of root.querySelectorAll('[data-press-cue]')) out[`cue:${c.parentElement.getAttribute('data-press-key')}`] = box(c)
    for (const i of root.querySelectorAll('img')) out[`img:${i.alt}`] = box(i)
    const cs = getComputedStyle(root.querySelector('button') ?? band)
    out.buttonFont = `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`
    const bs = getComputedStyle(band)
    out.bandBorder = `${bs.borderTopWidth} ${bs.borderTopLeftRadius}`
    out.devicePixelRatio = devicePixelRatio
    return out
  }
})()
