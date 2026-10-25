#!/usr/bin/env bash
# Run one prompt file through claude -p in a clean config (skill installed from GitHub in $PROJ).
# Writes the agent's final text to $2 and the raw stream to $2.jsonl.
set -u
IN="$1"; OUT="$2"
S="${SCRATCH:?}"; PROJ="${PROJ:-$S/proj2}"; CFG="$S/cleancfg-$(basename "$OUT" .md)-$$"; mkdir -p "$CFG" "$S/cleanhome"
PROMPT="$(sed '/^<!--.*-->$/d' "$IN")"
( cd "$PROJ" && env -i PATH="$PATH" HOME="$S/cleanhome" CLAUDE_CONFIG_DIR="$CFG" \
  ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-}" HTTPS_PROXY="${HTTPS_PROXY:-}" HTTP_PROXY="${HTTP_PROXY:-}" NO_PROXY="${NO_PROXY:-}" \
  NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-}" SSL_CERT_FILE="${SSL_CERT_FILE:-}" \
  CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST="${CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST:-}" \
  timeout 480 claude -p "$PROMPT" --output-format stream-json --verbose --allowedTools "Skill,Read,Glob,Grep,Bash" ) > "$OUT.jsonl" 2>/dev/null
node -e '
const fs=require("fs");const lines=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean);
let last="",skill=false;for(const l of lines){let e;try{e=JSON.parse(l)}catch{continue}
 if(e.type==="assistant")for(const c of e.message.content||[]){if(c.type==="tool_use"&&c.name==="Skill")skill=true;if(c.type==="text"&&c.text.trim())last=c.text}
 if(e.type==="result"&&e.result)last=e.result}
fs.writeFileSync(process.argv[2],last.trim()+"\n");console.log(process.argv[2],"skill="+skill,"words="+last.split(/\s+/).length)' "$OUT.jsonl" "$OUT"
