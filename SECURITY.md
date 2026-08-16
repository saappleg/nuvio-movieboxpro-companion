# Security

## Private data

Never commit `.env`, `work/`, a generated provider response, browser profiles, HAR files, cookies, active login codes, TMDb credentials, or MovieBoxPro account data.

The companion intentionally keeps the MovieBoxPro browser session on the user's own computer. The checked-in provider contains placeholders only; the running companion injects the user's private LAN address and generated companion key when Nuvio downloads the provider through the protected local manifest.

## Network exposure

- Bind `HOST` to the computer's exact private LAN address when serving a phone or TV.
- Do not bind to `0.0.0.0`.
- Do not configure router port forwarding, a public reverse proxy, or a public tunnel.
- Use different random values for `COMPANION_KEY` and `PLUGIN_SETUP_KEY`.
- Treat the protected manifest URL like a password. Anyone with the URL and access to the same network may be able to download the generated provider.

## Reporting

Do not include real credentials, cookies, tokens, active codes, signed playback URLs, or unredacted network captures in bug reports. Describe the endpoint shape and redact sensitive values.
