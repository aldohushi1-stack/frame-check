import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { HONEST } from "./honest-corpus.mjs";

const require = createRequire(import.meta.url);
const FC = require("../engine.js");

const frames = (text) => FC.scan(text).findings.map((f) => f.frame);

test("acceptance 7: the three classic frames are found, named and flipped", () => {
  const r = FC.scan("Own it for $124 a week. Save up to 40% this month. Only 3 left!");
  const names = r.findings.map((f) => f.frame);
  assert.ok(names.includes("Small unit"), names.join());
  assert.ok(names.includes("\"Up to\" / \"from\""), names.join());
  assert.ok(names.includes("Urgency / scarcity"), names.join());
  for (const f of r.findings) {
    assert.ok(f.flip && f.flip.endsWith("?"), "every finding is a question: " + f.flip);
    assert.equal(r.text.slice(f.start, f.end), f.quote);
  }
});

test("acceptance 7: small-unit maths prints its assumption and takes a term", () => {
  const r = FC.scan("Own it for $124 a week.");
  const su = r.findings.find((f) => f.frame === "Small unit");
  assert.equal(su.maths.perYear, 6448);
  assert.equal(FC.formatMoney(su.maths.perYear), "$6,448");
  assert.match(su.maths.note, /52 weeks assumed/);
  assert.equal(FC.totalOverTerm(su.maths, 5), 32240);
});

test("small unit: fortnight and day convert; a monthly subscription price is not flagged", () => {
  const f1 = FC.scan("Just $40 a fortnight.").findings.find((f) => f.frame === "Small unit");
  assert.equal(f1.maths.perYear, 1040);
  const f2 = FC.scan("Less than $2 a day.").findings.find((f) => f.frame === "Small unit");
  assert.equal(f2.maths.perYear, 730);
  assert.deepEqual(frames("Phone plan: $35 a month, no lock-in."), []);
});

test("a term mentioned in the text is offered, not assumed", () => {
  const r = FC.scan("From $780 a week*. *Based on a 30-year loan at 6.1% p.a.");
  assert.equal(r.termHint, 30);
});

test("the townhouse ad from the spike lights up the right frames", () => {
  const ad = "Brand new townhouses from $649,000 — only 2 left! Save up to $35,000 with our pre-Christmas pricing. Own it from $780 a week*. Independent research shows the suburb grew 11% last year.";
  const names = new Set(frames(ad));
  for (const n of ["\"Up to\" / \"from\"", "Urgency / scarcity", "Small unit", "Authority", "Omission / default"]) {
    assert.ok(names.has(n), "missing " + n + " in " + [...names].join());
  }
});

test("each frame family has at least one detector that fires", () => {
  const cases = {
    "Anchor": "Was $3,999, now $1,499.",
    "Social proof": "Loved by over 50,000 families.",
    "Authority": "Studies show it works.",
    "Relative vs absolute": "Cuts your risk by 20%.",
    "Gain vs loss": "You're losing customers every day.",
    "Loaded words": "All this for just $9.",
    "Omission / default": "Free delivery* on everything.",
  };
  for (const [frame, text] of Object.entries(cases)) {
    assert.ok(frames(text).includes(frame), `${frame} not found in: ${text} → ${frames(text).join()}`);
  }
});

test("acceptance 8: at most 1 of 20 honest texts raises any finding", () => {
  const flagged = HONEST.map((t) => [t, frames(t)]).filter(([, f]) => f.length);
  assert.ok(flagged.length <= 1, "flagged:\n" + flagged.map(([t, f]) => `  [${f}] ${t}`).join("\n"));
});

test("findings never overlap and come back in text order", () => {
  const r = FC.scan("Only 2 left! Was $500 now $299 — just $5 a week. Save up to 60%. Ends Sunday.");
  for (let i = 1; i < r.findings.length; i++) {
    assert.ok(r.findings[i].start >= r.findings[i - 1].end, "overlap at " + i);
  }
});

test("line numbers and the agent prompt", () => {
  const r = FC.scan("Line one is plain.\nOnly 3 left!\nPlain again.");
  assert.equal(r.findings[0].line, 2);
  const p = FC.agentPrompt(r);
  assert.match(p, /frame-check/);
  assert.match(p, /L2 "Only 3 left"/);
  assert.match(p, /Line one is plain\./);
});

test("empty and plain input give an empty, valid result", () => {
  assert.deepEqual(FC.scan("").findings, []);
  assert.deepEqual(FC.scan("   ").findings, []);
});

test("quotes end on a word boundary; short month spans are not offered as a term", () => {
  const r = FC.scan("Excludes rubbish removal and any rot or structural repairs found during strip-out.");
  assert.match(r.findings[0].quote, /\w$/);
  assert.ok(!/dur$/.test(r.findings[0].quote), r.findings[0].quote);
  assert.equal(FC.scan("Save 2 months when you pay yearly.").termHint, null);
  assert.equal(FC.scan("0% interest for 24 months").termHint, 2);
});

test("scarcity: how people really write it is caught (Lochie's DM, 26 Oct 2026)", () => {
  const caught = [
    "We've only got 5 spots left, so if you're keen to take advantage of this, just reply.",
    "Just 4 seats left for Saturday.",
    "Grab one of the last 5 spots.",
    "We've got 5 spots left this week.",
    "Only 3 left!",
    "We only have two places remaining.",
  ];
  for (const t of caught) {
    const u = FC.scan(t).findings.find((f) => f.frame === "Urgency / scarcity");
    assert.ok(u, "missed: " + t);
  }
  const lochie = FC.scan("We've only got 5 spots left, so if you're keen to take advantage of this, just reply and I'll personally reserve a spot for you.");
  assert.equal(lochie.findings.find((f) => f.frame === "Urgency / scarcity").quote, "only got 5 spots left");
});

test("scarcity: plain sentences with 'only' and a number are left alone", () => {
  assert.deepEqual(frames("I only got 5 minutes with the agent."), []);
  assert.deepEqual(frames("Only 3 ingredients in our famous banana bread."), []);
  assert.deepEqual(frames("Classes are limited to 6 children per instructor."), []);
});

// ---- v0.3: what Lochie's DM taught us (27 Oct 2026) ----

const has = (text, frame) => frames(text).includes(frame);

test("curly apostrophes from phones and Facebook count the same as straight ones", () => {
  assert.ok(has("Don’t miss out!", "Urgency / scarcity"));
  assert.ok(has("You’re losing customers every day.", "Gain vs loss"));
  assert.ok(has("Don’t miss out on 40% off.", "Urgency / scarcity"));
  assert.ok(has("We’ve only got 5 spots left.", "Urgency / scarcity"));
  const r = FC.scan("Don’t miss out!");
  assert.equal(r.text.slice(r.findings[0].start, r.findings[0].end), r.findings[0].quote);
  assert.equal(r.findings[0].quote, "Don’t miss out");
});

test("scarcity and urgency: the everyday phrasings", () => {
  for (const t of [
    "2 spaces left for Saturday.",
    "Only 3 slots remaining.",
    "Spaces are limited.",
    "Limited spots available.",
    "Spots are filling fast!",
    "First 10 people only.",
    "First come, first served.",
    "This offer won’t last.",
    "I'm only taking 4 new clients this month.",
    "Be quick!",
  ]) assert.ok(has(t, "Urgency / scarcity"), "missed: " + t + " → " + frames(t).join());
});

test("free trial with no price after it is an omission, and says what to ask", () => {
  for (const t of [
    "We are offering you 7 days of FREE access to our gym and group classes!",
    "Start your free 14-day trial today.",
    "Try it free for 30 days.",
    "Your first week free.",
  ]) {
    const f = FC.scan(t).findings.find((x) => x.frame === "Omission / default");
    assert.ok(f, "missed: " + t + " → " + frames(t).join());
    assert.match(f.flip, /after the free/i);
  }
});

test("a free trial that states the price after it is left alone", () => {
  assert.ok(!has("Want a free week on me? After that it's $25 a week and you can stop anytime.", "Omission / default"));
  assert.ok(!has("14-day free trial, then $29 a month. Cancel any time.", "Omission / default"));
});

test("soft guilt is named as its own frame, with a question", () => {
  const t = "If you're not interested that is totally fine - but I would hate to not offer 😎";
  const g = FC.scan(t).findings.filter((f) => f.frame === "Soft guilt");
  assert.ok(g.length >= 1, frames(t).join());
  assert.ok(g.every((f) => f.flip.endsWith("?")));
  for (const s of ["No pressure, but I'd hate for you to miss out.", "Totally fine if not, but this is the last round."]) {
    assert.ok(has(s, "Soft guilt"), "missed: " + s);
  }
  assert.ok(FC.FRAMES.guilt === "Soft guilt");
});

test("Lochie's original lights up three frames; the say-it-straight rewrite raises no pressure frames", () => {
  const original = "To give you a taste of what we’re all about, we are offering you 7 days of FREE access to our gym and group classes!\n\nWe’ve only got 5 spots left, so if you’re keen to take advantage of this, just reply and I’ll personally reserve a spot for you.\n\nIf you’re not interested that is totally fine - but I would hate to not offer 😎";
  const names = new Set(frames(original));
  for (const n of ["Omission / default", "Urgency / scarcity", "Soft guilt"]) assert.ok(names.has(n), "missing " + n + " in " + [...names].join());
  const rewrite = "Hey, Lochie here, I run the gym on Smart Rd in St Agnes. Want a free week on me? Come any hour, jump in a class, see if it suits. After that it’s $25 a week and you can stop anytime. Either way, all good.";
  const pressure = frames(rewrite).filter((f) => ["Urgency / scarcity", "Soft guilt", "Omission / default"].includes(f));
  assert.deepEqual(pressure, []);
});

test("plain notices with the new trigger words stay quiet", () => {
  for (const t of [
    "Tables are limited to 10 people per booking.",
    "Free parking for the first 2 hours.",
    "The first 10 minutes are free.",
    "Entry is free for children under 5.",
    "Be quiet in the library, please.",
    "We’re open from 7am. Don’t forget your library card.",
  ]) assert.deepEqual(frames(t), [], t);
});
