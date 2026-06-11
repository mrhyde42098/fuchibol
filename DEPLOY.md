# Desplegar Fuchibol gratis

## Arquitectura

| Parte | Hosting gratis | URL ejemplo |
|-------|----------------|-------------|
| **Frontend** (React) | [Vercel](https://vercel.com) o [Netlify](https://netlify.com) | `https://fuchibol.vercel.app` |
| **Backend** (Fastify) | [Render](https://render.com) | `https://fuchibol-api.onrender.com` |

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
   - `PUBLIC_BASE_URL` = `https://fuchibol-api.onrender.com` (tu URL de Render)
5. Deploy → espera ~3 min
6. Prueba: `https://TU-API.onrender.com/api/health`

> El plan gratis de Render "duerme" tras 15 min sin uso. La primera petición tarda ~30s en despertar.

---

## Paso 3 — Frontend en Vercel (gratis)

1. Entra a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el mismo repo de GitHub
3. **Root Directory**: `frontend`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://TU-API.onrender.com/api
   ```
5. Deploy → listo en ~1 min

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
PUBLIC_BASE_URL=https://fuchibol-api.onrender.com
TOKEN_SECRET=un-secreto-largo-y-aleatorio-min-32-chars
STREAM_AUDIT_ENABLED=true
STREAM_AUDIT_PRIORITY_INTERVAL_MS=90000
STREAM_AUDIT_BACKGROUND_INTERVAL_MS=45000
STREAM_AUDIT_BACKGROUND_BATCH=6
```

### Frontend (Vercel/Netlify)
```
VITE_API_URL=https://fuchibol-api.onrender.com/api
```

---

## Probar local antes de subir

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Abre http://localhost:5173
