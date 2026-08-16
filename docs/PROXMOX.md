# Proxmox deployment runbook

Use a dedicated Debian QEMU virtual machine for this companion. Proxmox recommends running Docker application containers inside a QEMU VM rather than nesting Docker inside an LXC container. The VM provides stronger isolation and avoids LXC/AppArmor, Chromium sandbox, and Docker nesting problems.

## Recommended VM

- Guest OS: Debian 12 or 13, 64-bit
- CPU: 2 virtual cores, host CPU type when migration compatibility is not required
- Memory: 4 GB RAM; 2 GB minimum
- Disk: 32 GB, with discard/TRIM enabled when supported
- Network: VirtIO adapter attached to the normal LAN bridge
- QEMU Guest Agent: enabled in Proxmox and installed in the guest
- Start at boot: enabled
- Start/shutdown order: after routing and DNS services; before nonessential guests

The browser profile is small, but Chromium benefits from memory and shared-memory headroom. The Compose configuration allocates a 1 GB `/dev/shm` area inside the container.

## 1. Create the VM

1. Upload a current Debian netinst ISO to Proxmox storage.
2. Select **Create VM** and install a minimal Debian system with an SSH server.
3. Apply the resources above.
4. Give the VM a DHCP reservation on the home router for predictable administration.
5. In **VM → Options**, enable **Start at boot** and the QEMU Guest Agent.

Inside the VM:

```sh
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git qemu-guest-agent
sudo systemctl enable --now qemu-guest-agent
```

## 2. Install Docker

Install Docker Engine and the Compose plugin using Docker's official Debian instructions. Verify:

```sh
docker --version
docker compose version
```

Add the administration user to the Docker group only if accepting that membership effectively grants root-level control of the VM. Otherwise, run Docker commands with `sudo`.

## 3. Install Tailscale on the VM

Follow Tailscale's Debian installation instructions, then connect the VM to the same tailnet as the Pixel and Android TV:

```sh
sudo tailscale up
tailscale ip -4
```

Record the VM's stable `100.x.y.z` address. Tailscale should run on the Debian VM, not inside the companion container. This keeps networking and upgrades simple.

## 4. Deploy the companion

```sh
git clone https://github.com/saappleg/nuvio-movieboxpro-companion.git
cd nuvio-movieboxpro-companion
cp .env.example .env
```

Complete `.env` using [the Docker and Tailscale guide](DOCKER_TAILSCALE.md). Set both `PRIVATE_BIND_IP` and `COMPANION_PUBLIC_URL` to the VM's Tailscale IP. Generate fresh keys; do not copy the keys or browser profile from the public repository.

Start the service:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 companion
```

Use the noVNC address on port `6080` to complete MovieBoxPro login, then replace the Mac-local plugin URL in Nuvio with the VM's protected manifest URL.

The easiest route is the guided dashboard at `http://VM_TAILSCALE_IP:43110/setup?key=YOUR_COMPANION_KEY`. It links to noVNC, controls the login window, checks session status, and provides the protected Nuvio installation URL.

## 5. Proxmox and network security

- Do not open ports `43110`, `5900`, or `6080` on the router.
- Do not attach a public IP to the VM.
- The Compose file publishes `43110` and `6080` only on `PRIVATE_BIND_IP`.
- Port `5900` remains inside the container and is never published.
- Restrict the Proxmox host and VM administration interfaces separately from application access.
- Use Tailscale access rules to allow only the user's devices to reach the two published ports.
- Keep Debian, Docker, Tailscale, and the container image updated.

## 6. Backups and recovery

Proxmox VM backups include the Docker named volume that contains the persistent browser profile. Treat those backups as sensitive account data and store them only in protected backup storage.

For the cleanest backup, briefly stop the container, run the Proxmox backup, then start it again:

```sh
docker compose stop
# Run or wait for the scheduled Proxmox backup.
docker compose start
```

A live VM backup is convenient but may capture Chromium while it is writing profile data. After restoring, check the companion `/status` endpoint and repeat MovieBoxPro code login if necessary.

## 7. Updating

```sh
cd nuvio-movieboxpro-companion
git pull --ff-only
docker compose up -d --build
docker image prune
```

Review release notes before updating. Never use `git reset --hard` on a deployment containing local changes.
