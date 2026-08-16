#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${NOVNC_PASSWORD:-}" ]]; then
  echo "NOVNC_PASSWORD is required" >&2
  exit 1
fi

mkdir -p /run/nuvio /data/movieboxpro-profile
x11vnc -storepasswd "${NOVNC_PASSWORD:0:8}" /run/nuvio/vnc.pass >/dev/null

Xvfb :99 -screen 0 1440x900x24 -nolisten tcp &
fluxbox >/tmp/fluxbox.log 2>&1 &
x11vnc -display :99 -rfbauth /run/nuvio/vnc.pass -forever -shared -localhost -quiet &
websockify --web=/usr/share/novnc 6080 localhost:5900 &

exec node src/server.mjs
