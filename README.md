# Frame Check

An Agent Skill that checks the framing of persuasive text, both ways.

- **Reading it?** Paste an offer, ad, quote, listing or pricing page and ask *what's the catch*. It
  quotes the exact words that frame you, names the frame, flips it, does the neutral maths, and ends
  with a verdict: Fair, Pushy but true, or Misleading.
- **Writing it?** Hand it your own pitch, email, post or landing copy and say *frame this*. It gives
  two or three rewrites on different frames and runs each through a four-question honesty gate —
  with the rejected ones shown, not hidden.

Ten frames, one gate, three verdicts. Built on Loftus & Palmer (1974), Loftus & Pickrell (1995) and
Tversky & Kahneman (1981): words edit what people remember and what they choose.

## Install

```
npx skills add aldohushi1-stack/frame-check -a claude-code -y
```

Works with Claude Code, Codex and any agent that reads the
[Agent Skills](https://agentskills.io) format (`-a codex`, or `-a '*'` for every agent found).
Nothing is sent anywhere by this repo; the skill is a text file your agent reads.

## Use

Once installed, the agent loads it on its own when the request fits. You can also call it by name:

```
/frame-check what's the catch — <paste the offer>
/frame-check frame this — <paste your draft>
```

## What it is not

- Not a lie detector. A frame is a choice of words, not proof of intent.
- Not legal or consumer-law advice.
- Not a fact checker. It flags what is missing or unverifiable; it does not verify.

## Your own rules

Copy `house-rules.example.md` to `house-rules.md` beside `SKILL.md` and edit it. The skill applies
those standing rules — voice, channel rules, the kind of ask you prefer — on top of its procedure.

## Licence

MIT — Aldo Hushi, Adelaide. More at [blueprintau.com](https://blueprintau.com).
