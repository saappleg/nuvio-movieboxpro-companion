# Changelog

All notable changes are documented here. Versions follow Semantic Versioning while the project remains experimental.

## Unreleased

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
