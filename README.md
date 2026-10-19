# pilot

A Claude Code plugin that spends your usage where it matters.

- **Auto effort.** Every prompt gets the reasoning effort it needs: quick questions run at Low, hard work at High.
  A judge picks it (Jev with a TypeSafe key, or Haiku on your own login).
- **Limit guard.** Past 85% of your 5-hour or weekly limit, Auto never goes above High. **Save** caps it at Medium.
- **Working guide.** Claude hands reading, searching, mechanical edits and test runs to Haiku subagents, keeps
  judgement for itself, writes the shortest code that works, loads the right design skill and the security skill
  when a change needs them.
- **One quiet line** above the prompt: effort, model, context, and a thin line that moves while Claude works.
  The higher the effort, the slower it moves.
- **Compaction by Haiku**, far cheaper than the chat's model.
- **Design.** Bundles the [ui-ux skill](https://github.com/P1tak4s/ui-ux-skill): direction, type, colour, motion and review for any UI change.
- **SEO and AI search.** Bundles the [seo-geo skill](https://github.com/P1tak4s/seo-geo-skill): technical SEO, content, schema, AI citations, local, hreflang.
- **Security.** Bundles Cloudflare's [security-audit skill](https://github.com/cloudflare/security-audit-skill).

## Install

You need Claude Code (VS Code extension, desktop app or terminal) signed in to your Claude account. Nothing else:
no key, no terminal.

**1. Add and install.** Type these three lines into Claude Code's chat box, one at a time, pressing Enter after each:

```text
/plugin marketplace add P1tak4s/pilot
```

```text
/plugin install pilot@pilot
```

```text
/reload-plugins
```

Or paste this one message and let Claude do it:

```text
Install the pilot plugin for me: run `claude plugin marketplace add P1tak4s/pilot` and then `claude plugin install pilot@pilot`. When both succeed, tell me to run /reload-plugins.
```

**2. Setup.** A short panel opens above the prompt. The defaults are good: press **Done**. Open it again any time with
`/pilot setup` or the ⚙ on the line above the prompt.

**3. Check it works.** Above the prompt you now see one quiet line, like `Low  Opus  ◔ 12%  ⚙`. Send a prompt: a thin
line moves under it while Claude works. In the terminal, if `/pilot` says the mod is not loaded, add this to
`~/.claude/settings.json` and restart:

```json
{ "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
```

**Already use effortless or ponytail?** pilot does both jobs. Switch them off, or two bars draw above the prompt:
`/plugin`, pick them, **Disable**.

**Faster judge (optional).** With a [TypeSafe](https://typesafe.ai) key, Jev picks the effort in about 0.25 s instead
of Haiku's 1 s. Run `/plugin configure pilot@pilot` and paste it under *TypeSafe API key*. Without a key, Haiku judges
on your own Claude login.

**Update:** `/plugin marketplace update pilot`, then `/reload-plugins`.
**Remove:** `/plugin uninstall pilot@pilot`.

## The line above the prompt

| Shows | Means |
|---|---|
| **High** | the effort Auto picked. Press it to switch Auto off (it says `manual`) and on again |
| Opus | the chat's model |
| ◔ 38% | how full the context is |
| 7/10 light | prompts this session that ran at Low |
| Haiku 3/4 | subagents this session that ran on Haiku |
| 12m | the prompt cache runs out soon (shown only when low) |
| ● 91% · max High | close to a usage limit; the limit guard is on. **Save** caps lower |
| ⚙ | settings |

## Commands

`/pilot setup` · `/pilot settings` · `/pilot stats` · `/pilot handoff` · `/pilot debug`

## Credits

Built on [effortless](https://github.com/HeyCubit/effortless) by HeyCubit (MIT). Code rules from
[ponytail](https://github.com/DietrichGebert/ponytail) (MIT). Security skill by Cloudflare (MIT).

## License

MIT, see [LICENSE](LICENSE).
