# Running the companion continuously

The companion cannot operate while its host computer is powered off. It maintains a private MovieBoxPro browser session, performs metadata matching, and generates fresh signed playback URLs on demand. Nuvio itself does not take over those jobs.

## Recommended arrangement

Run the companion on an inexpensive, always-on computer inside the same home network as the Nuvio devices. A Mac mini or another small desktop that can run Google Chrome and Node.js is the simplest option.

1. Copy or clone this repository onto the always-on computer.
2. Install Node.js 20 or newer and Google Chrome.
3. Run `npm install`.
4. Create `.env` from `.env.example` and give it new random keys.
5. Set `HOST` to that computer's exact private LAN address.
6. Reserve that address in the router's DHCP settings so it does not change.
7. Run `npm start`, complete the code-login flow, and verify `/status`.
8. Replace the old local plugin entry in Nuvio with the new computer's protected manifest URL.
9. Configure the computer not to sleep while plugged in and arrange for the companion to start after the user logs in.

The dedicated Chrome profile must remain private and backed up securely. A restored profile may still require MovieBoxPro login again.

## Access away from home

Do not forward port `43110` on the router and do not place the companion directly on the public internet. If remote access is needed, use a private device-to-device VPN and bind/firewall the service so only the user's own devices can reach it. This requires additional testing because Nuvio must be able to retrieve both the protected manifest and provider over that private network.

The repository now includes a Docker plus Tailscale deployment for this model. See [Private Docker deployment](DOCKER_TAILSCALE.md).

## VPS and cloud-hosting caveats

A public VPS is not the recommended default. The companion relies on a persistent interactive Chrome profile, and a server would need a protected graphical browser session plus private-network access controls. Publicly exposing the service, its generated provider, or its browser profile risks the MovieBoxPro account and signed playback links.

## Availability checklist

- Host remains powered on and awake.
- Chrome and the companion restart after an operating-system restart.
- Private LAN address remains reserved.
- No router port forwarding is enabled.
- `.env` and the browser profile are readable only by the host user.
- MovieBoxPro session status is checked after upgrades or unexplained empty results.
