#!/usr/bin/env bash
# Prompt for TYPESAFE_API_KEY without echoing it, store it only in .env (mode 600),
# make sure .env is git-ignored, then run the JEV smoke test.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -t 0 ]; then
  echo "Error: run this in an interactive terminal (no TTY on stdin)." >&2
  exit 1
fi

IFS= read -rsp "TYPESAFE_API_KEY (input hidden): " key
echo
key="${key//[$'\r\n\t ']/}"
if [ -z "$key" ]; then
  echo "Error: empty key, nothing saved." >&2
  exit 1
fi

# Ensure .env is ignored before it is written.
touch .gitignore
grep -qxF ".env" .gitignore || printf '.env\n' >> .gitignore
if ! git check-ignore -q .env; then
  echo "Error: .env is not ignored by git; aborting without saving." >&2
  exit 1
fi

# Rewrite .env with owner-only permissions, replacing any previous key line.
umask 077
tmp="$(mktemp .env.XXXXXX)"
[ -f .env ] && grep -v '^TYPESAFE_API_KEY=' .env > "$tmp" || true
printf 'TYPESAFE_API_KEY=%s\n' "$key" >> "$tmp"   # printf is a builtin: key never appears in argv
mv "$tmp" .env
chmod 600 .env
unset key

echo "Saved to .env (length hidden, permissions 600, git-ignored)."
echo "Running npm run jev:smoke ..."
npm run --silent jev:smoke
