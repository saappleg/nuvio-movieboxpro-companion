# MovieBoxPro Local Companion for Nuvio

This proof of concept keeps the MovieBoxPro browser session and TMDb credential on your Mac. A small local HTTP service resolves Nuvio's TMDb request into freshly signed MovieBoxPro streams; the Nuvio provider only receives playable stream objects.

## Security model

- `.env` is ignored by Git.
- MovieBoxPro login happens in its official site inside a dedicated persistent Chrome profile.
- The service never extracts, returns, or logs Google tokens or MovieBoxPro cookies.
- Every `/streams` request requires a long companion key.
- Responses use `Cache-Control: no-store`.
- Default binding is `127.0.0.1`, so only this Mac can connect.
- Signed playback URLs are short-lived and generated on demand.

This is an unofficial integration for your own authorized account. It does not bypass login, VIP checks, DRM, or access controls.

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run init` for computer-only access, or `npm run init:lan` to detect a private LAN address for a phone or TV. This creates `.env` with two different random keys and mode `0600`; it refuses to overwrite an existing configuration.
4. Run `npm start`.
5. In another terminal, run `npm run setup-url` and open the displayed private URL. Do not share it.
6. Add your TMDb v3 API key through the guided dashboard.
7. The dashboard exchanges the key for an HTTP-only local cookie and removes it from the address bar.
8. Use the dashboard to verify configuration and open the MovieBoxPro login window.
9. Complete MovieBoxPro's code-login flow yourself. Do not share the active code. Google login is intentionally avoided because Google may reject automated browser profiles.
10. Check MovieBoxPro status and reveal the protected Nuvio installation URL from the dashboard.
11. Add that URL as a Nuvio plugin repository, then refresh plugins.

If Nuvio runs on a different device, set `HOST` to this computer's exact private LAN address and allow only your home network through the firewall. The companion generates the provider URL automatically. Avoid `0.0.0.0`, and never expose this service to the public internet.

## Publishing and sharing

The repository is safe to publish only when `.env` and `work/` remain ignored. The checked-in provider is a template: the companion injects each user's private LAN URL and generated companion key only when serving the protected local provider endpoint. Never commit a generated provider response, browser profile, HAR file, cookies, active login code, or a real TMDb credential.

Other users must run their own companion on a computer on their home network, authenticate their own authorized MovieBoxPro account, and add their own protected local manifest URL. A raw GitHub manifest cannot replace the local companion because MovieBoxPro authentication remains on the user's computer.

For continuous availability and safe remote-access considerations, see [Running the companion continuously](docs/ALWAYS_ON.md).

## Docker and private VPN

The included `Dockerfile` and `docker-compose.yml` support an always-on Linux server. They provide persistent browser storage and a password-protected noVNC desktop for completing MovieBoxPro login inside the container. Publish the ports only on the host's Tailscale IP; never on a public interface.

Docker stores dashboard-managed configuration at `/data/companion.env` alongside the persistent browser profile, so settings survive image rebuilds and container replacement.

See [Private Docker deployment](docs/DOCKER_TAILSCALE.md) for the complete setup.

## Setup dashboard

The responsive dashboard at `/setup` works on desktop and mobile browsers. It can:

- show safe configuration status without returning stored keys;
- save the Nuvio-facing URL and a TMDb v3 key;
- open the dedicated MovieBoxPro login window and check authentication;
- reveal and copy the protected Nuvio manifest URL on demand;
- link to the private noVNC desktop in Docker deployments.

The dashboard requires `COMPANION_KEY`. Never expose it or port `43110` to the public internet.

Using Proxmox? Follow the [Proxmox deployment runbook](docs/PROXMOX.md).

## License

MIT. This project is an unofficial interoperability tool and is not affiliated with MovieBoxPro, Nuvio, or TMDb.

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Tests

```sh
npm test
```

## Prototype limitations

- MovieBoxPro web sessions can expire; revisit `/login` to renew the dedicated profile.
- MovieBoxPro is an undocumented private interface and response fields may change.
- TV episode JSON needs validation against a real capture.
- Search matching uses title, media type, year, and runtime because search results do not expose TMDb/IMDb IDs.
- The initial detail-page source-ID parser may need adjustment after testing against additional titles.
