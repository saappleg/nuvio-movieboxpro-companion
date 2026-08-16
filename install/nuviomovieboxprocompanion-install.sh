#!/usr/bin/env bash

# Copyright (c) 2026 Steven
# License: MIT | https://github.com/saappleg/nuvio-movieboxpro-companion/blob/main/LICENSE
# Source: https://github.com/saappleg/nuvio-movieboxpro-companion

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Desktop Dependencies"
$STD apt install -y fluxbox novnc websockify x11vnc xvfb
msg_ok "Installed Desktop Dependencies"

NODE_VERSION="24" setup_nodejs

fetch_and_deploy_gh_release "nuvio-movieboxpro-companion" "saappleg/nuvio-movieboxpro-companion" "tarball"

msg_info "Installing Application Dependencies"
cd /opt/nuvio-movieboxpro-companion
$STD npm ci --omit=dev
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright $STD npx playwright install --with-deps chromium
msg_ok "Installed Application Dependencies"

msg_info "Configuring Companion"
install -d -m 0700 /etc/nuvio-movieboxpro-companion
install -d -m 0700 /var/lib/nuvio-movieboxpro-companion/movieboxpro-profile

CONTAINER_IP="$(hostname -I | awk '{print $1}')"
COMPANION_KEY="$(openssl rand -hex 32)"
PLUGIN_SETUP_KEY="$(openssl rand -hex 32)"
NOVNC_PASSWORD="$(openssl rand -hex 4)"

cat <<EOF >/etc/nuvio-movieboxpro-companion/companion.env
COMPANION_KEY=${COMPANION_KEY}
PLUGIN_SETUP_KEY=${PLUGIN_SETUP_KEY}
HOST=0.0.0.0
PORT=43110
BROWSER_CHANNEL=chromium
DISPLAY=:99
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
MOVIEBOXPRO_PROFILE=/var/lib/nuvio-movieboxpro-companion/movieboxpro-profile
COMPANION_CONFIG=/etc/nuvio-movieboxpro-companion/companion.env
COMPANION_PUBLIC_URL=http://${CONTAINER_IP}:43110
TMDB_API_KEY=
TMDB_BEARER_TOKEN=
NOVNC_PASSWORD=${NOVNC_PASSWORD}
EOF
chmod 0600 /etc/nuvio-movieboxpro-companion/companion.env
x11vnc -storepasswd "$NOVNC_PASSWORD" /etc/nuvio-movieboxpro-companion/vnc.pass >/dev/null
chmod 0600 /etc/nuvio-movieboxpro-companion/vnc.pass

chmod 0755 /opt/nuvio-movieboxpro-companion/scripts/nuvio-companion
ln -sf /opt/nuvio-movieboxpro-companion/scripts/nuvio-companion /usr/local/bin/nuvio-companion
msg_ok "Configured Companion"

msg_info "Creating Services"
cat <<'EOF' >/etc/systemd/system/nuvio-display.service
[Unit]
Description=Nuvio Companion virtual display
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1440x900x24 -nolisten tcp
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat <<'EOF' >/etc/systemd/system/nuvio-window-manager.service
[Unit]
Description=Nuvio Companion window manager
Requires=nuvio-display.service
After=nuvio-display.service

[Service]
Type=simple
Environment=DISPLAY=:99
ExecStartPre=/bin/sleep 1
ExecStart=/usr/bin/fluxbox
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat <<'EOF' >/etc/systemd/system/nuvio-vnc.service
[Unit]
Description=Nuvio Companion private VNC server
Requires=nuvio-display.service
After=nuvio-display.service nuvio-window-manager.service

[Service]
Type=simple
ExecStart=/usr/bin/x11vnc -display :99 -rfbauth /etc/nuvio-movieboxpro-companion/vnc.pass -forever -shared -localhost -quiet
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat <<'EOF' >/etc/systemd/system/nuvio-novnc.service
[Unit]
Description=Nuvio Companion browser desktop
Requires=nuvio-vnc.service
After=nuvio-vnc.service

[Service]
Type=simple
ExecStart=/usr/bin/websockify --web=/usr/share/novnc 6080 localhost:5900
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat <<'EOF' >/etc/systemd/system/nuvio-companion.service
[Unit]
Description=Nuvio MovieBoxPro Companion
Wants=network-online.target
Requires=nuvio-display.service
After=network-online.target nuvio-display.service nuvio-window-manager.service

[Service]
Type=simple
WorkingDirectory=/opt/nuvio-movieboxpro-companion
EnvironmentFile=/etc/nuvio-movieboxpro-companion/companion.env
ExecStart=/usr/bin/node src/server.mjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable -q --now nuvio-display nuvio-window-manager nuvio-vnc nuvio-novnc nuvio-companion
msg_ok "Created Services"

motd_ssh
customize
cleanup_lxc

echo
echo "Private setup URL: http://${CONTAINER_IP}:43110/setup?key=${COMPANION_KEY}"
echo "Browser desktop:  http://${CONTAINER_IP}:6080/vnc.html"
echo "Desktop password: ${NOVNC_PASSWORD}"
echo "These values can be shown later with: nuvio-companion setup-url and nuvio-companion desktop-password"
