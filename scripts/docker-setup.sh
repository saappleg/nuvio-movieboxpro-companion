#!/bin/sh
set -eu

config_file=".env"

if [ -e "$config_file" ]; then
  echo "Setup stopped: .env already exists. It was not changed."
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "Setup needs OpenSSL. Install it, then run this script again."
  exit 1
fi

detected_ip=""
if command -v tailscale >/dev/null 2>&1; then
  detected_ip=$(tailscale ip -4 2>/dev/null | sed -n '1p' || true)
fi

if [ -n "$detected_ip" ]; then
  printf 'Server Tailscale IP [%s]: ' "$detected_ip"
else
  printf 'Server Tailscale IP (usually starts with 100.): '
fi

IFS= read -r entered_ip
server_ip=${entered_ip:-$detected_ip}

case "$server_ip" in
  ""|0.0.0.0|127.*|*[!0-9.]* )
    echo "Setup stopped: enter the server's private Tailscale IPv4 address."
    exit 1
    ;;
esac

companion_key=$(openssl rand -hex 32)
plugin_key=$(openssl rand -hex 32)
novnc_password=$(openssl rand -hex 16 | cut -c 1-8)

umask 077
{
  echo "COMPANION_VERSION=latest"
  echo "COMPANION_KEY=$companion_key"
  echo "PLUGIN_SETUP_KEY=$plugin_key"
  echo "HOST=0.0.0.0"
  echo "PORT=43110"
  echo "STREAM_TIMEOUT_MS=45000"
  echo "PRIVATE_BIND_IP=$server_ip"
  echo "COMPANION_PUBLIC_URL=http://$server_ip:43110"
  echo "NOVNC_PASSWORD=$novnc_password"
} > "$config_file"
chmod 0600 "$config_file"

echo
echo "Private configuration created successfully."
echo
echo "Start the companion:"
echo "  docker compose -f docker-compose.ghcr.yml pull"
echo "  docker compose -f docker-compose.ghcr.yml up -d"
echo
echo "Then open this private setup page:"
echo "  http://$server_ip:43110/setup?key=$companion_key"
echo
echo "The setup page will show the private browser desktop link."
echo "Its password is: $novnc_password"
echo
echo "Keep this terminal output and .env private."
