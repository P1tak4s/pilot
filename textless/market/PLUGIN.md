# Marketplace in the plugin: spec

What the plugin needs so a community scene is one click to use. The Worker and the website are done (`market/worker`, `site/src/market.html`); this is the plugin side.

## The API

Base address: `MARKET_API`. It is `http://127.0.0.1:8788` locally (`npm run dev` in `market/worker`) and gets a real address when the Worker is deployed.

| Call | Returns |
|---|---|
| `GET /scenes` | `{ scenes: [{ id, name, author, link?, description?, width, height, created, file }] }`, newest first. `file` is a full URL. |
| `GET /f/<id>.<ext>` | The scene file. Only live scenes are served. |

## 1. `/textless get <id>`

The website's **Use in textless** button copies this command.

1. Look up `<id>` in `GET /scenes`. If it isn't there, say it was not found or was taken down.
2. Download `file`.
3. Run `checkFile(name, bytes)` from `market/rules.mjs` on it again, even though the server already did. If anything comes back, refuse and say why.
4. Save it as `~/.claude/textless/scenes/<id>.svg`. The plugin can only fetch and write text, so a raster is fetched with `?as=base64`, checked on its decoded bytes and saved as an SVG wrapping it as a data URI.
5. Make it the active scene for every chat, the same way picking one under the gear does.
6. Reply in one line: `Rain cloud by Isac is on. It plays the next time Claude works.`

## 2. A Community tab under the gear

- List `GET /scenes` as thumbnails, each with its name, author and a **Use** button.
- Use does steps 2 to 6 above.
- Scenes already in the folder show **In use** or **Added** instead of Use.
- Add a **Report** link that opens the scene's card on the website. Reporting needs the human check, which runs only on the site.

## Rules

- Downloaded files go only into `~/.claude/textless/scenes`, named by id. Never use a name or path the server sends.
- Never run, import or evaluate anything from a downloaded file. Scenes are images.
- If the API can't be reached, the tab says so and the scenes already in the folder keep working.
