// Acceptance 7 in a real browser: the built checker makes zero network requests,
// lights up the three classic frames, prints $6,448 with its assumption, and totals a term.
// Also: no sideways scroll at phone width.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const APP = join(import.meta.dirname, "../../site/frame-check/app/index.html");

test("static: the built page references nothing outside itself", () => {
  const html = readFileSync(APP, "utf8");
  for (const re of [/<script[^>]+src=/i, /<link[^>]+href=/i, /<img[^>]+src=/i, /@import/i, /url\(\s*['"]?https?:/i, /\bfetch\(/, /XMLHttpRequest/, /navigator\.sendBeacon/]) {
    assert.ok(!re.test(html), "found " + re);
  }
});

test("browser: zero requests, frames found, maths and term work, phone width fits", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    const requests = [];
    page.on("request", (r) => requests.push(r.url()));
    const url = pathToFileURL(APP).href;
    await page.goto(url);
    await page.fill("#input", "Own it for $124 a week. Save up to 40% this month. Only 3 left!");
    await page.waitForFunction(() => document.querySelectorAll("#rendered mark").length === 3);
    const frames = await page.$$eval("#findings .frame", (els) => els.map((e) => e.textContent));
    assert.deepEqual(frames.sort(), ["\"Up to\" / \"from\"", "Small unit", "Urgency / scarcity"].sort());
    const maths = await page.textContent("#findings .maths");
    assert.match(maths, /\$6,448 per year \(52 weeks assumed — enter the term for the total\)/);
    await page.fill("#term0", "5");
    assert.match(await page.textContent("#total0"), /\$32,240 over 5 years/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, "sideways scroll of " + overflow + "px at 375px");
    await page.click("#example");
    await page.waitForFunction(() => document.querySelectorAll("#rendered mark").length >= 8);
    await page.click(".hint");
    assert.match(await page.textContent("#total" + (await page.getAttribute(".hint", "data-i"))), /over 2 years/);
    const others = requests.filter((u) => u !== url);
    assert.deepEqual(others, [], "requests made: " + others.join(", "));
  } finally {
    await browser.close();
  }
});
