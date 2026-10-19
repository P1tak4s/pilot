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
    const wanted = ['hh', 'ou', 'au', 'cd', 'Gc', 'Um', 'sd', 'na', 'Nu', 'Ks', 'Tl', 'hs', 'xs', 'Wm']
    const grab = wanted.map((n) => `${n}:typeof ${n}==="undefined"?undefined:${n}`).join(',')
    // eslint-disable-next-line no-new-func
    const run = new Function('__scope', `with(__scope){${body}\n;return {${grab}}}`)
    const app = run(scope)
    const missing = wanted.filter((n) => app[n] === undefined && !['Wm'].includes(n))
    if (missing.length) throw new Error(`renderer chunk changed: not found ${missing.join(', ')}`)

    // --- Draw ---------------------------------------------------------------------------------------------------
    const host = document.querySelector('[data-plugin-drawn]')
    const root = app.cd(host, app.Um) // shadow root + the app's engine CSS + the band's surface CSS
    const handlers = { press: () => undefined, input: () => undefined, select: () => undefined }
    // One redraw as the app does it: the tree shaped and built again, the old band swapped out whole (which is why an
    // image's CSS animation starts over on every redraw).
    const draw = (tree) => {
      root.querySelector('[data-engine-tree]')?.remove()
      const shaped = app.hh(tree) // the band's shapeTree (without the host's "Turn off" button)
      const marks = app.au()
      const drawn = app.ou(shaped, handlers, app.na, marks, app.Nu(host), true)
      if (drawn) {
        drawn.setAttribute('data-engine-tree', '')
        if (!drawn.matches('a[href],button,input,select,textarea')) drawn.setAttribute('tabindex', '-1')
        root.insertBefore(drawn, root.children[1] ?? null)
      }
      app.Gc(root, marks.hoverRules)
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
    status('ready')
  } catch (err) {
    console.error(err)
    document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88">${String(err && err.stack || err)}</pre>`)
    status('error')
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
