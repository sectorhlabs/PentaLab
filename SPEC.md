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
- MediaRecorder API (web) / Capacitor (native)
- Formato: WebM (web) / AAC (native)
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

### 4.2 Detección de Acordes (Backend)

**Pipeline:**
```
Audio File → FFmpeg → WAV → Madmom (CNN+CRF) → Chord Timeline JSON
```

**Output:**
```json
{
  "chords": [
    { "start": 0.0, "end": 3.2, "root": "C", "quality": "major", "confidence": 0.95 },
    { "start": 3.2, "end": 6.1, "root": "Am", "quality": "minor", "confidence": 0.88 }
  ],
  "tempo": 120,
  "key": "C"
}
```

**Transiciones:**
- Grabación → "Subiendo..." (progress bar)
- → "Analizando audio..." ( indeterminate progress)
- → "Detectando acordes..." (progress 0-90%)
- → "Listo!" (success, auto-navigate)

**Errores:**
- Audio muy corto (<3s): "Grabación muy corta. Intenta grabar al menos 5 segundos."
- Backend offline: "Servicio temporalmente no disponible. Intenta más tarde."
- Detección fallida: "No pudimos detectar acordes. Puedes editarlos manualmente."

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

**Nota:** Esta feature es compute-intensive. En MVP, puede ser server-side only con pricing tier.

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

**Frontend:**
- React 18 (o Next.js para SSR si se necesita SEO)
- TypeScript 5
- Vite (bundler)
- TailwindCSS (styling)
- Framer Motion (animations)
- TanStack Query (state management)
- Zustand (lightweight state)
- Web Audio API (audio processing & chromagram)
- MediaRecorder API (recording)
- Pitchfinder (client-side pitch detection)

**Backend (Optional - for enhanced accuracy):**
- FastAPI (Python) - solo si se requiere precisión máxima
- Para MVP: todo el procesamiento es client-side

**Mobile:**
- Capacitor (wrapper para iOS/Android)
- PWA capabilities (offline, installable)

### 6.2 API Design

**Base URL:** `/api/v1`

**Endpoints:**

```
POST   /recordings              → Crear nueva grabación
GET    /recordings              → Listar grabaciones
GET    /recordings/:id          → Detalle de grabación
DELETE /recordings/:id          → Eliminar grabación

POST   /recordings/:id/analyze   → Iniciar análisis de acordes
GET    /recordings/:id/status    → Estado del análisis (polling)

PUT    /recordings/:id/lyrics   → Actualizar letras
GET    /recordings/:id/stream   → Audio stream

POST   /stems/:recording_id     → Separar stems (async)
GET    /stems/:recording_id     → Obtener stems separados
```

**Request/Response examples:**

```yaml
# POST /recordings
POST /api/v1/recordings
Content-Type: multipart/form-data

Response 201:
{
  "id": "uuid",
  "filename": "recording_uuid.webm",
  "duration": 180.5,
  "created_at": "2026-05-29T12:00:00Z"
}

# POST /recordings/:id/analyze
POST /api/v1/recordings/uuid/analyze

Response 202:
{
  "job_id": "uuid",
  "status": "queued"
}

# GET /recordings/:id/status
GET /api/v1/recordings/uuid/status

Response 200:
{
  "status": "completed|processing|failed",
  "progress": 0.67,
  "result": {
    "chords": [...],
    "tempo": 120,
    "key": "C"
  },
  "error": null
}
```

### 6.3 Data Model

```
User
  - id: UUID
  - email: string
  - created_at: timestamp

Recording
  - id: UUID
  - user_id: FK → User
  - title: string
  - audio_url: string (S3)
  - duration: float
  - created_at: timestamp

ChordAnalysis
  - id: UUID
  - recording_id: FK → Recording
  - chords: JSON
  - tempo: float
  - key: string
  - status: enum (pending, processing, completed, failed)

LyricSection
  - id: UUID
  - recording_id: FK → Recording
  - name: string
  - lyrics: text
  - start_time: float
  - end_time: float
  - order_index: int
```

### 6.4 Audio Processing Pipeline (Client-Side MVP)

```
1. User records audio → stored in memory as Blob
2. Recording complete → process audio with Web Audio API
3. Pitch Detection:
   - Use Pitchfinder library (autocorrelation / YIN)
   - Extract dominant frequencies per frame
4. Chromagram Calculation:
   - Map pitches to 12 semitones (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
   - Build 12-bin chromagram over time
5. Chord Detection:
   - Compare chromagram patterns to known chord templates
   - Apply smoothing (median filter) to reduce noise
   - Output: [{start, end, root, quality, confidence}, ...]
6. Store results in IndexedDB alongside audio
7. Playback: sync chord display with current audio time
```

**Nota:** La detección client-side tiene ~70-85% de precisión. Para máxima precisión, se puede añadir backend con Madmom en el futuro.

### 6.5 Offline Strategy (PWA)

- Service Worker for asset caching
- IndexedDB for:
  - Recorded audio (Blob)
  - Chord data (local cache)
  - Lyrics (draft edits)
- Background sync when connection restored
- UI shows "offline" indicator when disconnected

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
mymusic/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Buttons, cards, inputs
│   │   │   ├── recording/       # RecordButton, Waveform
│   │   │   ├── player/          # Player, TransportControls
│   │   │   ├── lyrics/          # LyricEditor, LyricLine
│   │   │   └── chords/          # ChordBadge, ChordTimeline
│   │   ├── screens/
│   │   │   ├── Home.tsx
│   │   │   ├── Library.tsx
│   │   │   ├── Create.tsx
│   │   │   ├── Practice.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts
│   │   │   ├── useAudioPlayer.ts
│   │   │   └── useChords.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── stores/
│   │   │   └── recordingStore.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── recordings.py
│   │   │       └── chords.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── deps.py
│   │   ├── models/
│   │   │   └── recording.py
│   │   ├── services/
│   │   │   ├── audio_processor.py
│   │   │   └── chord_detector.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── capacitor/
│   ├── android/
│   ├── ios/
│   └── capacitor.config.ts
│
└── SPEC.md
```

---

## 8. Scope Control (MVP vs Full)

### MVP (Fase 1)
- ✅ Recording (mobile only)
- ✅ Upload to backend
- ✅ Chord detection (Madmom)
- ✅ Lyrics editor (manual input)
- ✅ Playback with chord sync
- ✅ Basic playback controls (play/pause, seek)
- ✅ Tempo adjustment

### Full App (Fase 2)
- ✅ Stem separation (Demucs)
- ✅ Loop sections
- ✅ Share recordings
- ✅ Favorites/playlists
- ✅ Auto-lyrics transcription (Whisper)
- ✅ User accounts

---

## 9. Testing Strategy

### Frontend
- Vitest + React Testing Library
- Component tests: buttons, cards, inputs
- Integration: recording flow, playback flow

### Backend
- Pytest
- API endpoint tests
- Mock Madmom for unit tests

### E2E (Post-MVP)
- Playwright
- Critical flows: record → analyze → practice

---

## 10. Deployment

### Frontend
- Vercel (preferred) o Netlify
- Preview deployments for PRs

### Backend
- Railway / Render (Python support)
- Docker container
- Scales with demand

### Storage
- Cloudflare R2 (S3-compatible, cheaper)
- o AWS S3

---

*Last updated: 2026-05-29*