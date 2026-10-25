// Inline the engine into the app and write the deployable page.
// node checker/build.mjs  →  site/frame-check/app/index.html
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const here = import.meta.dirname;
const engine = readFileSync(join(here, "engine.js"), "utf8");
const app = readFileSync(join(here, "src/app.html"), "utf8");
if (!app.includes("/*__ENGINE__*/")) throw new Error("marker missing");
const out = join(here, "../site/frame-check/app/index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, app.replace("/*__ENGINE__*/", () => engine));
console.log("wrote", out, Buffer.byteLength(readFileSync(out)), "bytes");
