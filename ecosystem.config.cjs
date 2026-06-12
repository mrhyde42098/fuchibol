/** PM2: reinicio automático si el proceso cae. Instalar: npm i -g pm2 */
module.exports = {
  apps: [
    {
      name: 'fuchibol',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        SERVE_FRONTEND: 'true',
        PUBLIC_BASE_URL: 'http://localhost:4000',
        PORT: 4000,
        STREAM_AUDIT_ENABLED: 'true',
        IPTV_MIRROR_ENABLED: 'true',
        THESPORTSDB_ENABLED: 'true',
        THESPORTSDB_MINIMAL_MODE: 'true',
      },
    },
  ],
};
