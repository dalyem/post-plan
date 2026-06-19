#!/usr/bin/env bash
#
# install-service.sh — build post-plan and run it as an always-on systemd
# service bound to 127.0.0.1. Front it with nginx + Tailscale (see
# deploy/post-plan.nginx.conf). Idempotent: re-run after a `git pull`.
#
# Usage:
#   ./scripts/install-service.sh              # systemd *user* service (no sudo) + linger
#   ./scripts/install-service.sh --system     # system service (sudo), runs as you, starts on boot
#   ./scripts/install-service.sh --uninstall  # stop + remove the service
#
# Config via environment variables (defaults shown):
#   PORT=8730                                  # port the app binds on 127.0.0.1
#   PUBLIC_BASE_URL=http://localhost:$PORT     # public URL used to build the links the app returns
#   DATABASE_PATH=<repo>/data/post-plan.db     # SQLite file location
#   SERVICE_NAME=post-plan
#
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-post-plan}"
MODE="user"
ACTION="install"
for arg in "$@"; do
  case "$arg" in
    --system) MODE="system" ;;
    --user) MODE="user" ;;
    --uninstall) ACTION="uninstall" ;;
    -h|--help) awk 'NR==1{next} /^#/{sub(/^# ?/,"");print;next} {exit}' "$0"; exit 0 ;;
    *) echo "Unknown argument: $arg (try --help)" >&2; exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_NAME="$(id -un)"
GROUP_NAME="$(id -gn)"

# ── systemctl wiring: per-user (default) vs system ──
if [ "$MODE" = "system" ]; then
  UNIT_DIR="/etc/systemd/system"
  if [ "$(id -u)" -eq 0 ]; then SUDO=(); else SUDO=(sudo); fi
  SYSTEMCTL=(${SUDO[@]+"${SUDO[@]}"} systemctl)
  JOURNAL=(${SUDO[@]+"${SUDO[@]}"} journalctl)
  WANTED_BY="multi-user.target"
else
  UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  SUDO=()
  SYSTEMCTL=(systemctl --user)
  JOURNAL=(journalctl --user)
  WANTED_BY="default.target"
fi
UNIT_PATH="$UNIT_DIR/$SERVICE_NAME.service"

# ── uninstall ──
if [ "$ACTION" = "uninstall" ]; then
  "${SYSTEMCTL[@]}" disable --now "$SERVICE_NAME" 2>/dev/null || true
  ${SUDO[@]+"${SUDO[@]}"} rm -f "$UNIT_PATH"
  "${SYSTEMCTL[@]}" daemon-reload || true
  echo "Removed $SERVICE_NAME ($MODE service)."
  exit 0
fi

# ── prerequisites ──
command -v pnpm >/dev/null || { echo "ERROR: pnpm not found — run: corepack enable && corepack prepare pnpm@latest --activate"; exit 1; }

# Resolve a STABLE node bin dir. fnm's per-shell path lives under /run/user/...
# and changes across reboots, so prefer the 'default' alias (matches mcp-manage).
resolve_node_dir() {
  local d
  for d in \
    "${XDG_DATA_HOME:-$HOME/.local/share}/fnm/aliases/default/bin" \
    "$HOME/.fnm/aliases/default/bin"; do
    if [ -x "$d/node" ]; then echo "$d"; return; fi
  done
  dirname "$(readlink -f "$(command -v node)")"
}
NODE_DIR="$(resolve_node_dir)"
NODE_EXE="$NODE_DIR/node"
[ -x "$NODE_EXE" ] || { echo "ERROR: no node binary at $NODE_EXE"; exit 1; }
if [ "$("$NODE_EXE" -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "ERROR: Node >= 20 required (resolved $("$NODE_EXE" -v) at $NODE_EXE)"; exit 1
fi

# ── config ──
PORT="${PORT:-8730}"
DATABASE_PATH="${DATABASE_PATH:-$ROOT/data/post-plan.db}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://localhost:$PORT}"
NEXT_BIN="$ROOT/web/node_modules/next/dist/bin/next"
# PATH for the unit: node bin dir + the usual locations.
SERVICE_PATH="$NODE_DIR:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "==> Building post-plan ($ROOT)"
echo "    node:  $NODE_EXE ($("$NODE_EXE" -v))"
cd "$ROOT"
pnpm install
pnpm --filter ./web build
pnpm --filter ./mcp build
[ -f "$NEXT_BIN" ] || { echo "ERROR: next binary not found at $NEXT_BIN"; exit 1; }
mkdir -p "$(dirname "$DATABASE_PATH")"

# ── compose unit file (bound to 127.0.0.1 via `next start -H`) ──
echo "==> Writing $UNIT_PATH"
UNIT="[Unit]
Description=post-plan — self-hosted plan-publishing app for AI agents
Documentation=https://github.com/dalyem/post-plan
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT/web
Environment=NODE_ENV=production
Environment=PATH=$SERVICE_PATH
Environment=DATABASE_PATH=$DATABASE_PATH
Environment=PUBLIC_BASE_URL=$PUBLIC_BASE_URL
# Bound to 127.0.0.1 — never exposed directly. Front it with nginx + Tailscale.
ExecStart=$NODE_EXE $NEXT_BIN start -H 127.0.0.1 -p $PORT
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true"
if [ "$MODE" = "system" ]; then
  UNIT="$UNIT
User=$USER_NAME
Group=$GROUP_NAME"
fi
UNIT="$UNIT

[Install]
WantedBy=$WANTED_BY
"

${SUDO[@]+"${SUDO[@]}"} mkdir -p "$UNIT_DIR"
printf '%s' "$UNIT" | ${SUDO[@]+"${SUDO[@]}"} tee "$UNIT_PATH" >/dev/null

# ── enable + start ──
echo "==> Enabling + starting $SERVICE_NAME"
"${SYSTEMCTL[@]}" daemon-reload
"${SYSTEMCTL[@]}" enable --now "$SERVICE_NAME"

if [ "$MODE" = "user" ]; then
  # Keep it running after logout / across reboots without a login session.
  loginctl enable-linger "$USER_NAME" >/dev/null 2>&1 || sudo loginctl enable-linger "$USER_NAME" >/dev/null 2>&1 \
    || echo "NOTE: run 'sudo loginctl enable-linger $USER_NAME' so it survives logout/reboot."
fi

echo
echo "✅ post-plan is up on http://127.0.0.1:$PORT  (links use $PUBLIC_BASE_URL)"
echo
echo "Manage it:"
echo "  status:  ${SYSTEMCTL[*]} status $SERVICE_NAME"
echo "  logs:    ${JOURNAL[*]} -u $SERVICE_NAME -f"
echo "  restart: ${SYSTEMCTL[*]} restart $SERVICE_NAME"
echo "  remove:  $0 $([ "$MODE" = system ] && echo '--system ')--uninstall"
echo
echo "Front it with nginx + Tailscale:"
echo "  1) copy deploy/post-plan.nginx.conf → /etc/nginx/sites-available/post-plan (edit server_name + port)"
echo "  2) sudo ln -s ../sites-available/post-plan /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"
echo "  3) tailscale serve is an alternative that needs no nginx: tailscale serve $PORT"
echo
echo "Point agents at it via .mcp.json:"
echo "  command: node   args: [\"$ROOT/mcp/dist/index.js\"]   env: { POST_PLAN_API_BASE_URL: \"$PUBLIC_BASE_URL\" }"
