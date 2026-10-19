// Puts the pane bodies the app's renderer drew (rig/out/*.frozen.html, see README.md) into a sketch of the desktop
// Code tab: sidebar, chat, the effortless band above the prompt, and the pane docked on the right. The pane body and
// the band are the real renderer's DOM with its computed styles inlined; everything around them is hand-drawn.
//   node build.mjs   ->  a-panel.html, b-detail.html, c-idle.html
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'rig', 'out')
// The installed app's anthropic-sans, when this machine has it; system-ui otherwise. Nothing is copied into the repo.
const FONT = 'file:///C:/Program%20Files/WindowsApps/Claude_2.26454.2.0_x64__pzs8sxrjxfjjc/app/resources/ion-dist/assets/v1/cc27851ad-DDVos-BJ.woff2'
const LONG_FONT = /font-family:anthropic-sans,[^;"]*/g

const frozen = name => `<div class="frozen">${readFileSync(join(OUT, `${name}.frozen.html`), 'utf8').replace(LONG_FONT, 'font-family:var(--app-font)')}</div>`

const css = `
@font-face{font-family:anthropic-sans;src:url("${FONT}") format("woff2");font-weight:300 800;font-style:normal}
:root{--app-font:anthropic-sans,system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
*{box-sizing:border-box}
.frozen,.frozen *{box-sizing:content-box}
html,body{margin:0;background:#0b0b0c}
body{font:13px/19px var(--app-font);color:#f0efec;-webkit-font-smoothing:antialiased}
.win{width:1440px;height:960px;display:flex;flex-direction:column;background:#151515;overflow:hidden}
.title{height:38px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid #232323;color:#a3a3a3}
.title b{color:#e8e8e6;font-weight:560}
.dots{display:flex;gap:6px;margin-left:auto}
.dots i{width:11px;height:11px;border-radius:50%;background:#2c2c2c;display:block}
.body{flex:1;display:flex;min-height:0}
.side{width:232px;flex-shrink:0;border-right:1px solid #232323;padding:12px 10px;display:flex;flex-direction:column;gap:2px;color:#9a9a98}
.side .new{color:#e8e8e6;padding:7px 10px;border-radius:8px;background:#1f1f1f;margin-bottom:10px}
.side .h{font-size:11.5px;color:#6e6e6c;padding:10px 10px 4px}
.side .s{padding:6px 10px;border-radius:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.side .s.on{background:#232323;color:#e8e8e6}
.chat{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
.scroll{flex:1;min-height:0;width:100%;max-width:728px;padding:26px 24px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden}
.user{align-self:flex-end;max-width:82%;background:#262626;border-radius:14px;padding:10px 14px;color:#ecebe8}
.said{color:#dcdbd7;line-height:21px}
.tool{display:flex;align-items:center;gap:9px;padding:7px 12px;border:1px solid #262626;border-radius:10px;background:#181818;color:#a3a3a3}
.tool b{color:#e3e2de;font-weight:560}
.tool .r{margin-left:auto;font-variant-numeric:tabular-nums}
.tool .dot{width:7px;height:7px;border-radius:50%;background:#a79cf7;flex-shrink:0}
.tool .dot.w{background:#e0a33a}.tool .dot.d{background:#7fe0a4}.tool .dot.q{background:transparent;border:1.5px dashed #8b8b93;width:9px;height:9px}.tool .dot.f{background:#e5534b}
.working{display:flex;align-items:center;gap:8px;color:#a79cf7}
.foot{width:100%;max-width:728px;padding:10px 24px 16px;display:flex;flex-direction:column;gap:8px}
.slot{min-height:40px;padding:8px;border-radius:10px;background:#212121}
.composer{border:1px solid #2e2e2e;background:#1c1c1c;border-radius:14px;padding:12px 14px 10px;display:flex;flex-direction:column;gap:14px}
.composer .ph{color:#6e6e6c}
.composer .row{display:flex;align-items:center;gap:12px;color:#8b8b93;font-size:12.5px}
.composer .send{margin-left:auto;width:28px;height:28px;border-radius:8px;background:#2c2c2c;display:grid;place-items:center;color:#8b8b93}
.pane{width:420px;flex-shrink:0;border-left:1px solid #232323;background:#151515;display:flex;flex-direction:column;min-height:0}
.pane .bar{height:30px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;padding:0 10px;color:#7d7d7b;font-size:15px}
.pane .inner{flex:1;min-height:0;overflow:hidden;padding:0 17px 0 18px}
`

const tool = (dot, name, what, right) => `<div class="tool"><span class="dot ${dot}"></span><b>${name}</b><span>${what}</span><span class="r">${right}</span></div>`

const frame = ({ title, sessions, chat, band, pane, model = 'Opus 5.5' }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1440">
<title>${title}</title>
<style>${css}</style></head>
<body><div class="win">
<div class="title"><b>effortless</b><span>agent panel</span><span class="dots"><i></i><i></i><i></i></span></div>
<div class="body">
<nav class="side"><div class="new">+ New session</div><div class="h">Today</div>${sessions.map((s, i) => `<div class="s${i === 0 ? ' on' : ''}">${s}</div>`).join('')}</nav>
<main class="chat"><div class="scroll">${chat}</div>
<div class="foot"><div class="slot">${frozen(band)}</div>
<div class="composer"><span class="ph">Reply to Claude…</span><div class="row"><span>+</span><span>${model}</span><span class="send">↑</span></div></div></div></main>
<aside class="pane"><div class="bar" title="the engine's close mark">×</div><div class="inner">${frozen(pane)}</div></aside>
</div></div></body></html>
`

const sessions = ['Agent panel plan', 'Settings cards polish', 'Handoff without a skill', 'Terminal bands at 80 cols', 'Release 1.35.102']

const workChat = `
<div class="user">Plan the agent panel. Find the hooks we need, add state for it, and have the branch reviewed before we merge.</div>
<div class="said">I'll split this up: a quick search for the hooks, a builder for the state, and a reviewer for the branch once the state is in. Release notes get a short outline at the end.</div>
${tool('', 'Explore', 'find the pane and agent hooks', '1:42')}
${tool('d', 'general-purpose', 'add state for the panel', 'done 3:12')}
<div class="said">The state is in: <code style="color:#cfc7ff">agentPanel</code> keeps one record per agent, written from <code style="color:#cfc7ff">agent.spawn</code>, <code style="color:#cfc7ff">tool.call</code> and <code style="color:#cfc7ff">turn.complete</code>. Starting the review now.</div>
${tool('w', 'code-reviewer', 'review the agent-panel branch', '4:10')}
${tool('q', 'Plan', 'outline the release notes', 'starting')}
${tool('f', 'Explore', 'scan site/ for dead links', 'failed 0:21')}
<div class="working">${'<span style="width:6px;height:6px;border-radius:50%;background:#a79cf7;display:inline-block;opacity:.8"></span>'.repeat(3)} Waiting for 2 agents</div>`

const idleChat = `
<div class="user">What does the cache countdown mean when it turns yellow?</div>
<div class="said">The countdown is how long the prompt cache stays warm. Under 20 minutes it turns yellow: send your next message before it runs out, or the whole chat is written to the cache again at full price. At 5 minutes it turns red, and at zero the band offers Compact.</div>`

const pages = {
  'a-panel.html': frame({ title: 'Agent panel: working', sessions, chat: workChat, band: 'band-05-high-38pct-handoff-glow', pane: 'panel' }),
  'b-detail.html': frame({ title: 'Agent panel: one agent', sessions, chat: workChat, band: 'band-05-high-38pct-handoff-glow', pane: 'detail' }),
  'd-hub.html': frame({ title: 'Agent panel: project hub', sessions, chat: workChat, band: 'band-05-high-38pct-handoff-glow', pane: 'hub' }),
  'c-idle.html': frame({ title: 'Agent panel: idle', sessions: ['Cache countdown question', ...sessions.slice(1)], chat: idleChat, band: 'band-04-medium-22pct-greybox', pane: 'idle', model: 'Sonnet 5.5' }),
}
for (const [file, html] of Object.entries(pages)) {
  writeFileSync(join(HERE, file), html)
  console.log(`${file}  ${(html.length / 1024).toFixed(0)} KB`)
}
