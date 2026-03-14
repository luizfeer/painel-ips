# painel-ips

Painel leve em Node.js para listar servicos internos, monitorar processos PM2, containers Docker e recursos da VPS.

## Objetivo

Esse projeto foi feito para uso operacional interno.

- listar IPs e portas dos servicos da VPS
- acompanhar processos do PM2
- acompanhar containers Docker
- ver CPU, RAM e disco da maquina

## Requisitos

- Node.js 16+
- PM2 opcional
- Docker opcional
- Linux com `systemd` se for usar servico nativo

## Seguranca

Recomendacao: nao exponha esse painel publicamente.

Use um destes modelos:

- acesso por SSH direto na VPS
- tunel SSH local
- rede privada como WireGuard, Tailscale ou VPN interna
- reverse proxy interno protegido por autenticacao forte

Exemplo com tunel SSH:

```bash
ssh -L 3500:127.0.0.1:3500 usuario@sua-vps
```

Depois abra no navegador local:

```bash
http://127.0.0.1:3500
```

Se publicar isso em IP publico sem controle de acesso, voce esta expondo informacoes internas da infraestrutura.

## Instalacao

```bash
git clone https://github.com/luizfeer/painel-ips.git
cd painel-ips
cp .env.example .env
nano .env
chmod +x install.sh
```

## Configuracao

O projeto usa somente variaveis do `.env`.

- `PAINEL_PORT`: porta HTTP do painel
- `PAINEL_HOST`: host de bind; para acesso por tunel SSH, `127.0.0.1` e o mais seguro
- `PAINEL_IP_INTERFACE`: interface preferida para detectar o IP principal da VPS, como `wg0`, `eth0` ou `ens3`
- `PAINEL_CONFIG_REFRESH_MS`: intervalo de recarga do painel principal em ms; padrao `1800000` = 30 minutos
- `PAINEL_CONFIG_JSON`: define as secoes e servicos exibidos na tela principal
- `PAINEL_PM2_LINKS_JSON`: define links clicaveis associados aos nomes dos processos PM2

O painel principal pode detectar automaticamente o IP da VPS com `hostLabel: "auto"` e montar os enderecos a partir das portas configuradas.

Se a VPS tiver varias interfaces, defina `PAINEL_IP_INTERFACE` para evitar escolher o IP errado.

## Rodando com PM2

Opcao recomendada quando voce ja usa PM2 na VPS.

```bash
./install.sh
```

Ou manualmente:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME
```

## Rodando com systemd

Opcao recomendada se voce quer tratar isso como servico nativo do sistema.

Antes de habilitar, ajuste o caminho em [painel-ips.service](/root/painel-ips/painel-ips.service) se o projeto nao estiver em `/opt/painel-ips`.

Exemplo:

```bash
sudo cp painel-ips.service /etc/systemd/system/painel-ips.service
sudo systemctl daemon-reload
sudo systemctl enable --now painel-ips
```

Comandos uteis:

```bash
sudo systemctl status painel-ips
sudo journalctl -u painel-ips -f
sudo systemctl restart painel-ips
```

## Operacao

Rotas principais:

- `/` painel principal
- `/pm2` monitor de processos PM2 e containers Docker
- `/resources` uso de CPU, RAM e disco
- `/healthz` healthcheck simples

## Observacoes

- Se `pm2` nao estiver instalado, a pagina `/pm2` continua carregando, mas a API mostra erro explicito para a parte de PM2.
- Se `docker` nao estiver instalado, a parte de containers tambem mostra erro explicito.
- O que normalmente muda entre VPS e o `.env`: interface de rede, portas e links dos servicos.
- Para ambiente mais fechado, prefira `PAINEL_HOST=127.0.0.1` e acesse por SSH tunnel.
