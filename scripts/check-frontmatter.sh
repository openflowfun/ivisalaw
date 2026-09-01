#!/bin/sh
# Catches the one YAML trap that keeps recurring in this project: an unquoted
# scalar whose value contains ": " (e.g. "requires in 2026: accreditation"),
# which js-yaml reads as a nested mapping and rejects at build time.
hits=$(grep -rnE '^\s*(-\s+)?[a-zA-Z_]+: [^|>"'"'"'#].*: ' src/content/ 2>/dev/null)
if [ -n "$hits" ]; then
  echo "Unquoted YAML scalar containing ': ' — wrap the value in double quotes:"
  echo "$hits"
  exit 1
fi
echo "frontmatter ok"
