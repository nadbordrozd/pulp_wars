#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (pulp_wars-rp71).
#
# Every cloud container starts from a fresh clone, so this prepares it:
#   1. npm dependencies (npm install --no-save; package-lock.json untouched),
#   2. the Beads CLI (@beads/bd 1.3.1) when it is missing,
#   3. local Beads settings (beads.role, .beads permissions),
#   4. a --no-sandbox Chromium wrapper for the browser smokes (CHROME_PATH),
#   5. the Beads tracker database, cloned from the Git remote with
#      `bd bootstrap` only when no local database exists yet.
#
# Idempotent and non-interactive. It never deletes or moves an existing
# tracker database, never pushes, and never prints environment variables.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${CLAUDE_PROJECT_DIR:-$script_dir/../..}"

log() {
  echo "[session-start] $*"
}

BD_VERSION="1.3.1"
CHROMIUM_BIN="/opt/pw-browsers/chromium"
CHROME_WRAPPER="$HOME/.local/bin/pulp-wars-chrome"
BEADS_DB_DIR=".beads/embeddeddolt/pulp_wars"

status=0

# 1. npm dependencies. `npm install` (not `npm ci`) so a cached container
# reuses node_modules. --no-save keeps npm from rewriting the committed
# package-lock.json (npm 10 otherwise drops its "libc"/"peer" fields).
log "npm install"
npm install --no-audit --no-fund --no-save

# 2. Beads CLI.
if ! command -v bd >/dev/null 2>&1; then
  log "installing @beads/bd@$BD_VERSION"
  npm install -g --no-audit --no-fund "@beads/bd@$BD_VERSION"
fi

# 3. Local Beads settings that bd otherwise warns about on every command.
git config beads.role maintainer
chmod 700 .beads

# 4. Chromium wrapper: as root, Chromium refuses to start without --no-sandbox.
if [ -z "${CHROME_PATH:-}" ] && [ -x "$CHROMIUM_BIN" ]; then
  mkdir -p "$(dirname "$CHROME_WRAPPER")"
  cat >"$CHROME_WRAPPER" <<EOF
#!/bin/sh
exec $CHROMIUM_BIN --no-sandbox "\$@"
EOF
  chmod +x "$CHROME_WRAPPER"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    export_line="export CHROME_PATH=$CHROME_WRAPPER"
    if ! grep -qxF "$export_line" "$CLAUDE_ENV_FILE" 2>/dev/null; then
      echo "$export_line" >>"$CLAUDE_ENV_FILE"
    fi
  fi
  log "CHROME_PATH wrapper ready"
fi

# 5. Tracker database. Any other bd command run first would create an empty
# database and make bootstrap a no-op, so bootstrap runs only while the
# database directory is absent; an existing database is always left alone.
if [ ! -d "$BEADS_DB_DIR" ]; then
  bootstrap_log="$(mktemp "${TMPDIR:-/tmp}/pulp-wars-bd-bootstrap.XXXXXX")"
  log "restoring Beads tracker (bd bootstrap; log: $bootstrap_log)"
  if bd bootstrap --yes >"$bootstrap_log" 2>&1; then
    tail -n 1 "$bootstrap_log"
  else
    echo "[session-start] bd bootstrap failed; last lines of $bootstrap_log:" >&2
    tail -n 20 "$bootstrap_log" >&2
    status=1
  fi
else
  log "Beads tracker database present; skipping bootstrap"
fi

exit "$status"
