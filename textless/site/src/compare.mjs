// The comparison on the home page: Claude Code's desktop app split into four chats, drawn twice. Once plain, every
// step a row in the chat, and once with textless. build.mjs turns this into HTML; the page stacks the two and wipes
// between them. The chrome copies the desktop app: a window toolbar, panes split by hairlines, a header per pane, the
// composer and the strip under it.

const icon = (d, extra = "") => `<svg class="i" viewBox="0 0 16 16" aria-hidden="true" ${extra}><path d="${d}"/></svg>`
const I = {
  menu: icon("M2.5 4.5h11M2.5 8h11M2.5 11.5h7"),
  panel: icon("M2.5 3.5h11v9h-11zM6 3.5v9"),
  back: icon("M9.5 3.5 5 8l4.5 4.5M5 8h8"),
  fwd: icon("M6.5 3.5 11 8l-4.5 4.5M11 8H3"),
  min: icon("M4 8h8"),
  max: icon("M4.5 4.5h7v7h-7z"),
  close: icon("M4.5 4.5l7 7M11.5 4.5l-7 7"),
  laptop: icon("M3.5 4.5h9v6h-9zM2 12.5h12"),
  chev: icon("M4.5 6.5 8 10l3.5-3.5"),
  term: icon("M3 4.5 6 8l-3 3.5M8 11.5h5"),
  grid: icon("M3 3h10v10H3zM3 7h10M7 7v6"),
  globe: icon("M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2.5 8h11M8 2.5c-2 2.2-2 8.8 0 11M8 2.5c2 2.2 2 8.8 0 11"),
  folder: icon("M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z"),
  dots: icon("M8 3.5v.01M8 8v.01M8 12.5v.01", 'stroke-width="2.4"'),
  plus: icon("M8 3.5v9M3.5 8h9"),
  mic: icon("M8 2.5a2 2 0 0 1 2 2V8a2 2 0 0 1-4 0V4.5a2 2 0 0 1 2-2zM4.5 7.5a3.5 3.5 0 0 0 7 0M8 11v2.5"),
  enter: icon("M12.5 3.5v5h-8M7 6 4.5 8.5 7 11"),
  power: icon("M8 2.5V7M5 4.4a4.5 4.5 0 1 0 6 0"),
  shrink: icon("M13 3 9.5 6.5M9.5 3.5v3h3M3 13l3.5-3.5M3.5 9.5h3v3"),
  gear: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path stroke-width="1.9" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3" stroke-width="1.9"/></svg>',
}
export { I as icons }

const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// One chat per pane. In `before`, a step is one of the app's collapsed rows; `say` is Claude talking between steps;
// `ans` is the final answer. In `after`, the same turn as textless shows it: the scene tour in the first chat, a quote,
// a scene from the Marketplace and a game of chess in the others.
export const PANES = [
  {
    title: "Working",
    before: [
      ["you", "Add a dark mode to the settings page"],
      ["say", "I'll start by looking at how the settings page sets its colours."],
      ["step", "Read page.tsx"],
      ["step", "Searched for colour values"],
      ["say", "Colours are set in two places. I'll move them into the theme first, then add the switch."],
      ["step", "Read theme.ts"],
      ["step", "Edited theme.ts"],
      ["step", "Edited page.tsx"],
      ["say", "Now the switch itself, under Appearance."],
      ["step", "Edited appearance.tsx"],
      ["run", "Running npm test"],
    ],
    after: [["you", "Add a dark mode to the settings page"], ["card"]],
  },
  {
    title: "Working",
    before: [
      ["you", "Fix the flaky login test"],
      ["say", "Running it a few times to see how often it fails."],
      ["step", "Ran npm test -- login (x5)"],
      ["say", "Two of five failed, both on the redirect. Looks like a timing issue."],
      ["step", "Read login.test.tsx"],
      ["step", "Read session.ts"],
      ["step", "Searched for setTimeout"],
      ["say", "The test checks the URL before the redirect finishes. I'll wait for it instead."],
      ["step", "Edited login.test.tsx"],
      ["run", "Running npm test -- login (x10)"],
    ],
    after: [["you", "Fix the flaky login test"], ["art", "assets/scenes/quotes/twain-kindness.svg", "Read session.ts"]],
  },
  {
    title: "Working",
    before: [
      ["you", "Add a CSV export to the reports page"],
      ["say", "Checking how the reports table gets its rows."],
      ["step", "Read reports/page.tsx"],
      ["step", "Read useReports.ts"],
      ["say", "The rows are already in memory, so the export can build the file in the browser."],
      ["step", "Created toCsv.ts"],
      ["step", "Edited reports/page.tsx"],
      ["say", "Adding a test for commas and quotes inside cells."],
      ["step", "Created toCsv.test.ts"],
      ["run", "Running npm test"],
    ],
    after: [["you", "Add a CSV export to the reports page"], ["art", "assets/scenes/scenery/fishing.svg", "From the Marketplace"]],
  },
  {
    title: "Working",
    before: [
      ["you", "Clean up the old date helpers"],
      ["say", "Looking for every place the old helpers are used."],
      ["step", "Searched for formatDay and toIsoDay"],
      ["step", "Read dates.ts"],
      ["step", "Read export.ts"],
      ["say", "Two of them are unused. The other three are still used by the export code."],
      ["step", "Edited dates.ts"],
      ["step", "Edited export.ts"],
      ["run", "Running npx tsc --noEmit"],
    ],
    after: [["you", "Clean up the old date helpers"], ["art", "assets/chess.webp", "Chess against Claude · your move"]],
  },
]

function item(it, marks) {
  const [kind, text, facts] = it
  if (kind === "you") return `<p class="you">${esc(text)}</p>`
  if (kind === "say") return `<p class="say">${esc(text)}</p>`
  if (kind === "ans") return `<p class="ans">${esc(text)}</p>`
  if (kind === "step") return `<p class="st">${esc(text)}<i>›</i></p>`
  if (kind === "run") return `<p class="st run"><span class="spin" aria-hidden="true"></span>${esc(text)}</p>`
  if (kind === "cut") return `<p class="st cut">${esc(text)}</p>`
  if (kind === "asks") return `<div class="asks">${text.map(([k, q, opts], i) => (i ? '<span class="ask-sep" aria-hidden="true"></span>' : '')
    + `<div class="ask"><b class="ask-n">${i + 1}</b>${k === "ask" ? marks.qbadge : marks.todobadge}<div class="ask-b"><p>${esc(q)}${opts ? "?" : ""}</p>${(opts || []).map((o, j) => `<p class="ask-o"><b>${String.fromCharCode(65 + j)}</b>${esc(o)}</p>`).join("")}</div></div>`).join("")}</div>`
  // textless's buttons sit in the card's top row: Aa switches it off in this chat, the gear opens settings, the arrows minimize.
  const top = `<div class="ctl" aria-hidden="true"><b class="aa">Aa</b>${I.gear}${I.shrink}</div>`
  if (kind === "art") return `<div class="card">${top}<img class="scene fixed" src="${text}" alt="A scene while Claude works" width="560" height="350" loading="lazy"><p class="busy">Claude is working</p><p class="step">${esc(facts)}</p></div>`
  if (kind === "card") return `<div class="card">${top}<img class="scene"${text ? "" : ' id="scene"'} data-n="${text || 0}" src="${marks.scene}" alt="A scene while Claude works" width="560" height="350"><p class="busy">Claude is working</p><p class="step" data-n="${text || 0}">${esc(facts || "Edited page.tsx")}</p></div>`
  if (kind === "done") {
    const mark = text === "tide" ? `<span class="mark tide" data-seed="7"></span>` : `<span class="mark">${marks[text]}</span>`
    return `<div class="row">${mark}<span class="facts">${esc(facts)}<span>show steps</span></span></div>`
  }
  throw new Error(`compare: unknown item ${kind}`)
}

function pane(p, side, marks) {
  const mod = ""
  return `<article class="pane">
  <header class="ph">${I.laptop}<b>${esc(p.title)}</b>${I.chev}<span class="tools">${I.term}${I.folder}${I.dots}${I.close}</span></header>
  <div class="pc">${p[side].map(it => item(it, marks)).join("")}</div>
  <div class="composer"><span>Type / for commands</span>${I.enter}</div>
  <div class="strip">${I.plus}${I.mic}${I.chev}<span>Auto</span><span class="gap"></span>${mod}<span class="model">Opus 5.5</span><span class="fast">Fast</span><span>High</span><span class="ring" aria-hidden="true"></span></div>
</article>`
}

export function compare(marks) {
  const side = s => `<div class="side ${s}" aria-label="${s === "before" ? "Without textless" : "With textless"}">${PANES.map(p => pane(p, s, marks)).join("")}</div>`
  return `<div class="appbar" aria-hidden="true">${I.menu}${I.panel}${I.back}${I.fwd}<span class="gap"></span>${I.min}${I.max}${I.close}</div>
<div class="sides">${side("before")}${side("after")}
  <div class="handle" aria-hidden="true"><span class="ba b">Before</span><span class="knob">⇆</span><span class="ba a">After</span></div>
  <input class="drag" id="drag" type="range" min="0" max="100" value="50" aria-label="Slide to compare: left shows Claude Code without textless, right shows it with textless">
</div>`
}

// The marketplace preview: the desktop app split in two, the scene in the left chat's working card. The divider
// between the chats drags, so people see the scene at a narrow and a wide pane. market.html runs the turn.
export function preview() {
  const mod = `<span class="tl" title="textless">${I.power}${I.gear}<b class="aa">Aa</b></span>`
  const chrome = (title, body, textless) => `<article class="pane">
  <header class="ph">${I.laptop}<b>${esc(title)}</b>${I.chev}<span class="tools">${I.term}${I.folder}${I.dots}</span></header>
  <div class="pc">${body}</div>
  <div class="composer"><span>Type / for commands</span>${I.enter}</div>
  <div class="strip">${I.plus}${I.mic}${I.chev}<span>Auto</span><span class="gap"></span>${textless ? mod : ""}<span class="model">Opus 5.5</span><span>High</span><span class="ring" aria-hidden="true"></span></div>
</article>`
  const left = `<p class="you">Make the login page remember the email</p>`
    + `<div class="card" id="pv-card"><img id="pv-scene" alt="The scene while Claude works"><p class="busy">Claude is working</p><p class="step" id="pv-step">Read login.tsx</p></div>`
    + `<p class="ans" id="pv-ans" hidden>Done. The email field now fills in from the last sign-in, and the tests pass.</p>`
  const right = item(["you", "Write the release notes for 2.4"]) + item(["step", "Read CHANGELOG.md"]) + item(["say", "Three fixes and one new setting since 2.3."])
    + item(["step", "Edited RELEASE.md"]) + item(["ans", "The notes are in RELEASE.md, grouped by fixes and the new setting."])
  return `<div class="pv-win"><div class="appbar" aria-hidden="true">${I.menu}${I.panel}${I.back}${I.fwd}<span class="gap"></span>${I.min}${I.max}${I.close}</div>
<div class="pv-split" id="pv-split">${chrome("Login form", left, true)}<div class="pv-grip" id="pv-grip" role="separator" aria-orientation="vertical" aria-valuemin="20" aria-valuemax="80" aria-valuenow="55" tabindex="0" aria-label="Drag to resize the chats"><span></span></div>${chrome("Release notes", right, false)}</div></div>`
}
