# First-run setup in steps

Agreed with Isac 2026-10-06. The setup band above the prompt walks a new user through the settings that matter,
one row per step, so nobody has to open ⚙ to get effortless set the way they like.

| Step | Words | Controls |
|---|---|---|
| 1/4 judge | Who picks the effort for each message? | Jev (API), Haiku (no key), Custom, Skip |
| 1/4 jev (no key found) | Paste a TypeSafe key from typesafe.ai. | key field (Save), Skip |
| 1/4 custom | Your judge: a chat completions URL and a model. | URL field, model field, Next |
| 2/4 lean | On close calls, lean cheaper or smarter? | five-stop slider, Next |
| 3/4 handoff | ⇥ at the bottom moves the chat to a fresh one. Full handoff by: | skill picker, Next |
| 4/4 footer | Show these (all recommended): | checkbox + name for Cache timer, ⇥ Handoff and Progress bar (on: white box, black tick; off: outlined box), Next |
| done | ⏻ at the bottom turns Auto on or off, ⚙ changes all this. Auto pauses on Fable. | Done |

- Back on every step but the first; ✕ closes the guide.
- Choices are held in a draft and saved together at Done or ✕ (each saved setting reloads the plugin and the app posts a notice in the chat). Alert bands are not in the setup; ⚙ switches them.
- Picking or skipping the judge marks the setup done: the guide does not open by itself again and the footer shows ⚙.
  Closing before that keeps the footer's Setup button.
- Left out on purpose: range (floor/ceiling), Swamped at %, handoffAfter (the handoff bar asks every time and
  remembers), the ⇥ button toggle. All stay in ⚙.
- Layout: the handoff bar's build (title over one line of words, controls in the flow, `position="relative"` over the
  absolutely placed art). The art is a still Svg because every click redraws the band.
- Fable: Auto pauses there because an effort change rewrites 56 to 100% of the prompt cache (measured).
