# painel-ips

[English version](./README.en.md)
[Guia para IA instalar](./AI_INSTALL.md)

Painel leve em Node.js para listar serviços internos, monitorar processos PM2, containers Docker e recursos da VPS.

## Objetivo

Este projeto foi feito para uso operacional interno.

- listar IPs e portas dos serviços da VPS
- acompanhar processos do PM2
- acompanhar containers Docker
- ver CPU, RAM e disco da máquina

## Requisitos

- Node.js 16+
- PM2 opcional
- Docker opcional
- Linux com `systemd`, se for usar serviço nativo

## Segurança

Recomendação: não exponha este painel publicamente.

Use um destes modelos:

- acesso por SSH direto na VPS
- túnel SSH local
- rede privada como WireGuard, Tailscale ou VPN interna
- reverse proxy interno protegido por autenticação forte

Para cenário com WireGuard, o padrão recomendado é:

```env
PAINEL_HOST=0.0.0.0
PAINEL_PORT=3500
```

Assim o painel fica acessível pela interface da VPN, mas não deve ser publicado na internet aberta.

Exemplo com túnel SSH:

```bash
ssh -L 3500:127.0.0.1:3500 usuario@sua-vps
```

Depois, abra no navegador local:

```bash
http://127.0.0.1:3500
```

Se publicar isso em IP público sem controle de acesso, você estará expondo informações internas da infraestrutura.

## Instalação

```bash
git clone https://github.com/luizfeer/painel-ips.git
cd painel-ips
cp .env.example .env
nano .env
chmod +x install.sh
```

Se a instalação for executada por um agente/IA, use também o guia dedicado:

- [AI_INSTALL.md](/root/painel-ips/AI_INSTALL.md)

## Configuração

O projeto usa somente variáveis do `.env`.

- `PAINEL_PORT`: porta HTTP do painel
- `PAINEL_HOST`: host de bind; para acesso por WireGuard, `0.0.0.0` costuma ser o mais prático
- `PAINEL_IP_INTERFACE`: interface preferida para detectar o IP principal da VPS, como `wg0`, `eth0` ou `ens3`
- `PAINEL_CONFIG_REFRESH_MS`: intervalo de recarga do painel principal em ms; padrão `1800000` = 30 minutos
- `PAINEL_CONFIG_JSON`: define as seções e serviços exibidos na tela principal
- `PAINEL_PM2_LINKS_JSON`: define links clicáveis associados aos nomes dos processos PM2

O painel principal pode detectar automaticamente o IP da VPS com `hostLabel: "auto"` e montar os endereços a partir das portas configuradas.

Se a VPS tiver várias interfaces, defina `PAINEL_IP_INTERFACE` para evitar escolher o IP errado.

## Rodando com PM2

Opção recomendada quando você já usa PM2 na VPS.

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

Opção recomendada se você quer tratar isso como serviço nativo do sistema.

Antes de habilitar, ajuste o caminho em [painel-ips.service](/root/painel-ips/painel-ips.service) se o projeto não estiver em `/opt/painel-ips`.

Exemplo:

```bash
sudo cp painel-ips.service /etc/systemd/system/painel-ips.service
sudo systemctl daemon-reload
sudo systemctl enable --now painel-ips
```

Comandos úteis:

```bash
sudo systemctl status painel-ips
sudo journalctl -u painel-ips -f
sudo systemctl restart painel-ips
```

## Operação

Rotas principais:

- `/` painel principal
- `/pm2` monitor de processos PM2 e containers Docker
- `/resources` uso de CPU, RAM e disco
- `/healthz` healthcheck simples

## Observações

- Se `pm2` não estiver instalado, a página `/pm2` continua carregando, mas a API mostra erro explícito para a parte de PM2.
- Se `docker` não estiver instalado, a parte de containers também mostra erro explícito.
- O que normalmente muda entre VPS é o `.env`: interface de rede, portas e links dos serviços.
- Para ambiente via WireGuard, prefira `PAINEL_HOST=0.0.0.0` e restrinja o acesso à rede privada.
- Se o painel não precisar responder fora do host, `PAINEL_HOST=127.0.0.1` continua sendo a opção mais fechada.
