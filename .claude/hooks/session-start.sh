#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (pulp_wars-rp71).
#
# Every cloud container starts from a fresh clone, so this prepares it:
#   1. npm dependencies (npm install --no-save; package-lock.json untouched),
#   2. the Beads CLI (@beads/bd 1.3.1) when it is missing,
#   3. local Beads settings (beads.role, .beads permissions),
#   4. a --no-sandbox Chromium wrapper for the browser smokes (CHROME_PATH),
#   5. the Beads tracker database, cloned from the Git remote with
#      `bd bootstrap` only when no local database exists yet,
#   6. the tracker sync branch: the Dolt `origin` remote is pointed at
#      refs/heads/beads-data (cloud sessions cannot push refs/dolt/data, which
#      only remains as a stale bootstrap seed), then `bd dolt pull` brings the
#      database up to date with it.
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
BEADS_DATA_REF="refs/heads/beads-data"

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

# 6. Tracker sync branch. The Dolt remote parameter git_ref makes `bd dolt
# push` and `bd dolt pull` use $BEADS_DATA_REF instead of refs/dolt/data. The
# JSON edit keeps every other field and only touches the `origin` remote.
if [ -d "$BEADS_DB_DIR" ]; then
  repo_state="$BEADS_DB_DIR/.dolt/repo_state.json"
  git_ref_status=0
  node -e '
    const fs = require("fs");
    const [file, ref] = process.argv.slice(1);
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    const origin = state.remotes && state.remotes.origin;
    if (!origin) process.exit(3);
    if (origin.params && origin.params.git_ref === ref) process.exit(0);
    origin.params = { ...(origin.params || {}), git_ref: ref };
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: fs.statSync(file).mode });
    fs.renameSync(tmp, file);
    console.log(`[session-start] Dolt origin git_ref set to ${ref}`);
  ' "$repo_state" "$BEADS_DATA_REF" || git_ref_status=$?

  if [ "$git_ref_status" -eq 3 ]; then
    log "warning: no Dolt remote named origin in $repo_state; skipping git_ref and bd dolt pull"
  elif [ "$git_ref_status" -ne 0 ]; then
    echo "[session-start] could not set git_ref in $repo_state; skipping bd dolt pull" >&2
    status=1
  else
    pull_log="$(mktemp "${TMPDIR:-/tmp}/pulp-wars-bd-pull.XXXXXX")"
    log "pulling Beads tracker from $BEADS_DATA_REF (bd dolt pull; log: $pull_log)"
    if bd dolt pull >"$pull_log" 2>&1; then
      awk 'NF { last = $0 } END { if (last != "") print last }' "$pull_log"
    elif grep -q "no branches found in remote" "$pull_log"; then
      log "warning: $BEADS_DATA_REF does not exist on the remote yet; the first bd dolt push creates it"
    else
      echo "[session-start] bd dolt pull failed; last lines of $pull_log:" >&2
      tail -n 20 "$pull_log" >&2
      status=1
    fi
  fi
fi

exit "$status"
