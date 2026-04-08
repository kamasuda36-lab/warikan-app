#!/bin/sh
export PATH="/tmp/node-v20.11.0-darwin-arm64/bin:$PATH"
cd "$(dirname "$0")"
exec npm run dev -- --host --port "${PORT:-5174}"
