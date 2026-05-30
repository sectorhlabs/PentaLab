/**
 * Harness de pruebas del detector de acordes (corre en Node sobre el código vivo
 * de src/lib/audioProcessor.ts). Decodifica audio con ffmpeg o genera una señal
 * sintética, ejecuta analyzeAudio e imprime métricas de sobre-segmentación.
 *
 *   ./scripts/chords.sh path/al/audio.mp3      # un archivo
 *   ./scripts/chords.sh                         # todos los de test-audio/
 *   ./scripts/chords.sh --synth                 # progresión sintética conocida
 */
import { analyzeAudio, type AnalysisResult } from '../src/lib/audioProcessor'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

function decodeWithFfmpeg(path: string): { samples: Float32Array; rate: number } {
  const rate = 44100
  const buf = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(rate), '-f', 's16le', 'pipe:1'],
    { maxBuffer: 1 << 30 },
  )
  const n = buf.length >> 1
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(i * 2) / 32768
  return { samples, rate }
}

const C4 = 261.626 // root=0 → Do

/** Tríadas limpias (3 armónicos por nota) de `secs` cada una. */
function synth(prog: Array<[number, 'maj' | 'min']>, secs: number, rate = 44100): { samples: Float32Array; rate: number } {
  const per = Math.floor(secs * rate)
  const samples = new Float32Array(per * prog.length)
  let o = 0
  for (const [root, q] of prog) {
    const intervals = q === 'maj' ? [0, 4, 7] : [0, 3, 7]
    const freqs = intervals.map((iv) => C4 * Math.pow(2, (root + iv) / 12))
    for (let i = 0; i < per; i++) {
      let v = 0
      for (const f of freqs) {
        v += Math.sin((2 * Math.PI * f * i) / rate)
        v += 0.5 * Math.sin((2 * Math.PI * 2 * f * i) / rate)
        v += 0.25 * Math.sin((2 * Math.PI * 3 * f * i) / rate)
      }
      const env = Math.min(1, i / (rate * 0.02), (per - i) / (rate * 0.02))
      samples[o++] = (v / freqs.length / 1.75) * env * 0.9
    }
  }
  return { samples, rate }
}

/** Versión "realista": rasgueos repetidos (re-ataque cada 0.5 s con decaimiento),
 *  una melodía que cambia de nota encima y ruido de fondo. Induce parpadeo. */
function synthNoisy(prog: Array<[number, 'maj' | 'min']>, secs: number, rate = 44100): { samples: Float32Array; rate: number } {
  const per = Math.floor(secs * rate)
  const samples = new Float32Array(per * prog.length)
  const strum = Math.floor(rate * 0.5) // re-ataque cada 0.5 s
  let o = 0
  let seed = 12345
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1
  prog.forEach(([root, q], ci) => {
    const intervals = q === 'maj' ? [0, 4, 7] : [0, 3, 7]
    const freqs = intervals.map((iv) => C4 * Math.pow(2, (root + iv) / 12))
    for (let i = 0; i < per; i++) {
      const decay = Math.exp(-(i % strum) / (rate * 0.35)) // pluck que decae
      let v = 0
      for (const f of freqs) {
        v += Math.sin((2 * Math.PI * f * i) / rate)
        v += 0.5 * Math.sin((2 * Math.PI * 2 * f * i) / rate)
        v += 0.3 * Math.sin((2 * Math.PI * 3 * f * i) / rate)
      }
      v *= decay
      // melodía: una nota de la escala que salta cada 0.25 s, fuerte
      const melNote = intervals[Math.floor(i / (rate * 0.25)) % intervals.length] + 12
      const mf = C4 * Math.pow(2, (root + melNote) / 12)
      v += 1.4 * Math.sin((2 * Math.PI * mf * i) / rate) * Math.exp(-((i % (rate / 4)) / (rate * 0.18)))
      v += 0.15 * rnd() // ruido de fondo
      const env = Math.min(1, i / (rate * 0.02), (per - i) / (rate * 0.02))
      samples[o++] = (v / 5) * env
      void ci
    }
  })
  return { samples, rate }
}

function report(name: string, result: AnalysisResult, totalDur: number, ms: number) {
  const { chords, key, tempo } = result
  const durs = chords.map((c) => c.end - c.start).sort((a, b) => a - b)
  const median = durs.length ? durs[durs.length >> 1] : 0
  const mean = durs.length ? durs.reduce((s, d) => s + d, 0) / durs.length : 0
  const short = durs.filter((d) => d < 0.4).length
  const vshort = durs.filter((d) => d < 0.25).length
  const perMin = totalDur > 0 ? (chords.length / totalDur) * 60 : 0

  console.log(`\n━━━ ${name} ━━━`)
  console.log(`audio: ${fmt(totalDur)}  ·  análisis: ${ms} ms  ·  tono ${key}  ·  ${tempo} BPM`)
  console.log(
    `acordes: ${chords.length}  ·  ${perMin.toFixed(1)}/min  ·  ` +
      `dur seg media ${mean.toFixed(2)}s mediana ${median.toFixed(2)}s  ·  ` +
      `cortos <0.4s: ${short}  <0.25s: ${vshort}`,
  )
  // Secuencia compacta (hasta 60 para no inundar).
  const label = (r: string, q: string) => `${r}${q === 'minor' ? 'm' : ''}`
  const seq = chords
    .slice(0, 60)
    .map((c) => `${fmt(c.start)} ${label(c.root, c.quality)}`)
    .join('  ')
  console.log(seq + (chords.length > 60 ? `  …(+${chords.length - 60})` : ''))
}

function run(name: string, input: { samples: Float32Array; rate: number }) {
  const totalDur = input.samples.length / input.rate
  const t0 = process.hrtime.bigint()
  const result = analyzeAudio(input.samples, input.rate)
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  report(name, result, totalDur, Math.round(ms))
}

const args = process.argv.slice(2)

const PROG: Array<[number, 'maj' | 'min']> = [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']]

if (args.includes('--synth') || args.includes('--noisy')) {
  // C - G - Am - F, 4 s por acorde (esperado: 4 acordes, no decenas).
  if (args.includes('--synth')) run('SYNTH limpio C-G-Am-F (4s c/u)', synth(PROG, 4))
  if (args.includes('--noisy')) run('SYNTH realista C-G-Am-F (4s c/u, rasgueo+melodía+ruido)', synthNoisy(PROG, 4))
} else {
  const files = args.length
    ? args
    : (existsSync('test-audio') ? readdirSync('test-audio') : [])
        .filter((f) => /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.test(f))
        .map((f) => join('test-audio', f))

  if (!files.length) {
    console.log('Sin audios. Usa: ./scripts/chords.sh <archivo>  |  --synth  |  pon archivos en test-audio/')
    process.exit(0)
  }
  for (const f of files) {
    try {
      run(basename(f), decodeWithFfmpeg(f))
    } catch (e) {
      console.error(`Error con ${f}:`, (e as Error).message)
    }
  }
}
