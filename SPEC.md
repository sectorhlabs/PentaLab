# MyMusic - App de Grabación y Práctica Musical

## 1. Concepto y Visión

**MyMusic** es una app móvil que permite a músicos aficionados y profesionales grabar canciones, detectar acordes automáticamente, sincronizar con letras y practicar confeedback en tiempo real. La experiencia se siente como tener un profesor de música en tu bolsillo: íntima, inmediata, sin fricciones.

**Tagline:** "Tu canción, tu ritmo, tus acordes."

**Mood:** Profesional pero accesible. Inspirador sin ser abrumador. Como una sala de ensayo digital privada.

---

## 2. Design Language

### Aesthetic Direction

Inspirado en apps como Spotify, SoundHound y Guitar Pro. Interfaz oscura con acentos vibrantes que destacan elementos interactivos. Glassmorphism sutil para profundidad sin distractores.

### Color Palette

```
--bg-primary: #0D0D0D        (negro profundo)
--bg-secondary: #1A1A1A      (gris oscuro)
--bg-elevated: #252525       (cards, modales)
--surface-glass: rgba(255,255,255,0.05)

--accent-primary: #FF6B35     (naranja cálido - acciones principales)
--accent-secondary: #7B61FF   (violeta - acentos, hover states)
--accent-success: #00D26A     (verde - confirmación, recording)
--accent-warning: #FFB800     (amarillo - alerta, sync)

--text-primary: #FFFFFF
--text-secondary: #A0A0A0
--text-muted: #666666

--chord-highlight: #FF6B35    (overlay de acorde activo)
```

### Typography

- **Primary:** Inter (weights: 400, 500, 600, 700)
- **Monospace:** JetBrains Mono (para datos de tempo, timestamps)
- **Fallback:** -apple-system, BlinkMacSystemFont, sans-serif

### Spatial System

- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
- Border radius: 8px (small), 12px (medium), 16px (large), 24px (cards)
- Touch targets mínimo: 44x44px

### Motion Philosophy

- Micro-interacciones suaves (150-300ms)
- Transiciones de estado con ease-out
- Feedback táctil: scale(0.97) en press
- Recording pulse animation (breathing effect)
- No animaciones pesadas que consuman batería

### Visual Assets

- **Icons:** Lucide React (consistent stroke width)
- **Waveforms:** Canvas/WebGL rendering
- **Chord diagrams:** SVG inline
- **Empty states:** Ilustraciones minimalistas en lnea

---

## 3. Layout & Structure

### Navegación Principal

Bottom navigation bar (estilo TikTok/Spotify):

```
[🎤 Grabaciones] [🎵 Biblioteca] [✏️ Crear] [🎸 Practicar] [⚙️ Ajustes]
```

### Screens

#### 3.1 Home / Grabaciones

- Header con greeting personalizado + fecha
- Lista de grabaciones recientes (cards)
- FAB para nueva grabación
- Pull-to-refresh
- Swipe actions: delete, share

#### 3.2 Biblioteca

- Grid de canciones guardadas
- Filtros: todas, recientes, favoritos
- Search bar sticky
- Long-press para acciones múltiples

#### 3.3 Crear / Editor de Canción

- **Step 1:** Recording interface
  - Visualizador de waveform en tiempo real
  - Contador de duración
  - Indicador de niveles (peak meter)
  - Botón grande de record/stop

- **Step 2:** Detección de acordes (procesamiento)
  - Progress ring con etapas: "Analizando...", "Detectando acordes...", "Finalizando..."
  - Preview de chord timeline generado

- **Step 3:** Editor de letras
  - Timeline vertical con timestamps
  - Sync de texto con audio (tap to jump)
  - Input de letra por sección/tiempo
  - Auto-timestamps al escribir

- **Step 4:** Preview y ajustes
  - Player con acorde actual destacado
  - Control de velocidad (0.5x - 1.5x)
  - Loop section markers
  - Transpose controls

#### 3.4 Practicar

- Pantalla principal de playback
- Chord prominently displayed (fuente grande, centro)
- Letra scrolleable con acorde marcado
- Mini player controls (play/pause, skip)
- Metrónomo opcional
- Tempo adjustment in-app

#### 3.5 Ajustes

- Perfil de usuario
- Calidad de grabación
- Tema (dark only para MVP)
- Guía de acorde (show/hide)
- Sobre/ayuda

### Responsive Strategy

- **Mobile-first:** 320px - 428px (primary target)
- **Tablet:** 768px+ (layout adapts to 2-column donde tenga sentido)
- **Desktop:** 1024px+ (para edición detallada, no priority)

---

## 4. Features & Interactions

### 4.1 Grabación de Audio

**Captura:**

- MediaRecorder API (web/PWA)
- Formato: WebM
- Sample rate: 44.1kHz
- Calidad: Alta (bitrate 128-256kbps)

**Estados:**

- `idle`: Botón ready, waveform vacío
- `recording`: Pulsing red dot, timer running, waveform live
- `paused`: Waveform congelado, timer pausado
- `processing`: Spinner, "Procesando audio..."
- `complete`: Preview playable

**Interacciones:**

- Tap: Start/stop recording
- Long press: Pause/resume
- Swipe left on recording: Delete confirmation

### 4.2 Detección de Acordes (On-Device)

Todo el análisis ocurre en el dispositivo, dentro de un Web Worker (sin red, sin
servidor). No hay subida ni dependencia de backend.

**Pipeline:**

```
Blob → decodeAudioData → mono + decimación → FFT (chroma 12-bin) →
filtro mediana → estimación de tono → emisiones con prior diatónico →
Viterbi → coalescencia de acordes → Chord Timeline (+ tono + tempo)
```

**Output:**

```json
{
  "chords": [
    {
      "start": 0.0,
      "end": 3.2,
      "root": "C",
      "quality": "major",
      "confidence": 0.95
    },
    {
      "start": 3.2,
      "end": 6.1,
      "root": "Am",
      "quality": "minor",
      "confidence": 0.88
    }
  ],
  "tempo": 120,
  "key": "C"
}
```

**Transiciones (estados del recorder):**

- `recording` → `analyzing` (worker corriendo, progress 0-100%)
- → `complete` (success, preview + auto-navigate)

**Errores:**

- Audio ilegible o demasiado corto para decodificar: "No pudimos leer esa
  grabación. Prueba a grabar de nuevo, un poco más larga." (vuelve a `idle`)
- Sin acordes detectados: el usuario puede editarlos manualmente en el editor.

### 4.3 Editor de Letras

**Estructura de datos:**

```json
{
  "sections": [
    {
      "id": "uuid",
      "name": "Verso 1",
      "lyrics": "Primera línea\nSegunda línea\nTercera línea",
      "startTime": 0.0,
      "endTime": 15.5
    }
  ]
}
```

**Interacciones:**

- Tap en timestamp: Play audio desde ese punto
- Typing: Auto-advance al siguiente timestamp (basado en tempo estimado)
- Drag handles: Ajustar timing de sección
- Pull-up: Agregar nueva sección

**Auto-timestamp:**

- Mientras usuario escribe, sistema estima timestamps basándose en:
  - Duración total de la sección
  - Caracteres por línea (promedio)
  - Pausas detectadas en audio original

### 4.4 Playback con Sync

**Componentes:**

- Waveform seekbar (touch-draggable)
- Current chord display (badge grande)
- Lyrics view (scroll automático)
- Transport controls

**Comportamiento de scroll:**

- Lyric activo centrado verticalmente
- Scroll suave al siguiente lyric
- 用户可以手动 scroll (pausa auto-scroll por 3s)

**Chord overlay:**

- Posición: Above lyrics, centered
- Font: 32px bold
- Background: pill shape con blur
- Transition: fade 200ms

### 4.5 Práctica

**Loop Section:**

- Long press + drag en waveform para marcar region
- Botón "Loop" aparece
- Reproducción infinita de la sección

**Tempo Control:**

- Slider: 0.5x - 1.5x
- Presets: 0.5x, 0.75x, 1.0x
- Metrónome toggle (click track)

**Transpose:**

- Botones +1 semitono / -1 semitono
- Rango: -6 a +6
- afecta visualización, no el audio

### 4.6 Stem Separation (Premium/Future)

**Implementación:** Demucs (Meta)

- Separación en 4 stems: vocals, drums, bass, other
- UI: Toggles on/off por stem
- Uso: Practice con solo instrumental o Count-in

**Nota:** Esta feature es compute-intensive y no es viable on-device. Quedaría
fuera del alcance actual (solo on-device); requeriría reintroducir un backend
dedicado en una fase futura.

---

## 5. Component Inventory

### 5.1 Button

**Variants:**

- `primary`: bg-accent-primary, white text
- `secondary`: bg-transparent, border accent
- `ghost`: bg-transparent, text secondary
- `danger`: bg-red-600, white text

**Sizes:**

- `sm`: h-36, px-12, text-sm
- `md`: h-44, px-16, text-base (default for touch)
- `lg`: h-52, px-24, text-lg
- `fab`: h-64, w-64, circular

**States:**

- default: opacity 100%
- hover/focus: brightness 110%
- pressed: scale(0.97)
- disabled: opacity 50%
- loading: spinner icon

### 5.2 Card (Grabación)

```
┌────────────────────────────────┐
│ [Waveform mini]      3:24  ♥  │
│                                │
│ "Mi primera canción"           │
│ 12 Mayo 2026 • 3:24            │
│                                │
│ [▶ Play]  [✏️ Edit]  [🗑️]     │
└────────────────────────────────┘
```

- bg-elevated, rounded-16
- Shadow: 0 4px 12px rgba(0,0,0,0.3)
- Swipe left: reveal delete (red)

### 5.3 Chord Badge

```
┌──────────┐
│    Am    │
│  0.88    │
└──────────┘
```

- bg-accent-primary con 20% opacity
- Border: 2px solid accent
- Font: JetBrains Mono, 24px, bold
- Confidence: 10px below, muted text

### 5.4 Waveform Visualizer

- Canvas element, responsive width
- Bar width: 2px, gap: 1px
- Color: gradient from accent-primary to accent-secondary
- Played region: full color
- Unplayed: 30% opacity
- Touch area: 44px height minimum

### 5.5 Lyric Line

```
│ [0:15] Este es el verso que estoy cantando  │  Am
```

- Timestamp: mono font, muted, left
- Lyric text: primary, 16px
- Current: bg accent-primary 10%, bold
- Chord column: right-aligned, chord badge

### 5.6 Bottom Navigation

```
┌─────────────────────────────────────────────┐
│  🎤      🎵      ✏️      🎸      ⚙️       │
│ Grab.   Biblio.  Crear  Pract.  Ajustes     │
└─────────────────────────────────────────────┘
```

- Height: 64px + safe area
- Active: accent color, scaled 1.1
- Inactive: text-muted
- Icon size: 24px
- Label: 10px, below icon

### 5.7 Recording Button

```
     ╭───────╮
     │   ●   │  ← pulse animation cuando recording
     │       │
     ╰───────╯
```

- Size: 80x80px
- idle: bg-elevated, white inner circle
- recording: red inner circle, pulsing ring
- stop: square icon appears

### 5.8 Progress Indicator (Processing)

```
    ┌─────────────────┐
    │    ◠◠◠◠◠◠◠◠◠◠   │  67%
    │  Detectando...  │
    └─────────────────┘
```

- bg-elevated, rounded-24
- Progress bar: accent-primary
- Label centered
- Percentage right-aligned

### 5.9 Empty State

```
    🎸
    No tienes grabaciones aún

    Presiona el botón + para crear
    tu primera canción

    [+ Crear grabación]
```

- Centered, max-width 280px
- Icon: 48px, muted
- Title: 18px, primary
- Subtitle: 14px, secondary
- CTA button below

### 5.10 Modal / Bottom Sheet

```
    ═══════════════════
         ⋮⋮⋮ (drag handle)

    ¿Eliminar esta grabación?

    Esta acción no se puede deshacer.

    [Cancelar]    [Eliminar]
```

- Slides up from bottom
- Drag handle at top
- Backdrop: rgba(0,0,0,0.6)
- Max height: 90vh
- Dismiss: swipe down or tap backdrop

---

## 6. Technical Approach

### 6.1 Stack

**Frontend (única capa de la app):**

- React 18
- TypeScript 5
- Vite (bundler)
- TailwindCSS (styling + animaciones por keyframes/CSS)
- Zustand (estado, con persist sobre IndexedDB)
- React Router (navegación)
- lucide-react (iconos)
- Web Audio API (`decodeAudioData`, chroma) + FFT propia (`lib/fft.ts`)
- MediaRecorder API (grabación)
- Web Worker (`chordWorker`) para el análisis sin bloquear la UI

**Backend:** ninguno. Toda la detección de acordes es on-device. La
autenticación (`/api/login`, `/api/me`, `/api/logout`) la resuelve el proxy de
producción, no un servidor de la app.

**Mobile:**

- PWA (instalable, offline). Sin Capacitor por ahora.

### 6.2 Persistencia y red

No hay API REST propia: grabaciones, acordes y letras viven en el dispositivo.

**Almacenamiento local (`services/storage.ts`):**

```
IndexedDB "pentalab-db"
  ├── store "recordings"  → { id, blob }            (audio crudo)
  └── store "kv"          → adaptador para zustand persist
                            (metadata: lista de grabaciones, acordes, letras)
```

- El análisis devuelve `{ chords, key, tempo }` desde el worker; se guarda junto
  con la metadata. No hay polling ni jobs asíncronos remotos.
- Al borrar una grabación se elimina su blob de IndexedDB y su metadata del store.

**Único contacto con red — autenticación (proxy de producción, no la app):**

```
POST /api/login    → inicia sesión (cookie firmada)
GET  /api/me       → valida la sesión actual
POST /api/logout   → cierra sesión
```

### 6.3 Data Model (client-side)

Sin base de datos ni esquema relacional. Los tipos viven en el cliente y se
serializan en IndexedDB.

```ts
RecordingData {           // metadata, en el store kv vía zustand persist
  id: string              // crypto.randomUUID()
  title: string
  duration: number        // segundos
  chords: Chord[]
  key?: string
  tempo?: number
  lyrics?: LyricLine[]
  createdAt: string        // ISO
}

Chord     { start: number; end: number; root: string; quality: string; confidence: number }
LyricLine { time: number | null; text: string }   // time = null si no está sincronizada
```

El audio crudo (Blob) se guarda aparte, en el store `recordings`, con la misma
`id` como clave.

### 6.4 Audio Processing Pipeline (On-Device)

Implementado a mano en `lib/audioProcessor.ts` (+ FFT propia en `lib/fft.ts`),
ejecutado en `workers/chordWorker.ts` para no bloquear la UI.

```
1. Grabación → Blob en memoria
2. decodeAudioData → downmix a mono → decimación
3. FFT por frame → magnitudes
4. Chroma de 12 bins por frame, con estimación de afinación (tuning)
   y umbral de silencio (5% de la mediana de energía)
5. Filtro mediana temporal del chroma (aplana transitorios)
6. Estimación de tono global → prior diatónico para las emisiones
7. Viterbi sobre las emisiones → secuencia de estados → acordes
8. Coalescencia de acordes contiguos iguales + estimación de tempo
9. Guardar { chords, key, tempo } en IndexedDB junto al audio
10. Playback: sincroniza el acorde mostrado con el tiempo de audio actual
```

**Nota:** La detección on-device tiene ~70-85% de precisión. Es el único modo;
no hay fallback de servidor.

### 6.5 Offline Strategy (PWA)

- Service Worker for asset caching
- IndexedDB es la fuente de verdad (no una caché):
  - Audio grabado (Blob)
  - Acordes, tono y tempo
  - Letras
- La app funciona completa sin conexión; no hay sincronización con servidor.

### 6.6 Performance Considerations (Mobile)

- Lazy load screens (React.lazy + Suspense)
- Waveform rendering: requestAnimationFrame + Canvas
- Debounce waveform updates (every 100ms during recording)
- Image optimization: WebP, lazy loading
- Tree shaking para reducir bundle size
- Native scrolling (useNativeDriver para animations)

---

## 7. Project Structure

```
PentaLab/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthGate.tsx        # gate de sesión (/api/me)
│   │   │   ├── BottomNav.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LyricsEditor.tsx
│   │   │   ├── LyricsSync.tsx
│   │   │   ├── PlayAlong.tsx
│   │   │   └── decor.tsx           # PaintBlob, Wordmark, Signature
│   │   ├── screens/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Create.tsx
│   │   │   ├── Practice.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts
│   │   │   └── usePwaInstall.ts
│   │   ├── lib/
│   │   │   ├── audioProcessor.ts   # chroma + Viterbi (detección)
│   │   │   ├── fft.ts              # FFT radix-2 propia
│   │   │   └── format.ts          # formatTime (m:ss)
│   │   ├── services/
│   │   │   └── storage.ts          # IndexedDB + adaptador zustand
│   │   ├── stores/
│   │   │   ├── recordingStore.ts
│   │   │   └── settingsStore.ts
│   │   ├── workers/
│   │   │   └── chordWorker.ts       # corre audioProcessor fuera del hilo UI
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── SPEC.md
```

> No hay `backend/` ni `capacitor/`: la app es 100% frontend (PWA), con la
> detección de acordes on-device.

---

## 8. Scope Control (MVP vs Full)

### MVP (Fase 1)

- ✅ Recording (mobile only)
- ✅ Chord detection (on-device: chroma + Viterbi)
- ✅ Lyrics editor (manual input)
- ✅ Playback with chord sync
- ✅ Basic playback controls (play/pause, seek)
- ✅ Tempo adjustment

### Full App (Fase 2)

- ✅ Loop sections
- ✅ Share recordings
- ✅ Favorites/playlists
- ⏳ Stem separation (Demucs) — requiere reintroducir backend
- ⏳ Auto-lyrics transcription (Whisper) — requiere backend
- ⏳ User accounts / sincronización en la nube

---

## 9. Testing Strategy

### Frontend

- Vitest + React Testing Library
- Component tests: buttons, cards, inputs
- Integration: recording flow, playback flow
- Unit: `audioProcessor` / `fft` con audio sintético de acordes conocidos

### E2E (Post-MVP)

- Playwright
- Critical flows: record → analyze (on-device) → practice

---

## 10. Deployment

### Frontend (estático, único despliegue)

- Vercel (preferred) o Netlify
- Preview deployments for PRs
- Build: `tsc && vite build` → estáticos + service worker (PWA)

### Backend

- Ninguno. No hay servicio de aplicación que desplegar ni escalar.
- La autenticación la cubre el proxy de producción que sirve los estáticos.

### Storage

- En el dispositivo (IndexedDB). No hay almacenamiento de objetos en la nube
  (S3/R2) porque el audio nunca sale del navegador.

---

_Last updated: 2026-06-20 — arquitectura solo on-device (sin backend)_
