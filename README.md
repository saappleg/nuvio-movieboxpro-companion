# MovieBoxPro Local Companion & Discovery Hub for Nuvio

Use your own authorized MovieBoxPro account as a private Nuvio stream source, discover calendar releases and new movies/series, and sync with Nuvio Cloud for personalized library-driven recommendations. The companion runs a logged-in browser session on your server and gives Nuvio fresh playback links on demand.

This is an unofficial interoperability project. It does not bypass MovieBoxPro login, VIP checks, DRM, or access controls.

## Key Features

- **MovieBoxPro Stream Source:** Provides MovieBoxPro as a stream scraper in Nuvio, fetching on-demand playback links with subtitles and qualities.
- **Comprehensive Calendar & Discovery Feeds:**
  - **Airing Today:** TV show episodes broadcasting today.
  - **This Week (TV & Movies):** New episodes and movie releases arriving this week.
  - **New & Returning:** Premieres and brand new seasons.
  - **New Series & New Movies:** Trending recent TV series and now-playing digital/theatrical movies.
  - **Personalized Recommendations:** TV and movie recommendation rows generated dynamically from your synchronized Nuvio Library.
- **Nuvio Cloud Integration:** Connect your Nuvio Cloud account directly from the companion dashboard to pull your library and watched items.
- **Local & Private:** Browser cookies, TMDb keys, and streaming tokens stay on your local machine or server.

## Easiest setup: Proxmox VE LXC

The Proxmox installer creates a lightweight Debian 13 container, installs Chromium and the companion, generates private credentials, starts everything at boot, and supports one-command updates. Docker is not required.

Run this in the **Proxmox VE host shell**:

```sh
curl -fsSL https://raw.githubusercontent.com/community-scripts/core/main/tools/run.sh |
  bash -s -- https://raw.githubusercontent.com/saappleg/nuvio-movieboxpro-companion/main ct/nuviomovieboxprocompanion.sh
```

After installation, open the LXC console and run:

```sh
nuvio-companion setup-url
nuvio-companion desktop-password
```

Open the setup URL, enter your TMDb API key, connect MovieBoxPro via QR/code login, and optionally connect Nuvio Cloud to sync your library.

## Docker server setup

### What you need

- A Linux server with Docker and Docker Compose
- Tailscale on the server, phone, and Android TV
- Your own MovieBoxPro account
- A free [TMDb API key](https://www.themoviedb.org/settings/api)

### 1. Download and initialize

```sh
git clone https://github.com/saappleg/nuvio-movieboxpro-companion.git
cd nuvio-movieboxpro-companion
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

### 2. Start the container

```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker compose -f docker-compose.ghcr.yml ps
```

### 3. Open the Setup Dashboard

The helper prints your private dashboard address:

```text
http://100.x.y.z:43110/setup?key=YOUR_PRIVATE_KEY
```

On the dashboard:
1. Save your **TMDb v3 API key**.
2. Select **Open login window** (or Open server desktop) to complete MovieBoxPro QR/code login.
3. In **Nuvio Cloud Sync**, enter your Nuvio email & password to sync your library and generate recommendations.
4. Reveal and copy the **Provider URL** and **Discovery Add-on URL**.

### 4. Add to Nuvio

In Nuvio's web dashboard or app settings:
1. Under **Plugins / Providers**, add the copied **Provider URL**.
2. Under **Add-ons**, add the copied **Discovery & Calendar Add-on URL**.
3. Refresh plugins on your TV and mobile devices.

## Mac-only setup

```sh
npm install
npm run init:lan
npm start
```

In a second terminal:
```sh
npm run setup-url
```

Open the printed setup URL in your browser. Node.js 20 or newer is required.

## Testing & Contributing

```sh
npm test
```

MIT licensed. Not affiliated with MovieBoxPro, Nuvio, or TMDb.
