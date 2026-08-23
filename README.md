# MovieBoxPro Local Companion & Discovery Hub for Nuvio

<p align="center">
  <img src="docs/assets/banner.png" alt="Nuvio MovieBoxPro Companion Banner" width="100%" style="max-width: 800px; border-radius: 12px;" onerror="this.style.display='none'"/>
</p>

<p align="center">
  <a href="https://github.com/saappleg/nuvio-movieboxpro-companion/releases"><img src="https://img.shields.io/github/v/release/saappleg/nuvio-movieboxpro-companion?color=blue&style=flat-square" alt="Latest Release"></a>
  <a href="https://github.com/saappleg/nuvio-movieboxpro-companion/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/saappleg/nuvio-movieboxpro-companion/ci.yml?branch=main&label=CI&style=flat-square" alt="CI Status"></a>
  <a href="https://ghcr.io/saappleg/nuvio-movieboxpro-companion"><img src="https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker&style=flat-square" alt="Docker GHCR"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square" alt="Node Version"></a>
</p>

---

## Overview

**Nuvio MovieBoxPro Companion & Discovery Hub** is an all-in-one local bridge and content enhancement service for [Nuvio](https://nuvio.app).

It enables you to:
1. **Stream from MovieBoxPro:** Securely use your own authorized MovieBoxPro account as a high-speed private playback provider in Nuvio with 4K/1080p/720p/360p stream resolution and multi-language subtitles.
2. **Discover Dynamic Content:** Access comprehensive release calendars, airing today schedules, network spotlights, and bespoke custom feeds.
3. **Sync with Nuvio Cloud:** Automatically import your Nuvio Cloud library to dynamically generate personalized movie and TV series recommendation rows.
4. **Skip Intros & Recaps with IntroDB:** Automatically enrich streams with crowdsourced intro, outro, and recap timestamps for seamless 1-click skip buttons.
5. **Enrich Metadata:** Display Rotten Tomatoes (🍅), Audience Scores (🍿), IMDb ratings, cast & crew details, YouTube trailers, and similar title recommendations.

> [!IMPORTANT]
> **Legal Disclaimer:** This is an unofficial, private interoperability project designed for personal home server use. It does not bypass MovieBoxPro login, VIP subscription requirements, DRM, or access controls. You must have your own active MovieBoxPro account.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🎬 **MovieBoxPro Scraper** | Fetches on-demand playback links with full audio/subtitle tracks and adaptive quality selection (4K, 1080p, 720p, 360p). |
| 📅 **Smart Calendar Feeds** | **Airing Today**, **This Week (TV & Movies)**, and **New & Returning** feeds computed relative to your local timezone. |
| 📚 **Library-Driven Discovery** | **New Today (Library Based)** displays episodes airing today from your synced library and cleanly hides when empty. |
| ☁️ **Nuvio Cloud Sync** | 1-click connection and automatic 6-hour background sync with your Nuvio Cloud account for dynamic recommendations. |
| ⏭️ **IntroDB Integration** | Automatic crowdsourced intro/outro/recap skip timestamps via `api.introdb.app` attached directly to video streams. |
| 🍅 **Multi-Source Ratings** | Rotten Tomatoes Tomatometer (🍅), Audience Score (🍿), and IMDb ratings embedded directly in Nuvio metadata. |
| 🛡️ **Stream Video Proxy** | Built-in reverse proxy (`/stream/proxy`) supporting HTTP 206 Partial Content Range seeking and header spoofing to eliminate 403 errors on strict players. |
| 🕒 **Timezone-Safe Schedules** | Native IANA timezone configuration with UTC noon normalization, preventing release dates from shifting backward in negative UTC offsets. |
| 🛠️ **Custom Feed Builder** | Build custom movie and TV series catalog feeds using TMDb discovery filters (genres, release decades, languages, studios, minimum ratings). |
| 👥 **Multi-Profile System** | Create isolated profiles (e.g. *Living Room*, *Kids*, *Bedroom*) with separate MovieBoxPro browser sessions, seeds, and manifest URLs. |
| 📱 **Installable PWA Dashboard** | Fast, responsive Web App with Service Worker for 1-tap "Add to Home Screen" installation on iOS and Android. |
| 📊 **Real-time Analytics** | Live stream latency metrics, TMDb cache hit rates, in-memory cache counts, and streaming activity log. |
| 💾 **1-Click Backup & Restore** | Export and restore full JSON backups containing profiles, seeds, custom feeds, and settings. |

---

## 🚀 Deployment Options

Choose the deployment method that fits your environment:

### Option 1: Proxmox VE LXC (Recommended - 1-Click Install)

The Proxmox VE Community Script creates a lightweight Debian 13 LXC container, installs Chromium and the companion, configures systemd services, and enables one-command updates without requiring Docker.

Run this in your **Proxmox VE Host Shell**:

```sh
curl -fsSL https://raw.githubusercontent.com/community-scripts/core/main/tools/run.sh |
  bash -s -- https://raw.githubusercontent.com/saappleg/nuvio-movieboxpro-companion/main ct/nuviomovieboxprocompanion.sh
```

#### Everyday LXC Commands
In the Proxmox LXC console:

```sh
nuvio-companion setup-url          # Print the private dashboard URL
nuvio-companion desktop-password   # View the private desktop password
nuvio-companion status             # Check service status
nuvio-companion logs               # View live service logs
nuvio-companion restart            # Restart companion services
```

*For detailed Proxmox instructions, see [docs/PROXMOX.md](docs/PROXMOX.md).*

---

### Option 2: Docker & Tailscale (Always-On Linux Server / VPS)

Deploy using Docker Compose with access restricted via private VPN (e.g. Tailscale).

#### 1. Quick Setup Script
```sh
git clone https://github.com/saappleg/nuvio-movieboxpro-companion.git
cd nuvio-movieboxpro-companion
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

#### 2. Start the Container
```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

#### 3. Log In & Configure
1. Open the private setup dashboard at `http://<SERVER_TAILSCALE_IP>:43110/setup?key=YOUR_COMPANION_KEY`.
2. Enter your [TMDb API key](https://www.themoviedb.org/settings/api).
3. Click **Open login window** (or connect via noVNC at `http://<SERVER_TAILSCALE_IP>:6080/vnc.html`) and log into MovieBoxPro via QR code or official code login.
4. Connect Nuvio Cloud to synchronize your library.

*For detailed Docker instructions, see [docs/DOCKER_TAILSCALE.md](docs/DOCKER_TAILSCALE.md).*

---

### Option 3: Standalone macOS / Linux (Node.js)

Run directly on a local Mac or Linux machine with Node.js 20+:

```sh
# 1. Clone repository & install dependencies
git clone https://github.com/saappleg/nuvio-movieboxpro-companion.git
cd nuvio-movieboxpro-companion
npm install

# 2. Initialize environment configuration
npm run init:lan

# 3. Start the companion
npm start
```

In a second terminal window, retrieve your setup URL:
```sh
npm run setup-url
```

*For always-on desktop instructions, see [docs/ALWAYS_ON.md](docs/ALWAYS_ON.md).*

---

## 📱 Adding to Nuvio

Once configured in the Setup Dashboard, copy your protected URLs and paste them into Nuvio:

### 1. MovieBoxPro Stream Provider Plugin
In Nuvio's settings under **Plugins / Providers → Add Provider**:
```text
http://<HOST_IP>:43110/repository/<PLUGIN_KEY>/manifest.json
```

### 2. Discovery & Calendar Add-on
In Nuvio under **Add-ons → Add Add-on**:
```text
http://<HOST_IP>:43110/catalog/<PLUGIN_KEY>/manifest.json
```

> [!TIP]
> Both endpoints support universal unified manifests. If your client supports single-manifest installation, adding either manifest URL enables both streaming scrapers and discovery feeds automatically!

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `COMPANION_KEY` | Secret random key for dashboard authentication. | *Required* |
| `PLUGIN_SETUP_KEY` | Secret random key for Nuvio repository & catalog access. | *Required* |
| `HOST` | Bind address (`127.0.0.1` for local, private LAN IP for home network). | `127.0.0.1` |
| `PORT` | HTTP port for the companion server. | `43110` |
| `TMDB_API_KEY` | The Movie Database (TMDb) v3 API key. | `""` |
| `TMDB_BEARER_TOKEN` | TMDb v4 Read Access Token (alternative to API key). | `""` |
| `USER_TIMEZONE` | IANA timezone (e.g. `America/New_York`, `Europe/London`). | Auto-detected / `UTC` |
| `COMPANION_PUBLIC_URL` | Public / Tailscale URL of the companion host. | `http://${HOST}:${PORT}` |
| `PRIVATE_BIND_IP` | Docker host bind IP for published ports. | `127.0.0.1` |
| `NOVNC_PASSWORD` | Password for Docker noVNC browser desktop. | `""` |
| `MOVIEBOXPRO_PROFILE` | Directory path for persistent Chromium profile. | `work/movieboxpro-profile` |
| `COMPANION_CONFIG` | Path to persistent `.env` configuration file. | `.env` |
| `STREAM_TIMEOUT_MS` | Maximum duration before stream scraping timeout. | `45000` |

---

## 📡 API & Manifest Routes Reference

| Route | Description |
| :--- | :--- |
| `GET /repository/:key/manifest.json` | Universal Scraper & Provider Manifest for Nuvio. |
| `GET /catalog/:key/manifest.json` | Universal Discovery & Calendar Add-on Manifest. |
| `GET /catalog/:key/catalog/:type/:id.json` | Discovery catalog feed (Airing Today, New Series, Recommendations, etc.). |
| `GET /catalog/:key/meta/:type/:id.json` | Enriched movie / TV series metadata with ratings, cast, and episode lists. |
| `GET /stream/proxy` | Video reverse proxy with HTTP 206 Partial Content Range seeking. |
| `GET /intro/:imdbId/:season/:episode` | IntroDB crowd-sourced skip intro/outro segment timestamps. |
| `GET /setup?key=:key` | Interactive web dashboard for configuration and profile management. |
| `GET /health` | Service health status check. |
| `GET /api/setup/status` | Comprehensive companion health, session status, and metrics. |

---

## 🔒 Security & Privacy Model

- **No Remote Credential Sharing:** All MovieBoxPro session cookies, TMDb tokens, and Nuvio Cloud tokens remain strictly on your local machine / container.
- **Token Protected Endpoints:** All scraper, catalog, and dashboard endpoints require validation against `COMPANION_KEY` or `PLUGIN_SETUP_KEY`.
- **Private Network Binding:** Never forward port `43110` or `6080` to the public internet. Use [Tailscale](https://tailscale.com) or a private WireGuard VPN for remote access.

---

## 🧪 Testing & Development

Run the comprehensive unit test suite:

```sh
npm test
```

All 40+ unit tests validate catalog ordering, TMDb transformations, episode mapping, IntroDB integration, timezone offsets, stream proxying, Nuvio Cloud sync, and profile isolation.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting issues or pull requests.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

*Disclaimer: This project is not affiliated with, maintained by, or endorsed by MovieBoxPro, Nuvio, IntroDB, or TMDb.*
