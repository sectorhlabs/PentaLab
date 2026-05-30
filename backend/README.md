# MyMusic — Backend de análisis (opcional)

Backend local y minimalista para análisis de acordes de **mayor precisión** que el
motor on-device. Sin infraestructura: **SQLite** + **disco** + análisis con
**librosa**. Es opcional: si no está corriendo, la app analiza en el dispositivo.

## Requisitos

- Python 3.10–3.12
- `ffmpeg` instalado en el sistema (librosa lo usa para leer webm/m4a):
  - Debian/Ubuntu: `sudo apt install ffmpeg`

## Instalación

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Arrancar

```bash
# desde backend/, con el venv activado
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Crea automáticamente la base de datos `mymusic.db` y la carpeta `data/recordings/`.
- Health check: http://localhost:8000/health
- Los audios subidos se guardan en `backend/data/recordings/`.

### Probar desde el PC

El frontend en dev (`pnpm dev`) ya tiene un proxy de Vite hacia `localhost:8000`,
así que al grabar usará el backend automáticamente si está levantado (y caerá al
análisis on-device si no responde).

## Usar desde el móvil (túnel, gratis)

El móvil no puede ver `localhost`. Expón el backend con un túnel:

### Opción A — Cloudflare Tunnel (sin cuenta, efímero)

```bash
# instala cloudflared y luego:
cloudflared tunnel --url http://localhost:8000
```

Copia la URL `https://....trycloudflare.com` que imprime y pégala en la app:
**Ajustes → Análisis avanzado → Servidor de acordes** → *Probar conexión*.

### Opción B — Tailscale (estable, red privada)

1. Instala Tailscale en el PC y en el móvil (misma cuenta).
2. Arranca el backend con `--host 0.0.0.0`.
3. En la app usa `http://<nombre-o-IP-tailscale-del-PC>:8000`.

## Notas

- **Fallback automático**: si el backend está vacío en Ajustes o no responde, la app
  usa el análisis on-device (offline). No se rompe nunca.
- **Motor**: `chroma_cens` (constant-Q) + plantillas mayor/menor + Viterbi, con
  estimación de tonalidad (Krumhansl) y tempo (beat tracking). Si quisieras aún más
  precisión, el `ChordDetectionService` es el punto donde enchufar un modelo
  entrenado (p. ej. madmom) en el futuro.
```
