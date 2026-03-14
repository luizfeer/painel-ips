const http = require('http')
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const os = require('os')

loadEnvFile(path.join(__dirname, '.env'))

const PORT = Number(process.env.PAINEL_PORT || 3500)
const HOST = process.env.PAINEL_HOST || '0.0.0.0'
const CONFIG_REFRESH_MS = Number(process.env.PAINEL_CONFIG_REFRESH_MS || 30 * 60 * 1000)

const DEFAULT_PM2_LINKS = {
  'evolution-api': { port: 8080 },
  'evolution-manager': { port: 3000 },
  'poliwebapp_api': { url: 'http://127.0.0.1:5000' },
  'wallet-service': { port: 8787 },
  'painel-ips': { port: 3500 }
}

const DEFAULT_CONFIG = {
  hostLabel: 'auto',
  hostSubtitle: 'gateway interno',
  networkLabel: 'ambiente privado',
  networkDescription: 'wireguard 10.8.0.0/24',
  databaseSectionLabel: 'PostgreSQL cluster interno',
  serviceSectionLabel: 'HTTP · TCP internos',
  databases: [
    { name: 'n8n PostgreSQL', port: 5433, user: 'n8n', database: 'n8n' },
    { name: 'Postgres standalone', port: 5432, user: '—', database: '—' }
  ],
  services: [
    { name: 'n8n', port: 5678 },
    { name: 'Langflow', port: 7860 },
    { name: 'PostgreSQL (standalone)', port: 5432 },
    { name: 'Redis (evolution)', port: 6379 }
  ]
}

const panelConfig = loadPanelConfig()
const pm2Links = loadJsonEnv('PAINEL_PM2_LINKS_JSON', DEFAULT_PM2_LINKS)

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue

    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

function loadJsonEnv(name, fallback) {
  const raw = process.env[name]
  if (!raw) return fallback

  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error(`Falha ao interpretar ${name}: ${error.message}`)
    return fallback
  }
}

function loadPanelConfig() {
  const config = loadJsonEnv('PAINEL_CONFIG_JSON', DEFAULT_CONFIG)

  return {
    hostLabel: String(config.hostLabel || DEFAULT_CONFIG.hostLabel),
    hostSubtitle: String(config.hostSubtitle || DEFAULT_CONFIG.hostSubtitle),
    networkLabel: String(config.networkLabel || DEFAULT_CONFIG.networkLabel),
    networkDescription: String(config.networkDescription || DEFAULT_CONFIG.networkDescription),
    databaseSectionLabel: String(config.databaseSectionLabel || DEFAULT_CONFIG.databaseSectionLabel),
    serviceSectionLabel: String(config.serviceSectionLabel || DEFAULT_CONFIG.serviceSectionLabel),
    databases: Array.isArray(config.databases) ? config.databases : DEFAULT_CONFIG.databases,
    services: Array.isArray(config.services) ? config.services : DEFAULT_CONFIG.services
  }
}

function getPrimaryIpv4() {
  const preferredInterface = process.env.PAINEL_IP_INTERFACE
  const networks = os.networkInterfaces()

  if (preferredInterface && Array.isArray(networks[preferredInterface])) {
    const chosen = networks[preferredInterface].find(isUsableAddress)
    if (chosen) return chosen.address
  }

  const candidates = []
  for (const entries of Object.values(networks)) {
    for (const entry of entries || []) {
      if (isUsableAddress(entry)) candidates.push(entry.address)
    }
  }

  return (
    candidates.find(address => address.startsWith('10.')) ||
    candidates.find(address => address.startsWith('172.')) ||
    candidates.find(address => address.startsWith('192.168.')) ||
    candidates[0] ||
    '127.0.0.1'
  )
}

function isUsableAddress(entry) {
  return entry && entry.family === 'IPv4' && entry.internal === false
}

function buildAddress(item, hostLabel) {
  if (item.address) return String(item.address)
  if (item.url) return String(item.url)
  if (item.port) return `${hostLabel}:${item.port}`
  return hostLabel
}

function resolvePm2Link(linkConfig, hostLabel) {
  if (!linkConfig) return null
  if (linkConfig.url) return { ...linkConfig, url: String(linkConfig.url) }
  if (linkConfig.port) return { ...linkConfig, url: `http://${hostLabel}:${linkConfig.port}` }
  return null
}

function getResolvedPanelConfig() {
  const detectedHost = getPrimaryIpv4()
  const hostLabel = panelConfig.hostLabel === 'auto'
    ? detectedHost
    : String(panelConfig.hostLabel || detectedHost)

  return {
    ...panelConfig,
    hostLabel,
    refreshMs: CONFIG_REFRESH_MS,
    databases: panelConfig.databases.map(item => ({
      ...item,
      address: buildAddress(item, hostLabel)
    })),
    services: panelConfig.services.map(item => ({
      ...item,
      address: buildAddress(item, hostLabel)
    }))
  }
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500)
      res.end('Erro interno')
      return
    }

    res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` })
    res.end(data)
  })
}

function execJsonCommand(command, args, res, transform) {
  execFile(command, args, (err, stdout) => {
    if (err) {
      const missingBinary = err.code === 'ENOENT'
      json(res, missingBinary ? 503 : 500, {
        error: missingBinary
          ? `${command} nao esta instalado nesta VPS`
          : err.message
      })
      return
    }

    try {
      const payload = transform(stdout)
      json(res, 200, payload)
    } catch (error) {
      json(res, 500, { error: 'parse error' })
    }
  })
}

function apiConfig(res) {
  json(res, 200, getResolvedPanelConfig())
}

function apiPm2(res) {
  execJsonCommand('pm2', ['jlist'], res, stdout => {
    const resolvedConfig = getResolvedPanelConfig()
    const list = JSON.parse(stdout)
    return list.map(item => ({
      ...item,
      _link: resolvePm2Link(pm2Links[item.name], resolvedConfig.hostLabel)
    }))
  })
}

function apiDocker(res) {
  execJsonCommand('docker', ['ps', '-a', '--format', '{{json .}}'], res, stdout => {
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  })
}

function parseDockerStatNumber(value) {
  const normalized = String(value || '').replace(',', '.').trim()
  const match = normalized.match(/^([\d.]+)\s*([kmgt]?i?b)?$/i)
  if (!match) return 0

  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return 0

  const unit = (match[2] || 'b').toLowerCase()
  const multipliers = {
    b: 1,
    kb: 1000,
    mb: 1000 ** 2,
    gb: 1000 ** 3,
    tb: 1000 ** 4,
    kib: 1024,
    mib: 1024 ** 2,
    gib: 1024 ** 3,
    tib: 1024 ** 4
  }

  return amount * (multipliers[unit] || 1)
}

function apiDockerStats(res) {
  execJsonCommand('docker', ['stats', '--no-stream', '--format', '{{json .}}'], res, stdout => {
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const item = JSON.parse(line)
        const memoryRaw = String(item.MemUsage || '')
        const [usedStr, limitStr] = memoryRaw.split('/').map(part => part?.trim() || '')
        const cpuPercent = Number(String(item.CPUPerc || '0').replace('%', '').replace(',', '.'))
        const memPercent = Number(String(item.MemPerc || '0').replace('%', '').replace(',', '.'))

        return {
          ...item,
          cpuPercent: Number.isFinite(cpuPercent) ? cpuPercent : 0,
          memoryUsedBytes: parseDockerStatNumber(usedStr),
          memoryLimitBytes: parseDockerStatNumber(limitStr),
          memoryPercent: Number.isFinite(memPercent) ? memPercent : 0
        }
      })
  })
}

function apiProcesses(res) {
  execJsonCommand('ps', ['-eo', 'pid=,ppid=,pcpu=,pmem=,rss=,comm=,args=', '--sort=-rss'], res, stdout => {
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(0, 12)
      .map(line => {
        const parts = line.trim().split(/\s+/, 7)
        const [pid, ppid, cpu, mem, rssKb, command, args] = parts

        return {
          pid: Number(pid) || 0,
          ppid: Number(ppid) || 0,
          cpuPercent: Number(cpu) || 0,
          memoryPercent: Number(mem) || 0,
          memoryBytes: (Number(rssKb) || 0) * 1024,
          command: command || '—',
          args: args || command || '—'
        }
      })
  })
}

function readCpuTimes() {
  return os.cpus().map(cpu => ({ ...cpu.times }))
}

function cpuUsagePercent(sampleMs = 200) {
  const before = readCpuTimes()

  return new Promise(resolve => {
    setTimeout(() => {
      const after = readCpuTimes()
      let idleDelta = 0
      let totalDelta = 0

      for (let index = 0; index < before.length; index += 1) {
        const prev = before[index]
        const next = after[index]
        const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq
        const nextTotal = next.user + next.nice + next.sys + next.idle + next.irq

        idleDelta += next.idle - prev.idle
        totalDelta += nextTotal - prevTotal
      }

      if (totalDelta <= 0) {
        resolve(0)
        return
      }

      const usage = 100 - (idleDelta / totalDelta) * 100
      resolve(Number(usage.toFixed(1)))
    }, sampleMs)
  })
}

function diskUsage() {
  return new Promise(resolve => {
    execFile('df', ['-kP', '/'], (err, stdout) => {
      if (err) {
        resolve({ error: err.message })
        return
      }

      const lines = stdout.trim().split('\n')
      const line = lines[1]
      if (!line) {
        resolve({ error: 'disk parse error' })
        return
      }

      const parts = line.trim().split(/\s+/)
      const totalKb = Number(parts[1])
      const usedKb = Number(parts[2])
      const availableKb = Number(parts[3])
      const percent = Number(String(parts[4] || '0').replace('%', ''))
      const mount = parts[5] || '/'

      resolve({
        total: totalKb * 1024,
        used: usedKb * 1024,
        available: availableKb * 1024,
        percent,
        mount
      })
    })
  })
}

async function apiResources(res) {
  try {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const [cpuPercent, disk] = await Promise.all([cpuUsagePercent(), diskUsage()])

    json(res, 200, {
      hostname: os.hostname(),
      platform: `${os.platform()} ${os.release()}`,
      arch: os.arch(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      cpu: {
        usagePercent: cpuPercent,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || '—'
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Number(((usedMem / totalMem) * 100).toFixed(1))
      },
      disk,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    json(res, 500, { error: error.message || 'resource error' })
  }
}

function healthcheck(res) {
  json(res, 200, {
    status: 'ok',
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString()
  })
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.url === '/' || req.url === '/index.html') {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html')
    return
  }

  if (req.url === '/pm2') {
    serveFile(res, path.join(__dirname, 'pm2.html'), 'text/html')
    return
  }

  if (req.url === '/resources') {
    serveFile(res, path.join(__dirname, 'resources.html'), 'text/html')
    return
  }

  if (req.url === '/api/config') {
    apiConfig(res)
    return
  }

  if (req.url === '/api/pm2') {
    apiPm2(res)
    return
  }

  if (req.url === '/api/docker') {
    apiDocker(res)
    return
  }

  if (req.url === '/api/docker-stats') {
    apiDockerStats(res)
    return
  }

  if (req.url === '/api/processes') {
    apiProcesses(res)
    return
  }

  if (req.url === '/api/resources') {
    apiResources(res)
    return
  }

  if (req.url === '/healthz') {
    healthcheck(res)
    return
  }

  res.writeHead(404)
  res.end('Not found')
}).listen(PORT, HOST, () => {
  console.log(`Painel rodando em http://${HOST}:${PORT}`)
})
