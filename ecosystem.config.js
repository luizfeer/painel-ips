module.exports = {
  apps: [
    {
      name: 'painel-ips',
      script: './server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PAINEL_HOST: '0.0.0.0',
        PAINEL_PORT: '3500'
      }
    }
  ]
}
