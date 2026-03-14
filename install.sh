#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado. Instale Node 16+ antes de continuar."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env criado a partir de .env.example"
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.js
  pm2 save
  echo "Painel iniciado via PM2."
  echo "Para subir no boot, rode uma vez: pm2 startup systemd -u $(whoami) --hp $HOME"
else
  echo "PM2 nao encontrado. Inicie manualmente com: npm start"
  echo "Se preferir um servico nativo, use o arquivo painel-ips.service com systemd."
fi

echo "Instalacao concluida."
