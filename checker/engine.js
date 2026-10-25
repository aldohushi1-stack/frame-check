/* Frame Check — browser pattern engine.
 * Finds surface frames in persuasive text by pattern, names them with the skill's toolkit,
 * and asks each one's flip as a question. No model, no network. Judgment stays with the reader
 * (and with the frame-check skill, for the subtle ones).
 * MIT — Aldo Hushi. https://github.com/aldohushi1-stack/frame-check
 */
(function (root) {
  "use strict";

  var NUM = "\\d[\\d,]*(?:\\.\\d{1,2})?";
  var MONEY = "\\$\\s?" + NUM + "(?:k|m)?";
  var PCT = "\\d+(?:\\.\\d+)?\\s?%";

  var FRAMES = {
    small: "Small unit",
    upto: "\"Up to\" / \"from\"",
    anchor: "Anchor",
    urgency: "Urgency / scarcity",
    social: "Social proof",
    authority: "Authority",
    relative: "Relative vs absolute",
    loss: "Gain vs loss",
    loaded: "Loaded words",
    omission: "Omission / default",
  };

  var FLIPS = {
    small: "What is the total over the full term?",
    upto: "What does a typical person actually get or pay?",
    anchor: "Compared with what price — and did anyone ever pay it?",
    urgency: "What actually happens if you wait?",
    social: "How many, named, and can you check them?",
    authority: "Which study, how many people, and who paid for it?",
    relative: "From what starting number — what is it in absolute terms?",
    loss: "Told as a gain instead, is it still true for you?",
    loaded: "What is the plainest word for this?",
    omission: "What does the fine print say, and does it change the total?",
  };

  // priority: when two matches overlap, the higher one is kept.
  var DETECTORS = [
    { k: "small", p: 9, re: new RegExp("\\$\\s?(" + NUM + ")\\s*(?:a|per|\\/)\\s*(week|wk|fortnight|day)\\b", "gi"), maths: true },
    { k: "small", p: 8, re: /\b(?:less than|under|for the price of)\s+a\s+(?:coffee|cup of coffee|takeaway coffee|pie|pizza)(?:\s+a\s+(?:day|week))?/gi },
    { k: "upto", p: 7, re: new RegExp("\\b(?:save\\s+)?up to\\s+(?:" + MONEY + "|" + PCT + ")", "gi") },
    { k: "upto", p: 6, re: new RegExp("\\b(?:from|starting (?:at|from)|as low as)\\s+(?:only\\s+|just\\s+)?" + MONEY, "gi") },
    { k: "anchor", p: 7, re: new RegExp("\\b(?:was|rrp|normally|usually|valued at|worth over|worth)\\s*:?\\s*" + MONEY, "gi") },
    { k: "anchor", p: 6, re: new RegExp("\\bsave\\s+(?:over\\s+|more than\\s+)?(?:" + MONEY + "|" + PCT + ")", "gi") },
    { k: "anchor", p: 6, re: new RegExp("\\b" + PCT + "\\s+off\\b", "gi") },
    { k: "anchor", p: 5, re: new RegExp("\\bindustry average(?:\\s+is)?\\s+" + MONEY + "\\+?", "gi") },
    { k: "urgency", p: 7, re: /\bonly\s+(?:have\s+)?(?:\d+|one|two|three|four|five|six|a few|a handful of)\s+(?:\w+\s+)?(?:left|remaining|available|spots?|places?|seats?|units?)\b/gi },
    { k: "urgency", p: 6, re: /\b(?:offer|sale|deal|price|pricing|special)\s+(?:ends|closes|expires)\b(?:\s+(?:today|tonight|tomorrow|midnight|soon|this \w+|on \w+|sunday|monday|tuesday|wednesday|thursday|friday|saturday))?/gi },
    { k: "urgency", p: 5, re: /\bends\s+(?:today|tonight|tomorrow|midnight|soon|sunday|monday|tuesday|wednesday|thursday|friday|saturday|this (?:week|weekend))\b/gi },
    { k: "urgency", p: 5, re: /\b(?:\d+|two|three|four|five|seven)\s+days?\s+only\b|\b(?:today|this weekend|this week)\s+only\b|\b(?:hurry|act now|don'?t miss out|last chance|selling fast|almost gone|while stocks last|limited[- ]time|limited offer|limited stock|limited release)\b/gi },
    { k: "urgency", p: 5, re: /\bpre-?(?:christmas|xmas|eofy|launch|release|easter)\s+(?:pricing|prices?|offer|sale|special)\b/gi },
    { k: "urgency", p: 4, re: /\b(?:book|buy|order|sign up|act)\s+(?:this week|today|now)\b/gi },
    { k: "urgency", p: 4, re: /\b(?:expressions of interest|eois?|offers)\s+close\s+\w+/gi },
    { k: "urgency", p: 4, re: /\bunless sold prior\b|\bwill sell before\b/gi },
    { k: "social", p: 6, re: /\b(?:join|trusted by|used by|loved by|chosen by)\s+(?:over\s+|more than\s+)?[\d,]+\s?(?:k)?\+?\s*(?:\w+\s+)?(?:customers|teams|users|clients|families|businesses|people|members|australians|homes)\b/gi },
    { k: "social", p: 5, re: /\b(?:thousands|hundreds|millions)\s+of\s+(?:happy\s+|satisfied\s+)?(?:customers|teams|users|clients|families|businesses|people|australians)\b/gi },
    { k: "social", p: 5, re: /(?:\b(?:australia|adelaide|sa)'?s\s+)#1\b(?:\s+\w+)?|\b(?:number one|best[- ]selling|award[- ]winning)\b/gi },
    { k: "social", p: 4, re: /\b(?:extensive|strong|huge|overwhelming|unprecedented)\s+(?:interest|demand)\b/gi },
    { k: "authority", p: 6, re: /\b(?:studies|research|experts|scientists|doctors|dentists|surveys?)\s+(?:shows?|proves?|says?|agrees?|recommends?|confirms?|finds?|found)\b/gi },
    { k: "authority", p: 6, re: /\b(?:independent|clinical|scientific)\s+(?:research|studies|tests?|trials?)\b(?:\s+(?:shows?|proves?|found|confirms?))?/gi },
    { k: "authority", p: 6, re: /\b(?:clinically|scientifically|independently)\s+(?:proven|tested|shown)\b/gi },
    { k: "authority", p: 6, re: /\b\d+\s?%\s+of\s+(?:doctors|dentists|experts|vets|users)\b/gi },
    { k: "relative", p: 5, re: new RegExp("\\b(?:cuts?|reduces?|lowers?|slashes?|boosts?|increases?|improves?|doubles?)\\s+(?:your\\s+)?(?:[\\w-]+\\s+){0,2}?(?:by\\s+)?(?:up to\\s+)?" + PCT, "gi") },
    { k: "relative", p: 5, re: new RegExp("\\b" + PCT + "\\s+(?:more|less|fewer|lower|higher|faster|cheaper)\\b", "gi") },
    { k: "relative", p: 5, re: /\b\d+\s?x\s+(?:more|faster|cheaper|better)\b/gi },
    { k: "loss", p: 5, re: /\b(?:losing|wasting|leaving)\s+(?:\$[\d,]+|money|customers|sales|leads|clients|hours)\b(?:\s+(?:every|each|a)\s+(?:day|week|month))?/gi },
    { k: "loss", p: 5, re: /\b(?:stop|don'?t)\s+(?:wasting|losing|missing out on)\b/gi },
    { k: "loaded", p: 4, re: new RegExp("\\b(?:only|just)\\s+" + MONEY, "gi") },
    { k: "loaded", p: 3, re: /\b(?:a steal|bargain|no-brainer|unbeatable|rarely offered|tightly held|once[- ]in[- ]a[- ]lifetime|mega clearance)\b/gi },
    { k: "omission", p: 4, re: /(?<=[\w$%)])\*(?=[\s.,;:!)]|$)/g },
    { k: "omission", p: 4, re: /\b(?:conditions apply|t&cs apply|terms(?: and conditions)? apply|approved applicants|fees apply|by others)\b/gi },
    { k: "omission", p: 3, re: /\bexcludes?\b[^.\n]{0,60}\b/gi },
  ];

  var PER = { week: [52, "52 weeks"], wk: [52, "52 weeks"], fortnight: [26, "26 fortnights"], day: [365, "365 days"] };

  function toNum(s) { return parseFloat(String(s).replace(/,/g, "")); }

  function formatMoney(n) {
    var r = Math.round(n * 100) / 100;
    var whole = Math.floor(r);
    var cents = Math.round((r - whole) * 100);
    var s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return "$" + s + (cents ? "." + String(cents).padStart(2, "0") : "");
  }

  function totalOverTerm(maths, years) {
    if (!maths || !(years > 0)) return null;
    return Math.round(maths.perYear * years * 100) / 100;
  }

  function lineOf(text, idx) {
    var n = 1;
    for (var i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  function termHint(text) {
    var best = null, m;
    var y = /\b(\d{1,2})[- ]?(?:years?|yrs?)\b/gi;
    while ((m = y.exec(text))) { var v = +m[1]; if (v > 0 && (best === null || v > best)) best = v; }
    if (best !== null) return best;
    var mo = /\b(\d{1,3})[- ]?months?\b/gi;
    while ((m = mo.exec(text))) { if (+m[1] < 6) continue; var w = Math.round(+m[1] / 12 * 100) / 100; if (best === null || w > best) best = w; }
    return best;
  }

  function scan(text) {
    text = String(text || "");
    var cands = [];
    DETECTORS.forEach(function (d) {
      d.re.lastIndex = 0;
      var m;
      while ((m = d.re.exec(text))) {
        if (!m[0].trim()) { d.re.lastIndex++; continue; }
        var quote = m[0].replace(/\s+$/, "");
        var c = { frame: FRAMES[d.k], key: d.k, quote: quote, start: m.index, end: m.index + quote.length, p: d.p, flip: FLIPS[d.k] };
        if (d.maths) {
          var amt = toNum(m[1]), unit = m[2].toLowerCase(), per = PER[unit];
          var perYear = Math.round(amt * per[0] * 100) / 100;
          c.maths = { amount: amt, unit: unit, perYear: perYear, note: formatMoney(perYear) + " per year (" + per[1] + " assumed — enter the term for the total)" };
        }
        cands.push(c);
      }
    });
    cands.sort(function (a, b) { return b.p - a.p || (b.end - b.start) - (a.end - a.start) || a.start - b.start; });
    var kept = [];
    cands.forEach(function (c) {
      for (var i = 0; i < kept.length; i++) if (c.start < kept[i].end && kept[i].start < c.end) return;
      kept.push(c);
    });
    kept.sort(function (a, b) { return a.start - b.start; });
    kept.forEach(function (c) { c.line = lineOf(text, c.start); delete c.p; });
    return { text: text, findings: kept, termHint: termHint(text) };
  }

  function agentPrompt(result) {
    var lines = result.text.split("\n");
    var pad = String(lines.length).length;
    var out = "Use the frame-check skill in IN mode on the text below. A pattern checker flagged these first; check each one, and look for anything it missed:\n";
    result.findings.forEach(function (f) { out += "- L" + f.line + " \"" + f.quote + "\" (" + f.frame + ")\n"; });
    if (!result.findings.length) out += "- (nothing flagged by pattern)\n";
    out += "\nText:\n";
    lines.forEach(function (l, i) { out += String(i + 1).padStart(pad, " ") + "  " + l + "\n"; });
    return out;
  }

  var api = { scan: scan, agentPrompt: agentPrompt, formatMoney: formatMoney, totalOverTerm: totalOverTerm, FRAMES: FRAMES, FLIPS: FLIPS };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FrameCheck = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
