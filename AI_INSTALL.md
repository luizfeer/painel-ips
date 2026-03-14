# AI Install Guide

Este arquivo é um guia operacional para agentes de IA instalarem e validarem o `painel-ips` em uma VPS Linux.

## Objetivo

Instalar o projeto com segurança, preferindo acesso interno e sem exposição pública direta.

## Premissas

- sistema Linux
- Node.js 16+ disponível
- acesso shell na VPS
- `systemd` disponível se a instalação for como serviço nativo
- PM2 opcional

## Regra de segurança

Preferir sempre uma destas abordagens:

- `PAINEL_HOST=0.0.0.0` com acesso somente por WireGuard/VPN privada
- `PAINEL_HOST=127.0.0.1` com acesso via túnel SSH
- rede privada como WireGuard ou Tailscale

Evitar publicar o painel diretamente em IP público.

## Instalação básica

```bash
git clone https://github.com/luizfeer/painel-ips.git
cd painel-ips
cp .env.example .env
chmod +x install.sh
```

## Ajustes mínimos no `.env`

Revisar:

- `PAINEL_PORT`
- `PAINEL_HOST`
- `PAINEL_IP_INTERFACE`
- `PAINEL_CONFIG_JSON`
- `PAINEL_PM2_LINKS_JSON`

Recomendação padrão segura:

```env
PAINEL_HOST=0.0.0.0
PAINEL_PORT=3500
PAINEL_IP_INTERFACE=wg0
PAINEL_CONFIG_REFRESH_MS=1800000
```

Se `wg0` não existir, usar a interface principal da VPS, como `eth0` ou `ens3`.

## Instalação com PM2

Usar quando a VPS já opera aplicações com PM2.

```bash
./install.sh
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME
```

Validação:

```bash
pm2 status
pm2 logs painel-ips --lines 50
```

## Instalação com systemd

Usar quando o projeto deve rodar como serviço nativo do sistema.

Se o projeto estiver em `/opt/painel-ips`, usar:

```bash
sudo cp painel-ips.service /etc/systemd/system/painel-ips.service
sudo systemctl daemon-reload
sudo systemctl enable --now painel-ips
```

Se o diretório for diferente de `/opt/painel-ips`, ajustar antes:

- `WorkingDirectory`
- `ExecStart`

Validação:

```bash
sudo systemctl status painel-ips
sudo journalctl -u painel-ips -n 50 --no-pager
```

## Healthcheck

Validar se o backend responde no próprio host:

```bash
curl -sS http://127.0.0.1:3500/healthz
```

Se estiver em outra porta, ajustar a URL.

## Acesso recomendado

Se o acesso for por WireGuard, usar o IP privado da VPN da VPS na porta `3500`.

Se `PAINEL_HOST=127.0.0.1`, abrir com túnel SSH:

```bash
ssh -L 3500:127.0.0.1:3500 usuario@sua-vps
```

Depois acessar localmente:

```bash
http://127.0.0.1:3500
```

## Diagnóstico rápido

Se a página `/pm2` falhar:

- verificar se `pm2` está instalado
- validar `pm2 jlist`

Se a parte Docker falhar:

- verificar se `docker` está instalado
- validar `docker ps -a`
- validar `docker stats --no-stream`

Se o IP detectado estiver errado:

- definir `PAINEL_IP_INTERFACE` manualmente

## Resultado esperado

Ao final da instalação:

- o painel responde em `/healthz`
- a página principal mostra IP e portas montados automaticamente
- o acesso ocorre por WireGuard/VPN privada ou SSH túnel
- o serviço fica gerenciado por PM2 ou `systemd`
