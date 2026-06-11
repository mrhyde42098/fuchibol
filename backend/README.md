# Fuchibol Backend

API de catálogo deportivo y proxy HLS para reproducción web sin restricciones CORS.

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
cd backend
cp .env.example .env
npm install
```

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm run build
npm start
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio y caché |
| GET | `/api/channels` | Catálogo unificado (~118 canales) |
| GET | `/api/agenda` | Agenda deportiva del día |
| GET | `/api/stream-url?id={channelId}` | URL firmada del manifiesto HLS |
| GET | `/api/proxy/manifest?s={token}` | Proxy de playlist `.m3u8` |
| GET | `/api/proxy/segment?s={token}` | Proxy de segmentos de video |

## Pruebas con curl

```bash
# Health
curl http://localhost:4000/api/health

# Catálogo
curl http://localhost:4000/api/channels

# Agenda
curl http://localhost:4000/api/agenda

# Resolver stream (ejemplo: canal ESPN por slug)
curl "http://localhost:4000/api/stream-url?id=espn"

# Reproducir manifiesto (usar proxyUrl del paso anterior)
curl "http://localhost:4000/api/proxy/manifest?s=TOKEN"
```

## Variables de entorno

Ver `.env.example`. Ajusta los perfiles `PROFILE_*` si un upstream cambia sus requisitos de `Origin`/`Referer`.

## Arquitectura

- **Caché en memoria**: canales cada 10 min, agenda cada 5 min
- **Scrapers**: pelotalibrestv.org, la18hd.com, tvtvhd.com
- **Fallback**: `golea-analysis/channels.json` y `agenda.json` si los scrapers fallan
- **Proxy HLS**: tokens HMAC con expiración de 15 min, CORS abierto en rutas `/api/proxy/*`
