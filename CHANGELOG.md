# Changelog

## 1.0.0-beta.4

- **Fix Dashboard Buttons & Client Script Execution**: Resolved client-side regular expression parsing syntax error on the Setup Dashboard preventing UI buttons from responding.
- **Fix Stream Handler Variable Scope**: Resolved reference error during stream resolution and ensured active profile logging and timeouts execute properly.
- **Enhanced Key Resolution & Compatibility**: Support interchangeable use of `PLUGIN_SETUP_KEY` and `COMPANION_KEY` across all repository, catalog, manifest, and streaming endpoints.

## 1.0.0-beta.3

- **"If You Liked This..." Similar Titles & Recommendations**: High-accuracy recommendations and similar titles appended to Nuvio detail screens and description headers (`meta.similar` & `💡 More Like This: ...`) in a single high-speed TMDb query.
- **Exact Airing Time & Relative Countdown Badges**: Timezone-aware relative status badges (`🔴 Airing Today`, `⏳ Premieres Tomorrow`, `⏳ Premieres in X days`, `🟢 Available`) attached directly to episode lists and calendar feeds.
- **Rotten Tomatoes, Metacritic & IMDb Ratings**: Multi-source ratings aggregator attaching Tomatometer (🍅), Audience Score (🍿), and TMDb/IMDb rating breakdown badges to title metadata descriptions in Nuvio.
- **Built-in Video Stream Proxy (`/stream/proxy`)**: Reverse proxy route supporting HTTP 206 Partial Content Range video seeking and header spoofing to fix 403 Forbidden playback errors on strict player devices.
- **Installable PWA Dashboard**: Web App Manifest, Apple mobile web app metadata, and Service Worker enabling 1-tap "Add to Home Screen" installation on iPhone, iPad, and Android phones.
- **In-Dashboard Update Checker**: GitHub release version checker with an in-dashboard update banner, release notes preview, and direct GitHub release links.
- **Custom Feed Builder**: Create bespoke movie and TV series catalog feeds using TMDb discovery filters (genres, release years/decades, languages, minimum ratings, studios, and sorting) directly in the Setup Dashboard.
- **1-Click Backup & System Restore**: Export full system backups (.json) containing all profiles, seeds, custom feeds, and preferences, and restore in one click with automatic migration.
- **Multi-Profile & Multi-Device System**: Create and manage multiple named profiles (e.g. *Living Room*, *Kids*, *Bedroom*) with isolated MovieBoxPro Chrome sessions, separate recommendation seeds, and dedicated Nuvio provider plugin & catalog manifest URLs.
- **Stream Activity & Cache Analytics**: Real-time performance tracking in the Setup Dashboard showing average stream resolution times, TMDb cache hit ratios, in-memory cache counts, and a live stream activity log.
- **Cast, Crew, Trailers & Franchise Collections**: Enriched title metadata in Nuvio with top cast members, directors, writers, YouTube trailer links, and movie universe collection sets.
- **Unlimited TV Series & Movies Seeds**: Removed all arbitrary limits (previously 15-25 items) so full Nuvio Cloud libraries and extensive manual seed lists are supported.
- **Timezone-Aware Release Calendar**: Added `USER_TIMEZONE` configuration with auto-detection from client devices to ensure "New Today - Library Based", "Airing Today", and "This Week" calculate boundaries matching your local calendar day.
- **Timezone-Safe Episode Premieres**: Episode air dates now format with timezone-safe UTC noon ISO timestamps to prevent client apps in negative UTC offsets (e.g. UTC-4 to UTC-8) from shifting episode premiere dates back to the previous evening.
- **Curated Streaming Networks & Themes**: Added customizable catalog feeds for major networks (*HBO / Max Originals*, *Apple TV+*, *Netflix Originals*, *Disney+*, *Prime Video*, *Paramount+*, *Hulu / FX*) and curated genres (*Anime Trending*, *A24 Cinema*, *Top Korean Dramas*).
- **Automatic Background Cloud Sync**: Recurring 6-hour background sync timer to keep Nuvio Cloud library items and recommendation seeds automatically updated.
- **Session Expiry Monitor & Health Check**: Added `/api/setup/health` endpoint and automatic 60-minute session monitor with real-time UI status updates and session expiration alerts.
- **Batched Concurrent Lookups & In-Memory TTL Caching**: High-speed resolution of large libraries (`batchMap`) with in-memory caching for TMDb catalog queries and metadata lookups.
- **Setup Dashboard Enhancements**: Added Timezone preferences card with auto-detection button, live seed counters for TV shows and Movies with clear buttons, and real-time health polling.

## 1.0.0-beta.2 (v1 Beta 2)

- **IntroDB (api.introdb.app) Integration**: Automatically fetch crowdsourced intro, outro, and recap timestamps for TV series episodes.
- **Stream Segment Enrichment**: Enrich TV playback stream responses with `intro`, `outro`, `recap`, and `segments` timestamp metadata for seamless skip intro buttons in Nuvio and compatible players.
- **IntroDB Proxy & TMDb ID Resolution**: Built-in `/intro` and `/api/introdb/segments` endpoints with TMDb-to-IMDb ID resolution and 24-hour in-memory caching.
- **Dashboard Status Badge**: Added IntroDB Active status indicator to setup dashboard hero bar.

## 1.0.0-beta.1 (v1 Beta Release)

- **Official v1 Beta Release** for Nuvio MovieBoxPro Companion & Discovery Hub.
- **Full MovieBoxPro Streaming Support**: Provides MovieBoxPro as a stream source in Nuvio with on-demand links, quality selection (4K/1080p/720p/360p), and subtitles.
- **Customizable Discovery & Calendar Add-on**:
  - Interactive Drag & Drop catalog reordering and individual ON/OFF toggles in the setup dashboard.
  - Feeds include: Now Playing, New Today - Library Based, New Series, Recommended Series, New Movies, Recommended Movies, This Week, New & Returning, and Airing Today.
  - "New Today - Library Based" feed dynamically monitors your library for episodes airing today and cleanly hides when empty.
- **Full Episode Breakdown for Series**: Complete TV series details with episode thumbnails, titles, season/episode numbering, air dates, and overviews.
- **Universal Search & IMDb Lookups**: Search movies and series by title or direct IMDb ID (`tt...`) with full catalog pagination.
- **Nuvio Cloud Library Sync**: Connect and synchronize your Nuvio Cloud library and watch history to generate tailored recommendations.
- **Guided Setup Dashboard & Proxmox VE / Docker Deployments**: 1-click installer for Proxmox VE Community Scripts LXC and multi-arch Docker containers.

## 0.3.15

- Built-in universal search across all movie and TV catalogs in Nuvio.
- Support title search and direct IMDb ID lookup (e.g. `tt...`) in add-on search queries.
- Support standard catalog pagination (`skip`) parameters.

## 0.3.14

- Add interactive Drag & Drop and Up/Down re-ordering for Discovery & Calendar feeds in Setup Dashboard.
- Add individual ON/OFF toggle switches for every catalog feed with persistent configuration.
- Support extra optional feeds (e.g. This Week TV/Movies, New & Returning, Global Airing Today) with customizable layout.

## 0.3.13

- Add "New Today - Library Based" catalog feed that checks airing episodes for library shows and cleanly hides when empty.
- Re-order Discovery Add-on catalog feeds to: Now Playing, New Today - Library Based, New Series, Recommended Series, New Movies, Recommended Movies.

## 0.3.12

- Support IMDb IDs (e.g. `tt...`) in metadata lookups and add-on manifest `idPrefixes`.
- Auto-resolve IMDb IDs to TMDb for full season and episode breakdowns and stream resolution.

## 0.3.11

- Populate complete season and episode breakdown (`videos` array) for TV Series metadata.
- Support episode thumbnails, air dates, overviews, and season/episode numbering in Nuvio details page.

## 0.3.10

- Add Movie catalogs and search extras to Discovery & Calendar manifest.
- Support parameterized catalog routes with extras and path extensions.
- Ensure companion version numbering is synchronized across package, container, Provider, and Add-on manifests.

## 0.3.9

- Harden dashboard status parsing and display companion public address in status badge.
- Update Nuvio Cloud authentication with official publishable client key and enhanced error reporting.

## 0.3.8

- Update Nuvio Cloud authentication with official publishable client key and enhanced error reporting.

## 0.3.7

- Add Nuvio Cloud library synchronization for dynamic TV and movie recommendations.
- Expand Discovery & Calendar Add-on with Airing Today, This Week (TV & Movies), New & Returning, New Series, New Movies, and Recommended feeds.
- Add support for both Movie and Series metadata lookups and catalog feeds.
- Add modern setup dashboard with Nuvio Cloud connect/sync controls, active catalog overviews, and one-click installation URLs.

## 0.3.6

- Fix recommended and release cards failing to open when Nuvio URL-encodes `tmdb:` metadata IDs.

## 0.3.5

- Add a removable Nuvio catalog add-on with Airing Today, This Week, New & Returning, and personalized recommendation rows.
- Add guided recommendation seed setup using show names; resolved TMDb IDs stay on the companion.
- Use a private path-authenticated add-on manifest compatible with Android TV.

All notable changes are documented here. Versions follow Semantic Versioning while the project remains experimental.

## 0.3.4

- Fall back to selection-based copying when the modern Clipboard API is blocked on an HTTP setup page.
- Display the private Nuvio URL in a read-only text area so it can always be selected and copied manually.

## 0.3.3

- Add Android TV-safe private repository URLs that end in `/manifest.json`.
- Serve scraper code through the same path-based private key without query parameters.
- Keep legacy query-string repository links working for existing mobile installations.

## 0.3.2

- Read the Nuvio manifest and scraper version directly from the companion package version.
- Prevent the version shown by Nuvio from drifting behind future companion releases.

## 0.3.1

- Install noVNC after Playwright's operating-system dependencies so later package changes cannot remove it.
- Fail the Proxmox installation clearly if the required noVNC web files are missing.

## 0.3.0

- Prepare a Proxmox VE Community Scripts-compatible installer for an unprivileged Debian 13 LXC.
- Install the companion directly in the LXC without nested Docker.
- Add automatic startup, persistent browser data, release-aware updates, and private VNC access.
- Add a `nuvio-companion` helper for setup links, desktop credentials, status, logs, and restarts.
- Add syntax and metadata checks for the Proxmox installer to CI.
- Replace the README with a beginner-focused Docker, Proxmox, and Tailscale quick start.
- Add a safe interactive Docker initializer that generates private keys and prints the setup URL.
- Add copy-and-paste update and troubleshooting instructions.

## 0.2.1

- Publish versioned and `latest` Docker images to GitHub Container Registry.
- Build container images for both AMD64 and ARM64 Linux servers.
- Add a package-based Compose file so self-hosters can update without building locally.
- Update GitHub Actions dependencies to Node 24-compatible releases.

## 0.2.0

- Persist dashboard-managed configuration in the Docker data volume.
- Add secure `npm run init`, LAN-aware `npm run init:lan`, and `npm run setup-url` commands.
- Add GitHub Actions for Node tests, syntax validation, targeted secret scanning, and Docker builds.
- Add Dependabot coverage for npm, Docker, and GitHub Actions.
- Expand initialization regression tests and deployment documentation.

## 0.1.0

- Initial MovieBoxPro browser companion and Nuvio provider.
- Movie, TV episode, IMDb-to-TMDb, and multi-quality stream support.
- Authenticated setup dashboard.
- Browser concurrency and profile-lock protection.
- Docker, Tailscale, and Proxmox deployment guides.
