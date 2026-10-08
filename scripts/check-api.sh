#!/usr/bin/env bash
# Smoke test for the answer API. Needs `npm run dev` running and the demo seeded.
# Usage: bash scripts/check-api.sh
# Note: this asks 3 questions, and the limit is 5 a minute per visitor.
set -u
URL=${URL:-http://localhost:3000/api/ask}
fail=0

ask() {
  curl -s -X POST "$URL" -H 'Content-Type: application/json' \
    -d "{\"workspace\":\"aerin-home\",\"question\":\"$1\"}" --max-time 60
}

expect() { # name, response, grep pattern
  if grep -q "$3" <<<"$2"; then echo "PASS  $1"; else echo "FAIL  $1: $2"; fail=1; fi
}

expect "answers from the documents with a citation" "$(ask 'Can I wash the HEPA filter?')" '"kind":"answered".*"file":"aerin-p3-user-manual.pdf"'
expect "says when the documents don't cover it" "$(ask 'Do you ship to Canada?')" '"kind":"not-covered"'
expect "refuses outside knowledge" "$(ask 'What is the capital of France?')" '"kind":"not-covered"'
expect "rejects a too-short question" "$(ask 'x')" '"error"'

exit $fail
