import { fftRadix2 } from './fft'

export interface Chord {
  start: number
  end: number
  root: string
  quality: string
  confidence: number
}

export interface AnalysisResult {
  chords: Chord[]
  key: string
  tempo: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Análisis sobre señal decimada: los acordes viven por debajo de ~2 kHz, así
// que bajar a ~11 kHz reduce el cómputo ~4x sin perder información útil.
const TARGET_RATE = 11025
const FRAME_SIZE = 4096
const HOP_SIZE = 2048
const MIN_FREQ = 55 // ~A1
const MAX_FREQ = 2000

// Exponente de afilado del chroma: concentra la energía en los picos
// dominantes y separa las notas del acorde del leakage espectral.
const CHROMA_SHARPEN = 2

// Radio (en frames) del filtro mediana temporal del chroma. Con hop ~0.186 s,
// radio 3 ≈ ventana de ~1.3 s: aplana transitorios sin tragarse cambios reales.
const CHROMA_MEDIAN_RADIUS = 3

// Estados del modelo: 12 mayores + 12 menores + "sin acorde".
const MAJOR_INTERVALS = [0, 4, 7]
const MINOR_INTERVALS = [0, 3, 7]
const NO_CHORD = 24
const N_STATES = 25

// Bonus a los acordes diatónicos del tono estimado (prior de tonalidad).
const KEY_BIAS = 0.1

// Perfiles de Krumhansl-Schmuckler para estimación de tonalidad.
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

// ---------------------------------------------------------------------------
// Utilidades de audio
// ---------------------------------------------------------------------------

export function downmixToMono(audioBuffer: AudioBuffer): Float32Array {
  const channels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  if (channels === 1) return audioBuffer.getChannelData(0).slice()

  const mono = new Float32Array(length)
  for (let ch = 0; ch < channels; ch++) {
    const data = audioBuffer.getChannelData(ch)
    for (let i = 0; i < length; i++) mono[i] += data[i]
  }
  for (let i = 0; i < length; i++) mono[i] /= channels
  return mono
}

/** Decima la señal a ~TARGET_RATE con un filtro box anti-aliasing previo. */
function decimate(samples: Float32Array, srcRate: number): { data: Float32Array; rate: number } {
  const factor = Math.max(1, Math.round(srcRate / TARGET_RATE))
  if (factor === 1) return { data: samples, rate: srcRate }

  const outLen = Math.floor(samples.length / factor)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    let sum = 0
    const base = i * factor
    for (let j = 0; j < factor; j++) sum += samples[base + j]
    out[i] = sum / factor
  }
  return { data: out, rate: srcRate / factor }
}

// ---------------------------------------------------------------------------
// Espectro
// ---------------------------------------------------------------------------

interface SpectralData {
  mags: Float32Array[]
  energies: Float32Array // energía total por frame (para el gate de silencio)
  times: number[]
  rate: number
  tuning: number // desviación de afinación en semitonos, [-0.5, 0.5]
}

/** Calcula la magnitud espectral por frame y estima la afinación global. */
function computeSpectra(
  samples: Float32Array,
  rate: number,
  onProgress?: (f: number) => void
): SpectralData {
  const re = new Float32Array(FRAME_SIZE)
  const im = new Float32Array(FRAME_SIZE)
  const half = FRAME_SIZE / 2

  const hann = new Float32Array(FRAME_SIZE)
  for (let i = 0; i < FRAME_SIZE; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)))
  }

  const binFreq = new Float32Array(half)
  for (let k = 0; k < half; k++) binFreq[k] = (k * rate) / FRAME_SIZE

  const mags: Float32Array[] = []
  const times: number[] = []
  const energyList: number[] = []
  let tuneSum = 0
  let tuneWeight = 0

  const totalFrames = Math.max(1, Math.floor((samples.length - FRAME_SIZE) / HOP_SIZE) + 1)
  let frameIdx = 0

  for (let start = 0; start + FRAME_SIZE <= samples.length; start += HOP_SIZE) {
    for (let i = 0; i < FRAME_SIZE; i++) {
      re[i] = samples[start + i] * hann[i]
      im[i] = 0
    }
    fftRadix2(re, im)

    const mag = new Float32Array(half)
    let energy = 0
    for (let k = 1; k < half; k++) {
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k])
      mag[k] = m
      const f = binFreq[k]
      if (f >= MIN_FREQ && f <= MAX_FREQ) energy += m
    }
    mags.push(mag)
    times.push(start / rate)
    energyList.push(energy)

    // Acumula desviación de afinación con los bins más fuertes.
    for (let k = 1; k < half; k++) {
      const f = binFreq[k]
      if (f < MIN_FREQ || f > MAX_FREQ) continue
      const m = mag[k]
      if (m <= 1e-4) continue
      const midi = 69 + 12 * Math.log2(f / 440)
      const frac = midi - Math.round(midi)
      tuneSum += frac * m
      tuneWeight += m
    }

    frameIdx++
    if (onProgress && (frameIdx & 15) === 0) onProgress((frameIdx / totalFrames) * 0.7)
  }

  let tuning = tuneWeight > 0 ? tuneSum / tuneWeight : 0
  tuning = Math.max(-0.5, Math.min(0.5, tuning))

  return { mags, energies: Float32Array.from(energyList), times, rate, tuning }
}

/**
 * Chroma (12 clases) por frame: cada bin aporta su magnitud a su clase de pitch
 * (corregida por afinación). Luego se afila por potencia para separar las notas
 * del acorde del leakage espectral, y se normaliza por suma para que los scores
 * de emisión sean fracciones de energía interpretables.
 */
function chromaFromMag(mag: Float32Array, rate: number, tuning: number): number[] {
  const chroma = new Array(12).fill(0)
  const half = mag.length

  for (let k = 1; k < half; k++) {
    const f = (k * rate) / FRAME_SIZE
    if (f < MIN_FREQ || f > MAX_FREQ) continue
    const m = mag[k]
    if (m <= 1e-5) continue
    const midi = 69 + 12 * Math.log2(f / 440) - tuning
    const pc = ((Math.round(midi) % 12) + 12) % 12
    chroma[pc] += m
  }

  let sum = 0
  for (let i = 0; i < 12; i++) {
    chroma[i] = Math.pow(chroma[i], CHROMA_SHARPEN)
    sum += chroma[i]
  }
  if (sum > 1e-12) {
    for (let i = 0; i < 12; i++) chroma[i] /= sum
  }
  return chroma
}

/** Mediana temporal por clase de pitch sobre una ventana ±radius, renormalizada
 *  por suma. Robusta a frames atípicos (ataques, notas de paso). */
function medianFilterChroma(chromas: number[][], radius: number): number[][] {
  const n = chromas.length
  if (radius < 1 || n === 0) return chromas
  const out: number[][] = new Array(n)
  const window: number[] = []
  for (let t = 0; t < n; t++) {
    const v = new Array(12)
    let sum = 0
    for (let pc = 0; pc < 12; pc++) {
      window.length = 0
      const lo = Math.max(0, t - radius)
      const hi = Math.min(n - 1, t + radius)
      for (let k = lo; k <= hi; k++) window.push(chromas[k][pc])
      window.sort((a, b) => a - b)
      const m = window[window.length >> 1]
      v[pc] = m
      sum += m
    }
    if (sum > 1e-12) for (let pc = 0; pc < 12; pc++) v[pc] /= sum
    out[t] = v
  }
  return out
}

// ---------------------------------------------------------------------------
// Emisión y Viterbi
// ---------------------------------------------------------------------------

/**
 * Puntuación [0,1] de cada estado para un vector de chroma (ya normalizado por
 * suma). El score es la fracción de energía en las notas del acorde. Si el
 * frame es silencio, gana "sin acorde".
 */
function emissionScores(chroma: number[], isSilent: boolean, keyBias?: Float32Array | null): Float32Array {
  const scores = new Float32Array(N_STATES)
  if (isSilent) {
    scores[NO_CHORD] = 1
    return scores
  }

  for (let root = 0; root < 12; root++) {
    let maj = 0
    for (const iv of MAJOR_INTERVALS) maj += chroma[(root + iv) % 12]
    let min = 0
    for (const iv of MINOR_INTERVALS) min += chroma[(root + iv) % 12]
    // Prior de tonalidad: bonus a los acordes diatónicos del tono estimado.
    // Resuelve ambigüedades maj/min (p.ej. power chords sin tercera) a favor
    // de la función que toca en esa tonalidad.
    scores[root] = maj + (keyBias ? keyBias[root] : 0)
    scores[root + 12] = min + (keyBias ? keyBias[root + 12] : 0)
  }

  // "Sin acorde" gana solo si ninguna tríada concentra suficiente energía.
  scores[NO_CHORD] = 0.4
  return scores
}

/** Bonus por estado (24) según los acordes diatónicos de la tonalidad. La tónica
 *  recibe algo más. Devuelve null si no hay tono fiable. */
function buildKeyBias(key: string): Float32Array | null {
  const minor = key.endsWith('m')
  const tonic = NOTE_NAMES.indexOf(minor ? key.slice(0, -1) : key)
  if (tonic < 0) return null
  // Grados de la escala mayor relativa y la cualidad de su tríada.
  const majorRoot = minor ? (tonic + 3) % 12 : tonic
  // Para Do mayor: C(maj) Dm Em F(maj) G(maj) Am Bdim → estados.
  const degrees: Array<[number, 'maj' | 'min']> = [
    [0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min'],
  ]
  const bias = new Float32Array(N_STATES)
  for (const [deg, q] of degrees) {
    const root = (majorRoot + deg) % 12
    bias[q === 'maj' ? root : root + 12] = KEY_BIAS
  }
  // Refuerza la tónica del modo real (tónica menor en tonos menores).
  bias[minor ? tonic + 12 : tonic] += KEY_BIAS
  return bias
}

/** Decodificación Viterbi sobre los 25 estados con transiciones suaves. */
function viterbiDecode(emissions: Float32Array[]): number[] {
  const T = emissions.length
  if (T === 0) return []

  const logSelf = Math.log(0.94)
  const logSwitch = Math.log(0.06 / (N_STATES - 1))
  const eps = 1e-9
  // Ganancia que amplifica el contraste de emisión entre acordes, para que
  // segmentos cortos puedan superar la rigidez de las transiciones. Más baja =
  // más inercia = menos parpadeo entre acordes vecinos.
  const EMISSION_GAIN = 4

  const logE = (t: number, s: number) => EMISSION_GAIN * Math.log(emissions[t][s] + eps)

  let prev = new Float64Array(N_STATES)
  const ptr: Int8Array[] = []
  for (let s = 0; s < N_STATES; s++) prev[s] = logE(0, s) + Math.log(1 / N_STATES)

  for (let t = 1; t < T; t++) {
    const curr = new Float64Array(N_STATES)
    const back = new Int8Array(N_STATES)
    for (let s = 0; s < N_STATES; s++) {
      let bestVal = -Infinity
      let bestPrev = 0
      for (let p = 0; p < N_STATES; p++) {
        const val = prev[p] + (p === s ? logSelf : logSwitch)
        if (val > bestVal) {
          bestVal = val
          bestPrev = p
        }
      }
      curr[s] = bestVal + logE(t, s)
      back[s] = bestPrev
    }
    ptr.push(back)
    prev = curr
  }

  let last = 0
  let bestVal = -Infinity
  for (let s = 0; s < N_STATES; s++) {
    if (prev[s] > bestVal) {
      bestVal = prev[s]
      last = s
    }
  }

  const path = new Array(T)
  path[T - 1] = last
  for (let t = T - 2; t >= 0; t--) {
    path[t] = ptr[t][path[t + 1]]
  }
  return path
}

function stateToChord(state: number): { root: string; quality: string } | null {
  if (state === NO_CHORD) return null
  const root = state % 12
  const quality = state < 12 ? 'major' : 'minor'
  return { root: NOTE_NAMES[root], quality }
}

// ---------------------------------------------------------------------------
// Tonalidad y tempo
// ---------------------------------------------------------------------------

function estimateKey(globalChroma: number[]): string {
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length
  const chromaMean = mean(globalChroma)

  // Correlación de Pearson entre el chroma global y el perfil rotado.
  const pearson = (profile: number[], offset: number) => {
    const pMean = mean(profile)
    let num = 0
    let dc = 0
    let dp = 0
    for (let i = 0; i < 12; i++) {
      const a = globalChroma[i] - chromaMean
      const b = profile[(i - offset + 12) % 12] - pMean
      num += a * b
      dc += a * a
      dp += b * b
    }
    return num / (Math.sqrt(dc * dp) + 1e-9)
  }

  let bestScore = -Infinity
  let bestKey = 'C'
  for (let t = 0; t < 12; t++) {
    const maj = pearson(KRUMHANSL_MAJOR, t)
    if (maj > bestScore) {
      bestScore = maj
      bestKey = NOTE_NAMES[t]
    }
    const min = pearson(KRUMHANSL_MINOR, t)
    if (min > bestScore) {
      bestScore = min
      bestKey = NOTE_NAMES[t] + 'm'
    }
  }
  return bestKey
}

function estimateTempo(mags: Float32Array[], rate: number): number {
  if (mags.length < 4) return 120

  // Función de novedad espectral (flujo positivo entre frames).
  const novelty = new Float32Array(mags.length)
  for (let t = 1; t < mags.length; t++) {
    let flux = 0
    const a = mags[t]
    const b = mags[t - 1]
    for (let k = 1; k < a.length; k++) {
      const d = a[k] - b[k]
      if (d > 0) flux += d
    }
    novelty[t] = flux
  }

  const frameRate = rate / HOP_SIZE
  let bestBpm = 120
  let bestCorr = -Infinity
  for (let bpm = 60; bpm <= 180; bpm++) {
    const lag = Math.round((60 * frameRate) / bpm)
    if (lag < 1 || lag >= novelty.length) continue
    let corr = 0
    for (let t = lag; t < novelty.length; t++) corr += novelty[t] * novelty[t - lag]
    if (corr > bestCorr) {
      bestCorr = corr
      bestBpm = bpm
    }
  }
  return bestBpm
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

function buildChords(
  path: number[],
  emissions: Float32Array[],
  times: number[],
  hopTime: number
): Chord[] {
  const chords: Chord[] = []
  let i = 0
  while (i < path.length) {
    const state = path[i]
    let j = i
    let scoreSum = 0
    while (j < path.length && path[j] === state) {
      scoreSum += emissions[j][state]
      j++
    }

    const info = stateToChord(state)
    if (info) {
      const avg = scoreSum / (j - i)
      chords.push({
        start: times[i],
        end: (times[j - 1] ?? times[i]) + hopTime,
        root: info.root,
        quality: info.quality,
        confidence: Math.max(0.5, Math.min(0.99, 0.45 + avg)),
      })
    }
    i = j
  }
  return chords
}

// Consolidación de la salida.
const MERGE_GAP = 4.0 // s: huecos de "sin acorde" más cortos se rellenan uniendo iguales
const MIN_CHORD_DUR = 0.6 // s: segmentos más cortos se absorben en el vecino

/** Une acordes iguales separados por huecos cortos y absorbe micro-segmentos,
 *  para no mostrar un tramo sostenido troceado ni parpadeos de un frame. */
function coalesceChords(chords: Chord[]): Chord[] {
  if (chords.length === 0) return chords

  const sameMerge = (list: Chord[]): Chord[] => {
    const out: Chord[] = []
    for (const c of list) {
      const last = out[out.length - 1]
      if (last && last.root === c.root && last.quality === c.quality && c.start - last.end <= MERGE_GAP) {
        last.end = c.end
        last.confidence = Math.max(last.confidence, c.confidence)
      } else {
        out.push({ ...c })
      }
    }
    return out
  }

  let list = sameMerge(chords)

  let changed = true
  while (changed) {
    changed = false
    const out: Chord[] = []
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      if (c.end - c.start < MIN_CHORD_DUR) {
        if (out.length) {
          out[out.length - 1].end = c.end // el acorde anterior absorbe el corto
          changed = true
          continue
        } else if (i + 1 < list.length) {
          list[i + 1].start = c.start // el primero, lo absorbe el siguiente
          changed = true
          continue
        }
      }
      out.push(c)
    }
    list = sameMerge(out)
  }
  return list
}

/**
 * Pipeline completo y puro (sin AudioBuffer): mono samples → decimación →
 * espectro → chroma → Viterbi → acordes, tonalidad y tempo. Pensado para
 * ejecutarse dentro de un Web Worker.
 */
export function analyzeAudio(
  samples: Float32Array,
  sampleRate: number,
  onProgress?: (fraction: number) => void
): AnalysisResult {
  const { data, rate } = decimate(samples, sampleRate)
  const spectra = computeSpectra(data, rate, onProgress)

  // Umbral de silencio: 5% de la mediana de energía de los frames.
  const sortedEnergies = Float32Array.from(spectra.energies).sort()
  const medianEnergy = sortedEnergies[sortedEnergies.length >> 1] ?? 0
  const silenceThreshold = medianEnergy * 0.05

  // 1) Chroma por frame + marca de silencio.
  const rawChromas: number[][] = []
  const silentFlags: boolean[] = []
  const globalChroma = new Array(12).fill(0)
  for (let t = 0; t < spectra.mags.length; t++) {
    const silent = spectra.energies[t] < silenceThreshold
    const chroma = chromaFromMag(spectra.mags[t], spectra.rate, spectra.tuning)
    if (!silent) {
      for (let i = 0; i < 12; i++) globalChroma[i] += chroma[i]
    }
    rawChromas.push(chroma)
    silentFlags.push(silent)
  }

  // 2) Filtro mediana temporal del chroma: aplana transitorios (ataques de
  //    rasgueo, notas de paso) que hacían parpadear el acorde frame a frame.
  const smooth = medianFilterChroma(rawChromas, CHROMA_MEDIAN_RADIUS)

  // 3) Tono (de la pasada global) → prior diatónico para las emisiones.
  const key = estimateKey(globalChroma)
  const keyBias = buildKeyBias(key)

  // 4) Emisiones.
  const emissions: Float32Array[] = []
  for (let t = 0; t < smooth.length; t++) {
    emissions.push(emissionScores(smooth[t], silentFlags[t], keyBias))
    if (onProgress && (t & 31) === 0) {
      onProgress(0.7 + (t / smooth.length) * 0.25)
    }
  }

  const path = viterbiDecode(emissions)
  const hopTime = HOP_SIZE / spectra.rate
  const chords = coalesceChords(buildChords(path, emissions, spectra.times, hopTime))

  const tempo = estimateTempo(spectra.mags, spectra.rate)

  if (onProgress) onProgress(1)
  return { chords, key, tempo }
}
