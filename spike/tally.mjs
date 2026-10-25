// Tally the spike results: did the skill load, and did the output have the skill's shape?
// usage: node tally.mjs [resultsDir]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || join(import.meta.dirname, "results");
const MARKERS = ["REJECTED", "PASS", "Pushy but true", "Misleading", "Frames spotted", "Verdict", "Flip"];

function analyse(file) {
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  let loaded = false, loadedVia = "", text = "", cost = 0, turns = 0, error = "";
  for (const line of lines) {
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === "assistant" && ev.message?.content) {
      for (const c of ev.message.content) {
        if (c.type === "tool_use") {
          const inp = JSON.stringify(c.input || {});
          if (c.name === "Skill" && /frame-check/.test(inp)) { loaded = true; loadedVia = "Skill tool"; }
          if (c.name === "Read" && /skills\/frame-check\/SKILL\.md/.test(inp)) { loaded = true; loadedVia ||= "Read SKILL.md"; }
        }
        if (c.type === "text") text += c.text + "\n";
      }
    }
    if (ev.type === "result") { cost = ev.total_cost_usd ?? 0; turns = ev.num_turns ?? 0; if (ev.is_error) error = String(ev.result || "").slice(0, 80); }
  }
  const hits = MARKERS.filter((m) => text.includes(m));
  return { loaded, loadedVia, shaped: hits.length >= 2, hits, cost, turns, error, words: text.split(/\s+/).length };
}

const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort();
const rows = files.map((f) => ({ run: f.replace(".jsonl", ""), ...analyse(join(dir, f)) }));
let shouldHit = 0, shouldTotal = 0, falseHit = 0, falseTotal = 0;
for (const r of rows) {
  const should = !r.run.startsWith("no");
  const triggered = r.loaded || r.shaped;
  if (should) { shouldTotal++; if (triggered) shouldHit++; } else { falseTotal++; if (triggered) falseHit++; }
  console.log(
    `${r.run.padEnd(26)} loaded=${String(r.loaded).padEnd(5)} via=${(r.loadedVia || "-").padEnd(12)} shaped=${String(r.shaped).padEnd(5)} markers=[${r.hits.join(",")}] turns=${r.turns} cost=$${r.cost.toFixed(3)} words=${r.words}${r.error ? " ERROR=" + r.error : ""}`
  );
}
console.log(`\nShould trigger: ${shouldHit}/${shouldTotal}   False triggers: ${falseHit}/${falseTotal}`);
console.log(`Pass needs >= 8/9 and <= 1/6. Verdict: ${shouldHit >= 8 && falseHit <= 1 ? "PASS" : "FAIL"}`);
