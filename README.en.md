# painel-ips

[Versão em português](./README.md)

Lightweight Node.js dashboard for listing internal services, monitoring PM2 processes, Docker containers, and VPS resources.

## Purpose

This project is meant for internal operational use.

- list VPS service IPs and ports
- monitor PM2 processes
- monitor Docker containers
- inspect CPU, RAM, and disk usage

## Requirements

- Node.js 16+
- PM2 optional
- Docker optional
- Linux with `systemd` if you want a native service

## Security

Recommendation: do not expose this dashboard publicly.

Use one of these access models:

- direct SSH access to the VPS
- local SSH tunnel
- private networking such as WireGuard, Tailscale, or an internal VPN
- internal reverse proxy protected with strong authentication

SSH tunnel example:

```bash
ssh -L 3500:127.0.0.1:3500 user@your-vps
```

Then open locally:

```bash
http://127.0.0.1:3500
```

If you publish this on a public IP without access control, you are exposing internal infrastructure information.

## Installation

```bash
git clone https://github.com/luizfeer/painel-ips.git
cd painel-ips
cp .env.example .env
nano .env
chmod +x install.sh
```

## Configuration

The project uses only `.env` variables.

- `PAINEL_PORT`: dashboard HTTP port
- `PAINEL_HOST`: bind host; for SSH tunnel access, `127.0.0.1` is the safest option
- `PAINEL_IP_INTERFACE`: preferred interface used to detect the VPS primary IP, such as `wg0`, `eth0`, or `ens3`
- `PAINEL_CONFIG_REFRESH_MS`: dashboard refresh interval in ms; default `1800000` = 30 minutes
- `PAINEL_CONFIG_JSON`: defines the sections and services shown on the main page
- `PAINEL_PM2_LINKS_JSON`: defines clickable links associated with PM2 process names

The main dashboard can automatically detect the VPS IP with `hostLabel: "auto"` and build addresses from configured ports.

If the VPS has multiple interfaces, define `PAINEL_IP_INTERFACE` to avoid selecting the wrong IP.

## Running with PM2

Recommended when PM2 is already part of your VPS stack.

```bash
./install.sh
```

Or manually:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME
```

## Running with systemd

Recommended if you want to manage this as a native system service.

Before enabling it, adjust the path in [painel-ips.service](/root/painel-ips/painel-ips.service) if the project is not installed at `/opt/painel-ips`.

Example:

```bash
sudo cp painel-ips.service /etc/systemd/system/painel-ips.service
sudo systemctl daemon-reload
sudo systemctl enable --now painel-ips
```

Useful commands:

```bash
sudo systemctl status painel-ips
sudo journalctl -u painel-ips -f
sudo systemctl restart painel-ips
```

## Operation

Main routes:

- `/` main dashboard
- `/pm2` PM2 and Docker monitoring
- `/resources` CPU, RAM, and disk usage
- `/healthz` simple healthcheck

## Notes

- If `pm2` is not installed, `/pm2` still loads, but the API returns an explicit PM2 dependency error.
- If `docker` is not installed, the containers section also returns an explicit dependency error.
- What usually changes between VPS environments is the `.env`: network interface, ports, and service links.
- For a more restricted setup, prefer `PAINEL_HOST=127.0.0.1` and access it through an SSH tunnel.
