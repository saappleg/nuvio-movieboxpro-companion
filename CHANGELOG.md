# Changelog

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
