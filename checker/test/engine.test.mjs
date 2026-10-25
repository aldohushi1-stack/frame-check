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
