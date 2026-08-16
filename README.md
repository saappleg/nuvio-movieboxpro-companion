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
2. Copy `.env.example` to `.env`.
3. Set a long random `COMPANION_KEY`.
4. Add your TMDb v3 API key (or API read-access token).
5. Set a separate `PLUGIN_SETUP_KEY`; neither key is committed to the provider source.
6. Set `HOST` to this computer's exact private LAN address when using a phone or TV.
7. Run `npm start`.
8. Open `http://HOST:43110/login?key=YOUR_COMPANION_KEY`.
9. Complete MovieBoxPro's code-login flow yourself in the dedicated Chrome window. Do not share the active code. Google login is intentionally avoided because Google may reject automated browser profiles.
10. Check `http://HOST:43110/status?key=YOUR_COMPANION_KEY`; it should report `authenticated: true`.
11. Add `http://HOST:43110/manifest.json?key=YOUR_PLUGIN_SETUP_KEY` as a Nuvio plugin repository.

If Nuvio runs on a different device, set `HOST` to this computer's exact private LAN address and allow only your home network through the firewall. The companion generates the provider URL automatically. Avoid `0.0.0.0`, and never expose this service to the public internet.

## Publishing and sharing

The repository is safe to publish only when `.env` and `work/` remain ignored. The checked-in provider is a template: the companion injects each user's private LAN URL and generated companion key only when serving the protected local provider endpoint. Never commit a generated provider response, browser profile, HAR file, cookies, active login code, or a real TMDb credential.

Other users must run their own companion on a computer on their home network, authenticate their own authorized MovieBoxPro account, and add their own protected local manifest URL. A raw GitHub manifest cannot replace the local companion because MovieBoxPro authentication remains on the user's computer.

For continuous availability and safe remote-access considerations, see [Running the companion continuously](docs/ALWAYS_ON.md).

## License

MIT. This project is an unofficial interoperability tool and is not affiliated with MovieBoxPro, Nuvio, or TMDb.

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
