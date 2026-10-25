# Samples

Five texts, run through Frame Check exactly as installed by `npx skills add`, in a clean agent
config with none of the author's own context (Claude Code 2.1.310, 25 Oct 2026). `after.md` is the
agent's reply, unedited.

The texts are **composites** written for these samples, modelled on common Australian ads, quotes
and pitches. No real business, agent, property or person is described. We would rather show the
frames than name a trader.

| Sample | Mode | Verdict | The catch, in one line |
| --- | --- | --- | --- |
| [01 Auction listing](01-auction-listing) | IN | Pushy but true | The price guide is a floor $310k below the comparables it quotes |
| [02 Furniture sale](02-furniture-sale) | IN | Pushy but true | "0% interest" costs about $290–$350 in fees |
| [03 Bathroom quote](03-bathroom-quote) | IN | Misleading | The headline price leaves out plumbing, electrical, rubbish and rot |
| [04 Cold pitch](04-cold-pitch) | OUT | — | Four claims fail the honesty gate; three honest rewrites |
| [05 Pricing page](05-pricing-page) | OUT | — | 8c SMS reminders can nearly double the cheapest plan |

Each folder: `before.md` (the text and the prompt), `after.md` (the reply), `note.md` (what it did).

An honest control — a plain bike-shop price list — is in [`../spike/honest`](../spike/honest): **Fair**
in 3 of 3 runs, one frame named each time.
