# MovieBoxPro Local Companion for Nuvio

Use your own authorized MovieBoxPro account as a private Nuvio stream source. The companion runs a logged-in browser on your server and gives Nuvio fresh playback links when you select a title.

This is an unofficial interoperability project. It does not bypass MovieBoxPro login, VIP checks, DRM, or access controls.

## Easiest setup: Proxmox VE LXC

The Proxmox installer creates a lightweight Debian 13 container, installs Chromium and the companion, generates private credentials, starts everything at boot, and supports one-command updates. Docker is not required.

Run this in the **Proxmox VE host shell**:

```sh
curl -fsSL https://raw.githubusercontent.com/community-scripts/core/main/tools/run.sh |
  bash -s -- https://raw.githubusercontent.com/saappleg/nuvio-movieboxpro-companion/main ct/nuviomovieboxprocompanion.sh
```

Until the script is accepted into the official Community Scripts catalog, this command runs the submission-ready files from this repository with the official Community Scripts engine. Review scripts before running them as root.

After installation, open the new LXC's console and run:

```sh
nuvio-companion setup-url
nuvio-companion desktop-password
```

Open the setup URL, add your TMDb key, then use the browser desktop to complete MovieBoxPro's official QR/code login. See the [Proxmox guide](docs/PROXMOX.md) for the complete beginner walkthrough.

## Docker server setup

This is the easiest setup and keeps the companion available when your Mac is off. It works on AMD64 and ARM64 Linux servers.

### What you need

- A Linux server with Docker and Docker Compose
- Tailscale on the server, phone, and Android TV
- Your own MovieBoxPro account
- A free [TMDb API key](https://www.themoviedb.org/settings/api)

Do not open router ports for this project. Your devices should reach it only through Tailscale.

### 1. Download the setup files

Run these commands on the server:

```sh
git clone https://github.com/saappleg/nuvio-movieboxpro-companion.git
cd nuvio-movieboxpro-companion
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

The helper detects or asks for the server's Tailscale IP, generates all private keys and passwords, and creates a private `.env` file. It will not overwrite an existing setup.

### 2. Start the companion

```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker compose -f docker-compose.ghcr.yml ps
```

Wait until the container reports `healthy`. The first download is large because it includes Chromium and a private browser desktop.

### 3. Open the guided setup page

The helper prints a private address similar to:

```text
http://100.x.y.z:43110/setup?key=YOUR_PRIVATE_KEY
```

Open that exact address on a device connected to the same Tailscale network. Do not share it.

On the setup page:

1. Enter your TMDb v3 API key and save.
2. Select **Open server desktop** and enter the generated desktop password.
3. Return to the setup page and select **Open login window**.
4. In the server desktop, use MovieBoxPro's QR/code login and approve it from your own account.
5. Return to the setup page and select **Check status**.
6. When MovieBoxPro shows as connected, reveal and copy the Nuvio installation URL.

Never paste a MovieBoxPro password, login code, cookie, or companion key into an issue or chat.

### 4. Add it to Nuvio

In Nuvio's web dashboard:

1. Open the plugin/provider repository settings.
2. Add the private installation URL copied from the companion dashboard.
3. Refresh plugins on the Pixel and Android TV.
4. Confirm Tailscale is connected on each device.
5. Test a movie and a TV episode.

The plugin URL points to your server, not GitHub. Every user needs their own running companion and authorized MovieBoxPro session.

## Updating

Your login, settings, and browser profile live in the persistent Docker volume and survive normal updates.

```sh
cd nuvio-movieboxpro-companion
git pull --ff-only
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

To stay on one tested version, add `COMPANION_VERSION=0.3.3` to `.env`. Remove that line or set it to `latest` to follow new releases.

## Quick troubleshooting

Check whether the container is healthy:

```sh
docker compose -f docker-compose.ghcr.yml ps
docker compose -f docker-compose.ghcr.yml logs --tail=100 companion
```

- **Setup page will not open:** confirm Tailscale is connected and `.env` contains the server's Tailscale IP for both `PRIVATE_BIND_IP` and `COMPANION_PUBLIC_URL`.
- **MovieBoxPro is disconnected:** reopen the server desktop, select **Open login window**, and complete code login again.
- **Nuvio keeps loading:** verify the companion shows `healthy`, MovieBoxPro status is connected, and Tailscale is active on the Nuvio device.
- **Android TV does not show the provider:** refresh Nuvio plugins and restart Nuvio after confirming the TV can reach the setup page through Tailscale.
- **Container will not start after a power loss:** make sure only one companion container uses the persistent volume, then inspect the logs for a browser profile-lock message.

For detailed instructions, see:

- [Docker and Tailscale guide](docs/DOCKER_TAILSCALE.md)
- [Proxmox deployment guide](docs/PROXMOX.md)
- [Continuous-running and security notes](docs/ALWAYS_ON.md)

## Mac-only setup

Use this only when Nuvio will connect to a Mac that remains powered on.

```sh
npm install
npm run init:lan
npm start
```

In a second terminal, run `npm run setup-url`, open the private address it prints, and follow the same guided setup page. Node.js 20 or newer is required.

## How it stays private

- `.env` and the browser profile are excluded from Git.
- MovieBoxPro login happens on the official site in a dedicated persistent browser profile.
- The service does not extract, return, or log Google tokens or MovieBoxPro cookies.
- Stream requests require a long random companion key.
- Playback responses are not cached, and signed playback links are generated on demand.
- Docker publishes the dashboard and browser desktop only on the exact private IP in `.env`.

Never expose ports `43110`, `5900`, or `6080` to the public internet. Do not use Tailscale Funnel or a public reverse proxy for this service.

## For contributors

The source-based `docker-compose.yml` builds locally. Release users should use `docker-compose.ghcr.yml` with the public package at `ghcr.io/saappleg/nuvio-movieboxpro-companion`.

The `ct/`, `install/`, and `json/` files follow the current Proxmox VE Community Scripts contribution format. Test the installer on a non-production Proxmox host before proposing it upstream.

```sh
npm test
```

The repository is safe to publish only while `.env`, browser profiles, generated provider responses, HAR files, cookies, active login codes, and real TMDb credentials remain uncommitted.

## Current limitations

- MovieBoxPro uses an undocumented private web interface and can change it without notice.
- MovieBoxPro sessions expire and occasionally require code login again.
- Search matching uses title, media type, year, and runtime because search results do not expose stable TMDb/IMDb mappings.

MIT licensed. This project is not affiliated with MovieBoxPro, Nuvio, or TMDb. See [CHANGELOG.md](CHANGELOG.md) for release history.
