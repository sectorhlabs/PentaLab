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

// Estados del modelo: 12 mayores + 12 menores + "sin acorde".
const MAJOR_INTERVALS = [0, 4, 7]
const MINOR_INTERVALS = [0, 3, 7]
const NO_CHORD = 24
const N_STATES = 25

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

// ---------------------------------------------------------------------------
// Emisión y Viterbi
// ---------------------------------------------------------------------------

/**
 * Puntuación [0,1] de cada estado para un vector de chroma (ya normalizado por
 * suma). El score es la fracción de energía en las notas del acorde. Si el
 * frame es silencio, gana "sin acorde".
 */
function emissionScores(chroma: number[], isSilent: boolean): Float32Array {
  const scores = new Float32Array(N_STATES)
  if (isSilent) {
    scores[NO_CHORD] = 1
    return scores
  }

  for (let root = 0; root < 12; root++) {
    let maj = 0
    for (const iv of MAJOR_INTERVALS) maj += chroma[(root + iv) % 12]
    scores[root] = maj

    let min = 0
    for (const iv of MINOR_INTERVALS) min += chroma[(root + iv) % 12]
    scores[root + 12] = min
  }

  // "Sin acorde" gana solo si ninguna tríada concentra suficiente energía.
  scores[NO_CHORD] = 0.4
  return scores
}

/** Decodificación Viterbi sobre los 25 estados con transiciones suaves. */
function viterbiDecode(emissions: Float32Array[]): number[] {
  const T = emissions.length
  if (T === 0) return []

  const logSelf = Math.log(0.9)
  const logSwitch = Math.log(0.1 / (N_STATES - 1))
  const eps = 1e-9
  // Ganancia que amplifica el contraste de emisión entre acordes, para que
  // segmentos cortos puedan superar la rigidez de las transiciones.
  const EMISSION_GAIN = 6

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

  const emissions: Float32Array[] = []
  const globalChroma = new Array(12).fill(0)
  for (let t = 0; t < spectra.mags.length; t++) {
    const silent = spectra.energies[t] < silenceThreshold
    const chroma = chromaFromMag(spectra.mags[t], spectra.rate, spectra.tuning)
    if (!silent) {
      for (let i = 0; i < 12; i++) globalChroma[i] += chroma[i]
    }
    emissions.push(emissionScores(chroma, silent))
    if (onProgress && (t & 31) === 0) {
      onProgress(0.7 + (t / spectra.mags.length) * 0.25)
    }
  }

  const path = viterbiDecode(emissions)
  const hopTime = HOP_SIZE / spectra.rate
  const chords = buildChords(path, emissions, spectra.times, hopTime)

  const key = estimateKey(globalChroma)
  const tempo = estimateTempo(spectra.mags, spectra.rate)

  if (onProgress) onProgress(1)
  return { chords, key, tempo }
}

/** Atajo para uso directo con un AudioBuffer (corre en el hilo que lo llame). */
export function extractChordsFromAudioBuffer(audioBuffer: AudioBuffer): Chord[] {
  return analyzeAudio(downmixToMono(audioBuffer), audioBuffer.sampleRate).chords
}

export async function decodeAudio(blob: Blob, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  return audioContext.decodeAudioData(arrayBuffer)
}

export function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const dataLength = audioBuffer.length * blockAlign
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) channels.push(audioBuffer.getChannelData(i))

  let offset = 44
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
