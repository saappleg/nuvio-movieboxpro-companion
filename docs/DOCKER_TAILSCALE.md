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
- The repository cloned onto the server for its Compose and example configuration files.
- A MovieBoxPro account the user is authorized to access.

Tailscale supports Android 8 or later, including Android TV. Use its Android TV QR-code or generated-code login flow to add the TV to the same tailnet.

## 1. Prepare the private network

Install Tailscale on all three devices and sign them into the same tailnet. On the server, obtain its stable `100.x.y.z` Tailscale IP:

```sh
tailscale ip -4
```

Do not enable a Tailscale Funnel, router port forwarding, or a public reverse proxy for this service. Tailnet access rules should permit only the user's Pixel and Android TV to reach server ports `43110` and `6080`.

## 2. Configure the container

The recommended option generates the private configuration automatically:

```sh
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

The helper uses the server's Tailscale IP, creates two different random access keys and a noVNC password, writes `.env` with mode `0600`, and prints the private setup URL. It refuses to overwrite an existing `.env` file.

### Manual alternative

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

You can add the TMDb key later through the guided dashboard. Never commit `.env`.

## 3. Pull and start the release package

```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker compose -f docker-compose.ghcr.yml ps
```

The package supports AMD64 and ARM64 Linux hosts. To pin a tested release instead of following `latest`, add `COMPANION_VERSION=0.2.1` to `.env`.

The named Docker volume `companion-data` preserves the Chromium profile across container replacement and restarts.

Dashboard changes are written to `/data/companion.env` in the same named volume. On later starts this persistent file takes precedence over stale values passed through the original Compose `.env` file.

The companion serializes browser startup so simultaneous Nuvio requests cannot launch competing Chromium instances. Compose also provides a health check, a restart policy, and a 30-second graceful shutdown window so Chromium can release its persistent profile cleanly.

## 4. Log into MovieBoxPro

From the Pixel while Tailscale is connected, open:

```text
http://SERVER_TAILSCALE_IP:6080/vnc.html
```

Enter the generated `NOVNC_PASSWORD`. Keep this tab open, return to the companion dashboard, and select **Open login window**. The Chromium window appears in noVNC. Complete MovieBoxPro's code-login flow there. Never share the active code.

For the guided flow, open the companion dashboard on the Pixel:

```text
http://SERVER_TAILSCALE_IP:43110/setup?key=YOUR_COMPANION_KEY
```

The key is removed from the address bar after the dashboard creates an HTTP-only local session. Use **Open server desktop**, then **Open login window**, complete login in the private desktop, and select **Check status**.

Verify authentication with the protected `/status` URL. Close the noVNC tab afterward; the Chromium profile remains in the Docker volume.

## 5. Install the Nuvio plugin

The companion dashboard reveals the exact protected installation URL. Copy it into Nuvio's plugin/provider repository settings. Its format is:

```text
http://SERVER_TAILSCALE_IP:43110/manifest.json?key=YOUR_PLUGIN_SETUP_KEY
```

Refresh plugins, restart Nuvio if necessary, and test one movie and one TV episode. Both the Pixel and Android TV must have Tailscale connected whenever Nuvio loads the provider or requests streams.

## Maintenance

```sh
docker compose -f docker-compose.ghcr.yml logs --tail=100 companion
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Back up the Docker volume only to encrypted storage. Treat it as account-sensitive because it contains the persistent MovieBoxPro browser profile. Re-authenticate through noVNC if `/status` reports that the session expired.

Always use `docker compose stop`, `docker compose restart`, or a normal VM shutdown. Avoid force-killing Chromium or powering off the VM when possible. After an unclean host failure, start only one companion container against the volume and check `docker compose logs companion` for a profile-lock warning.

## Cloud VPS notes

Use a normal Docker-capable VPS only as a private tailnet device. Its security group should deny public inbound access to ports `43110`, `5900`, and `6080`. Port `5900` is not published by the Compose file at all. The VPS provider's acceptable-use policy and MovieBoxPro's terms still apply.
