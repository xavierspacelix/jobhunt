#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/browser-extension"
ARTIFACT="$ROOT_DIR/public/jobhunter-chrome-extension.zip"

rm -f "$ARTIFACT"
(
  cd "$SOURCE_DIR"
  zip -X -r "$ARTIFACT" .
)

echo "Created $ARTIFACT"
