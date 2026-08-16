# Private Docker deployment with Tailscale

This deployment keeps the companion available while the original Mac is off. It runs on a separate, always-on Linux server or VPS and is reachable only by devices in the same Tailscale network.

## Architecture

```text
Pixel / Android TV with Tailscale
            |
            | private tailnet
            v
Docker host's Tailscale IP
  - companion on 43110
  - private browser desktop on 6080
            |
            v
Persistent Chromium profile and MovieBoxPro session
```

TorBox remains a separate Nuvio/AIOStreams source. TorBox does not run this container.

## Requirements

- An always-on x86-64 or ARM64 Linux server with Docker Engine and Docker Compose.
- Tailscale installed on the server, Pixel, and Android TV.
- The repository cloned onto the server.
- A MovieBoxPro account the user is authorized to access.

Tailscale supports Android 8 or later, including Android TV. Use its Android TV QR-code or generated-code login flow to add the TV to the same tailnet.

## 1. Prepare the private network

Install Tailscale on all three devices and sign them into the same tailnet. On the server, obtain its stable `100.x.y.z` Tailscale IP:

```sh
tailscale ip -4
```

Do not enable a Tailscale Funnel, router port forwarding, or a public reverse proxy for this service. Tailnet access rules should permit only the user's Pixel and Android TV to reach server ports `43110` and `6080`.

## 2. Configure the container

Copy `.env.example` to `.env`. Generate different random values for `COMPANION_KEY` and `PLUGIN_SETUP_KEY`:

```sh
openssl rand -hex 32
openssl rand -hex 32
```

Set these Docker-specific values in `.env`, replacing the example IP:

```dotenv
HOST=0.0.0.0
PORT=43110
PRIVATE_BIND_IP=100.64.12.34
COMPANION_PUBLIC_URL=http://100.64.12.34:43110
NOVNC_PASSWORD=8Random!
```

`HOST=0.0.0.0` is used only inside the isolated container. Docker publishes the ports on `PRIVATE_BIND_IP`, which must be the server's Tailscale IP—not its public IP and not `0.0.0.0`.

Complete the remaining TMDb and profile settings from `.env.example`. Never commit `.env`.

## 3. Build and start

```sh
docker compose up -d --build
docker compose ps
```

The named Docker volume `companion-data` preserves the Chromium profile across container replacement and restarts.

## 4. Log into MovieBoxPro

From the Pixel while Tailscale is connected, open:

```text
http://SERVER_TAILSCALE_IP:6080/vnc.html
```

Enter `NOVNC_PASSWORD`. In another private browser tab, request the companion login window using the URL described in the main README. The Chromium window appears in noVNC. Complete MovieBoxPro's code-login flow there. Never share the active code.

Verify authentication with the protected `/status` URL. Close the noVNC tab afterward; the Chromium profile remains in the Docker volume.

## 5. Install the Nuvio plugin

In the Nuvio web dashboard, replace the old Mac-local plugin with:

```text
http://SERVER_TAILSCALE_IP:43110/manifest.json?key=YOUR_PLUGIN_SETUP_KEY
```

Refresh plugins. Both the Pixel and Android TV must have Tailscale connected whenever Nuvio loads the provider or requests streams.

## Maintenance

```sh
docker compose logs --tail=100 companion
docker compose pull
docker compose up -d --build
```

Back up the Docker volume only to encrypted storage. Treat it as account-sensitive because it contains the persistent MovieBoxPro browser profile. Re-authenticate through noVNC if `/status` reports that the session expired.

## Cloud VPS notes

Use a normal Docker-capable VPS only as a private tailnet device. Its security group should deny public inbound access to ports `43110`, `5900`, and `6080`. Port `5900` is not published by the Compose file at all. The VPS provider's acceptable-use policy and MovieBoxPro's terms still apply.
