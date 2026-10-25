#!/usr/bin/env bash
# Frame Check spike — clean-environment trigger test.
# Runs each prompt N times through `claude -p` in a fresh project where the skill was
# installed by the skills CLI, with an empty CLAUDE_CONFIG_DIR and a bare env, and
# saves the stream-json of every run for tally.mjs.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJ="${PROJ:-$HERE/proj}"
CFG="${CFG:-$HERE/cleancfg}"
HOMEDIR="${HOMEDIR:-$HERE/cleanhome}"
RUNS="${RUNS:-3}"
OUT="$HERE/results"
mkdir -p "$OUT" "$CFG" "$HOMEDIR"

for f in "$HERE"/prompts/*.txt; do
  name="$(basename "$f" .txt)"
  for i in $(seq 1 "$RUNS"); do
    tag="$name.run$i"
    [ -s "$OUT/$tag.jsonl" ] && { echo "skip $tag (exists)"; continue; }
    echo "== $tag  $(date +%H:%M:%S)"
    ( cd "$PROJ" && env -i \
        PATH="$PATH" HOME="$HOMEDIR" CLAUDE_CONFIG_DIR="$CFG" \
        ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-}" \
        HTTPS_PROXY="${HTTPS_PROXY:-}" HTTP_PROXY="${HTTP_PROXY:-}" NO_PROXY="${NO_PROXY:-}" \
        NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-}" SSL_CERT_FILE="${SSL_CERT_FILE:-}" \
        CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST="${CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST:-}" \
        timeout 420 claude -p "$(cat "$f")" \
          --output-format stream-json --verbose \
          --allowedTools "Skill,Read,Glob,Grep" \
          > "$OUT/$tag.jsonl" 2> "$OUT/$tag.err" )
    echo "   exit=$? bytes=$(wc -c < "$OUT/$tag.jsonl")"
  done
done
echo "DONE $(date +%H:%M:%S)"
