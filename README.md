# painel-ips

Painel leve em Node.js para listar IPs internos, monitorar processos PM2, containers Docker e recursos da VPS.

## Requisitos

- Node.js 16+
- PM2 opcional, mas recomendado para manter o painel no ar
- Docker opcional, apenas se voce quiser a secao de containers

## Instalar em outra VPS

```bash
git clone <seu-repo> painel-ips
cd painel-ips
cp .env.example .env
nano .env
chmod +x install.sh
./install.sh
```

Se quiser rodar sem PM2:

```bash
npm start
```

Se quiser deixar nativo com `systemd`:

```bash
sudo cp painel-ips.service /etc/systemd/system/painel-ips.service
sudo systemctl daemon-reload
sudo systemctl enable --now painel-ips
```

## Configuracao

O painel usa somente variaveis do `.env`.

- `PAINEL_PORT`: porta HTTP do painel
- `PAINEL_HOST`: host de bind, normalmente `0.0.0.0`
- `PAINEL_CONFIG_JSON`: define host, secoes e servicos exibidos na tela principal
- `PAINEL_PM2_LINKS_JSON`: define links clicaveis associados aos nomes dos processos PM2

## Operacao

URLs:

- `/` painel principal
- `/pm2` processos PM2 e containers Docker
- `/resources` uso de CPU, RAM e disco
- `/healthz` healthcheck simples

## Observacoes para outra VPS

- Sem `pm2` instalado, a pagina `/pm2` continua abrindo, mas a API retorna erro explicito de dependencia ausente.
- Sem `docker`, a parte de containers tambem retorna erro explicito.
- O que normalmente precisa ajustar ao migrar e o `.env`, principalmente IPs internos, portas e links dos processos.
- Se usar PM2 e quiser subir no boot, rode `pm2 startup systemd -u <usuario> --hp <home>` e depois `pm2 save`.
