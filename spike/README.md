# Trigger test

Does the skill load when it should, and stay quiet when it shouldn't, for an agent that has none of
the author's private context? This is the test that gated the first release.

## Method

Five prompts, each run three times through `claude -p` in a fresh project where the skill was
installed by `npx skills add`, with an empty `CLAUDE_CONFIG_DIR`, a bare environment and no
CLAUDE.md. Three prompts should trigger (two OUT — a draft email, a pricing page; one IN — a
property ad), two should not (fix a typo; summarise the same ad).

A run counts as triggered when the agent called the Skill tool for `frame-check`, or its answer
carried two or more of the skill's own markers (PASS / REJECTED / Frames spotted / Verdict / a
verdict word). Pass bar: at least 8 of 9 triggers, at most 1 of 6 false triggers.

## Result — 25 Oct 2026, Claude Code 2.1.310, Sonnet 5.5

| Prompt | Should trigger | Triggered | Loaded via |
| --- | --- | --- | --- |
| out1 — "Frame this" on a cold email | yes | 3/3 | Skill tool |
| out2 — "Frame check" on pricing copy | yes | 3/3 | Skill tool |
| in1 — "What's the catch?" on a townhouse ad | yes | 3/3 | Skill tool |
| no1 — fix a typo | no | 0/3 | — |
| no2 — summarise the same ad | no | 0/3 | — |

**9/9 triggered, 0/6 false. Pass.** Median cost per triggered run about US$0.07.

## Re-run it

```
mkdir proj && cd proj && git init && npx skills add aldohushi1-stack/frame-check -a claude-code -y && cd ..
PROJ=$PWD/proj ./run.sh
node tally.mjs
```

`run.sh` passes the proxy and CA variables through for sandboxed environments; on a normal machine
with a logged-in `claude`, drop those lines and let the clean HOME log in once.
