# Desplegar Fuchibol gratis

## Mejor opción para internet (resumen)

| Opción | Costo | PC encendido | URL fija | Recomendado si… |
|--------|-------|--------------|----------|-----------------|
| **A. Túnel Cloudflare** (botón en `Fuchibol.exe`) | Gratis | Sí | No (cambia) | Pruebas rápidas, compartir con amigos |
| **B. Cloudflare Tunnel + cuenta** | Gratis | Sí | Sí (`fuchibol.tudominio.com`) | Quieres URL propia sin pagar hosting |
| **C. Vercel + Render** | Gratis* | No | Sí | No quieres dejar el PC prendido (*Render plan Free, sin tarjeta) |
| **D. Solo tu PC (LAN)** | Gratis | Sí | No | Solo tú y familia en casa |

**Recomendación:** empieza con **`Fuchibol.exe` → Publicar en internet** para probar. Si te gusta y quieres URL fija, configura **Cloudflare Tunnel con dominio**. Si no quieres depender del PC, usa **Vercel (frontend) + Render (API)**.

---

## Arquitectura cloud (Vercel + Render)

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

## Servidor en tu PC (modo fácil — sin pagar hosting)

Tu PC sirve la web y la API en el puerto **4000**. Un doble clic y listo.

### Opción A — Panel `Fuchibol.exe` (recomendado)

Una sola vez:

```powershell
npm run build:exe
```

Queda **`Fuchibol.exe`** en la carpeta del proyecto. Doble clic abre un **panel con interfaz**:
- Iniciar / Detener servidor
- **Reparar** (reinstala deps, compila, arregla .env)
- Ver logs y errores
- Abrir web en PC, celular (WiFi) o internet (túnel)

El `.exe` debe estar en la misma carpeta que `backend/` y `frontend/`.

### Opción B — Scripts .bat (alternativa)

| Archivo | Qué hace |
|---------|----------|
| **`Iniciar-Fuchibol.bat`** | Inicia servidor y abre navegador |
| **`Detener-Fuchibol.bat`** | Apaga el servidor |

### Acceso directo en el Escritorio

```powershell
npm run shortcut
```

### URLs

- **Este PC:** `http://localhost:4000`
- **Celular (misma WiFi):** `http://TU-IP-LOCAL:4000` (la consola te muestra la IP)
- **Internet (modo túnel):** URL tipo `https://xxxx.trycloudflare.com` (cambia cada vez que inicias)

### Terminal (avanzado)

```powershell
cd D:\Users\DESKTOP\Desktop\Fuchibol
.\scripts\fuchibol-home.ps1 -Quick
```

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
