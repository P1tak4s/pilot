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
- **Security.** Bundles Cloudflare's [security-audit skill](https://github.com/cloudflare/security-audit-skill).

## Install

In Claude Code:

```text
/plugin marketplace add P1tak4s/pilot
/plugin install pilot@pilot
/reload-plugins
```

A short setup opens above the prompt. The defaults are good; press **Done**.

Running the original effortless plugin as well? Disable it (`/plugin`), or both draw above the prompt.

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
