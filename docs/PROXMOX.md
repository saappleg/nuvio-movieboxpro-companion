# Proxmox VE one-click installation

This is the simplest always-on deployment. The installer creates an **unprivileged Debian 13 LXC** and installs the companion directly inside it. It does not install Docker or change another container.

## Before you start

You need:

- a working Proxmox VE host with internet access;
- 2 CPU cores, 4 GB RAM, and about 16 GB of storage;
- your own authorized MovieBoxPro account;
- a free [TMDb API key](https://www.themoviedb.org/settings/api);
- a trusted home network or private VPN.

Do not forward ports 43110 or 6080 through your router.

## 1. Create the LXC

Open **Proxmox → your node → Shell**, paste this command, and press Enter:

```sh
curl -fsSL https://raw.githubusercontent.com/community-scripts/core/main/tools/run.sh |
  bash -s -- https://raw.githubusercontent.com/saappleg/nuvio-movieboxpro-companion/main ct/nuviomovieboxprocompanion.sh
```

The normal Community Scripts setup screen opens. The defaults are suitable for most homes. Choose Advanced Settings only if you need a static IP, different storage, or different resources.

This preview command uses the official Community Scripts engine and this repository's submission-ready installer. Once accepted upstream, the companion can be selected directly from the Community Scripts catalog.

## 2. Get the private setup link

When installation finishes, select the new LXC in Proxmox and open **Console**. Run:

```sh
nuvio-companion setup-url
```

Open the address it prints on a device that can reach the LXC. The long key in that address is private; do not share it or put it in screenshots.

If you need the browser-desktop password, run:

```sh
nuvio-companion desktop-password
```

## 3. Connect MovieBoxPro and Nuvio

On the guided setup page:

1. Enter your TMDb v3 API key and save it.
2. Select **Open server desktop** and enter the desktop password.
3. Return to setup and select **Open login window**.
4. Complete MovieBoxPro's official QR/code login in the browser desktop.
5. Select **Check status**.
6. Copy the protected Nuvio installation URL and add it in Nuvio.

Never paste a MovieBoxPro password, active login code, session cookie, or companion key into an issue or chat.

## Everyday management

Run these commands in the LXC console:

```sh
nuvio-companion status
nuvio-companion logs
nuvio-companion restart
nuvio-companion desktop-url
```

The services start automatically after the LXC or Proxmox host reboots.

## Updating

Run the same Community Script again and select the existing container when prompted to update it. The updater preserves:

- the MovieBoxPro browser profile and login session;
- the companion and plugin keys;
- the TMDb setting;
- the browser-desktop password.

Review release notes before updating. Proxmox snapshots and backups contain sensitive browser-session data and should be protected.

Starting with version 0.3.5, reopen the private setup URL after updating. The **Temporary TV calendar catalogs** card lets you save recommendation shows and copy a separate manifest into **Nuvio Web → Add-ons**. It can be removed later without affecting MovieBoxPro playback.

## Network access

The default address uses the LXC's LAN IP. That works while your Pixel and Android TV are on the same trusted home network. For access away from home, add the LXC to a private VPN such as Tailscale; do not use a public reverse proxy, Tailscale Funnel, or router port forwarding.

If the LXC's IP changes, give it a DHCP reservation or static address. Then edit `COMPANION_PUBLIC_URL` in `/etc/nuvio-movieboxpro-companion/companion.env` and restart the service:

```sh
nuvio-companion restart
```

## Removing it

The companion is isolated in its own LXC. To uninstall it, back up anything you need and delete that LXC from Proxmox. This removes its browser profile, account session, settings, and private keys.

## Troubleshooting

- **Setup page does not open:** confirm the LXC is running and your device can reach its LAN IP.
- **MovieBoxPro is disconnected:** open the browser desktop and repeat the official code login.
- **Nuvio spins forever:** run `nuvio-companion status`, then `nuvio-companion logs` and verify the Nuvio device can reach port 43110.
- **Browser desktop is blank:** run `nuvio-companion restart`, wait about ten seconds, and reload it.
- **Android TV does not show the provider:** refresh Nuvio's plugins and restart Nuvio after verifying the TV can open the companion's address.
