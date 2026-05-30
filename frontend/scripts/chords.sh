#!/usr/bin/env bash
# Bundlea el harness (con el código vivo de src/) y lo ejecuta en Node.
set -e
cd "$(dirname "$0")/.."
node_modules/.bin/esbuild scripts/chord-test.ts \
  --bundle --platform=node --format=esm --outfile=/tmp/chord-test.mjs >/dev/null
node /tmp/chord-test.mjs "$@"
