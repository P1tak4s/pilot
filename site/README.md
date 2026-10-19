# Site

`index.html` is the whole showcase page: one file, inline CSS and JS, no build step to serve it.

It is generated from `src/template.html` by `src/build.mjs`, which pastes the band art (`BRAND_SVG`, `FROST_SVG`,
`SWAMP_SVG`, `EMBER_SVG`, `DOWN_SVG`), the TypeSafe and Claude marks and the ring straight from `hooks/register.tsx`,
so the page always shows the plugin's own art. Edit the template, then:

```bash
node site/src/build.mjs
```

Not published yet. Hosting options: GitHub Pages from this repo, or Cloudflare Pages. The star count on the GitHub
button is fetched live from the GitHub API and stays hidden at 0 stars.
