# Benchmarks

Three benchmarks, each one you can run again. None is a lab result: small task sets, few runs. Read the limits under each.

## 1. How much does effortless save? (`bash bench/agentic/run.sh`)

The question people ask: same work, with effortless on and with it off, what does it cost and is the answer still right?

Four coding tasks in a fresh copy of this repo: find and explain a setting, add doc comments without touching code, write and run a small script, and trace a flow through several files. Each ran 3 times per setup, on Opus 5.5 and Sonnet 5.5, through Anthropic's API (an API key, so the cost is real list price). Without effortless the app sat at medium, high or xhigh. With it, the app started on medium and effortless picked the effort for each prompt. Every answer was checked: the right fact, no file touched that should not be, the script printing the right number. Run 2026-10-10, 96 runs.

**Opus 5.5**

| Setup | Correct | Cost per task | Requests per task | Time per task |
| --- | --- | --- | --- | --- |
| medium (Anthropic's recommendation), no effortless | 12 of 12 | $0.190 | 7.3 | 24 s |
| high, no effortless | 12 of 12 | $0.209 | 8.0 | 27 s |
| xhigh, no effortless | 12 of 12 | $0.257 | 9.9 | 44 s |
| **effortless on** | **12 of 12** | **$0.149** | **5.8** | **20 s** |

effortless saved **21%** against medium, **29%** against high and **42%** against xhigh, with every answer still right. It picked low 9 times and medium 3 times.

**Sonnet 5.5**

| Setup | Correct | Cost per task | Requests per task | Time per task |
| --- | --- | --- | --- | --- |
| medium, no effortless | 12 of 12 | $0.092 | 6.4 | 15 s |
| high, no effortless | 12 of 12 | $0.107 | 8.8 | 20 s |
| xhigh, no effortless | 12 of 12 | $0.146 | 11.4 | 31 s |
| **effortless on** | **12 of 12** | **$0.096** | **7.5** | **18 s** |

On Sonnet it came out even against medium (4% more, inside the noise), and saved **10%** against high and **35%** against xhigh.

What it says:
- The saving comes from fewer steps, not only less thinking. Every request rereads the whole chat, and at low effort the model took fewer of them (5.8 against 7.3 on Opus medium).
- It is faster too: 20 s per task against 24 s on Opus medium.
- Sonnet at medium is already lean, so there is little to take off it.

Limits:
- Four tasks, three runs each. The percentages could move a few points on a rerun.
- Mostly easy tasks, where effortless goes low and saves the most. On hard tasks it picks more effort and saves less; not measured here.
- The checks test the right fact, file or number, not how well an answer is written.
- Fresh chats through the API. Long chats in the app, and plan usage, were not measured.
- The judge (Haiku) adds about $0.001 to $0.002 per prompt and is not in the figures.

Every run: `bench/results/agentic-2026-10-10.md` and `.json`.

## 2. Is the judge right? (`/effortless bench`)

73 hand-labelled prompts (20 held out), version 1.5.1. A case is "right" when the judge's effort is one a careful person would accept.

| Judge | Right | Held out |
| --- | --- | --- |
| always medium | 44% | 40% |
| always high | 51% | 50% |
| Haiku | 93% | 95% |
| Jev | 99% | 100% |

Prompts and labels: `bench/judge-cases.json`.

## 3. Why model switching is off (`node bench/quality.mjs`)

An earlier version also moved simple prompts to Haiku or Sonnet. This benchmark measured the answers: 30 self-contained prompts, each answered on Opus and on the model and effort a router would pick (Haiku low for easy, Sonnet medium for normal, Opus high for hard), compared by a blind grader (Opus, high effort). Run 2026-10-09, one run each.

| Against Opus medium | Routed good enough | Baseline cost | Routed cost | Saved |
| --- | --- | --- | --- | --- |
| easy (12) | 75% | $0.124 | $0.029 | 77% |
| normal (12) | 100% | $0.284 | $0.115 | 60% |
| hard (6, routed to Opus high) | 100% | $0.714 | $0.903 | -26% |
| all (30) | 90% | $1.121 | $1.046 | 7% |

| Against Opus high | Routed good enough | Baseline cost | Routed cost | Saved |
| --- | --- | --- | --- | --- |
| easy (12) | 83% | $0.126 | $0.028 | 78% |
| normal (12) | 100% | $0.329 | $0.113 | 66% |
| hard (6, same model) | 100% | $1.164 | $1.164 | 0% |
| all (30) | 93% | $1.620 | $1.306 | 19% |

Those prompts started with no chat history, and that is what made the switch look cheap. In a real chat the context sits in the chat model's prompt cache, and each model keeps its own. A prompt moved to another model has to write the whole chat into that model's cache first, at twice the input price (Claude Code writes the 1-hour cache). Measured on 2026-10-10 with an 80k-token chat: from a warm Opus chat, one prompt on Haiku costs about 5 times what staying on Opus does, and about 10 times on Sonnet. Switching only pays once the chat model's cache has gone cold, or for a long run of prompts on the cheaper model.

So "Cheaper model when it can" is off by default since 1.68.9 and marked experimental. The saving that holds up in a real chat is effort: benchmark 1.

Details per case: `bench/results/quality-202610091528.md` (vs high) and `quality-202610091911-vs-opus-medium.md`, with the .json beside each.
