# Desplegar Fuchibol gratis

## Arquitectura

| Parte | Hosting gratis | URL ejemplo |
|-------|----------------|-------------|
| **Frontend** (React) | [Vercel](https://vercel.com) o [Netlify](https://netlify.com) | `https://fuchibol420.vercel.app` |
| **Backend** (Fastify) | [Render](https://render.com) | `https://fuchibol420-api.onrender.com` |

---

## Paso 1 — Subir código a GitHub

```bash
cd D:\Users\DESKTOP\Desktop\Fuchibol
git init
git add backend/ frontend/ golea-analysis/ render.yaml .gitignore
git commit -m "Fuchibol: frontend + backend"
git branch -M main
git remote add origin https://github.com/mrhyde42098/fuchibol.git
git push -u origin main
```

---

## Paso 2 — Backend en Render (gratis)

1. Entra a [render.com](https://render.com) → **New +** → **Blueprint**
2. Conecta tu repo de GitHub
3. Render detectará `render.yaml` automáticamente
4. En variables de entorno, configura:
   - `PUBLIC_BASE_URL` = `https://fuchibol420-api.onrender.com` (tu URL de Render)
5. Deploy → espera ~3 min
6. Prueba: `https://TU-API.onrender.com/api/health`

> El plan gratis de Render "duerme" tras 15 min sin uso. La primera petición tarda ~30s en despertar.

---

## Paso 3 — Frontend en Vercel (gratis)

1. Entra a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el mismo repo de GitHub
3. **Root Directory**: `frontend`
4. **Project Name**: `fuchibol420` (quedará en `https://fuchibol420.vercel.app`)
5. **Environment Variables**:
   ```
   VITE_API_URL=https://fuchibol420-api.onrender.com/api
   ```
6. Deploy → listo en ~1 min

---

## Alternativa frontend: Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → Import from Git
2. Base directory: `frontend`
3. Build: `npm run build` | Publish: `dist`
4. Env: `VITE_API_URL=https://TU-API.onrender.com/api`

---

## Variables de entorno

### Backend (`backend/.env` en Render)
```
PUBLIC_BASE_URL=https://fuchibol420-api.onrender.com
TOKEN_SECRET=un-secreto-largo-y-aleatorio-min-32-chars
STREAM_AUDIT_ENABLED=true
STREAM_AUDIT_PRIORITY_INTERVAL_MS=90000
STREAM_AUDIT_BACKGROUND_INTERVAL_MS=45000
STREAM_AUDIT_BACKGROUND_BATCH=6
```

### Frontend (Vercel/Netlify)
```
VITE_API_URL=https://fuchibol420-api.onrender.com/api
```

---

## Servidor en tu PC (siempre encendido)

Un solo proceso sirve la web y la API en el puerto **4000**:

```powershell
cd D:\Users\DESKTOP\Desktop\Fuchibol
.\scripts\start-home-server.ps1
```

Abre **http://localhost:4000** (o `http://TU-IP-LOCAL:4000` desde el celular en la misma WiFi).

### Reinicio automático con PM2

```bash
npm run build
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # arranca al encender Windows (sigue instrucciones de PM2)
```

El backend actualiza solo cada **60 s** la agenda/canales, cada **90 s** audita señales prioritarias, y renueva espejos IPTV cada **6 h**.

---

## Probar local antes de subir

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Abre http://localhost:5173

---

## UI lista para producción (checklist)

Antes de publicar, verifica en **http://localhost:4000** (servidor único) o en la URL de Vercel:

- [ ] Logo **Fuchibol** visible en el header (`/brand/fuchibol-logo.svg`)
- [ ] Favicon carga (`/brand/fuchibol-mark.svg`)
- [ ] Canales Latam muestran **logo de marca** (ESPN, Win, TyC, Fox…) no solo iniciales
- [ ] Guía de canales: máximo **2 filas** de filtros (región + señal; avanzados en "Filtros")
- [ ] Secciones colapsables (Win Sports, ESPN, etc.) con acordeón
- [ ] Carrusel "En el aire" con logos grandes
- [ ] Agenda con botones de canal con logo y calidad (1080p/720p)
- [ ] Reproductor y fondo `#0a1128` sin cambios de tamaño
- [ ] `npm run build` en `frontend/` sin errores
- [ ] Meta OG para compartir link (`/brand/og-image.svg`)

### Build y servir en un solo puerto

```bash
cd frontend && npm run build
cd ../backend
set SERVE_FRONTEND=true
set PUBLIC_BASE_URL=http://localhost:4000
npm start
```

Assets estáticos de marca y logos tienen cache de 7 días en Vercel (`frontend/vercel.json`).
