/// <reference lib="webworker" />
import { analyzeAudio, type AnalysisResult } from '../lib/audioProcessor'

export interface ChordWorkerRequest {
  samples: Float32Array
  sampleRate: number
}

export type ChordWorkerResponse =
  | { type: 'progress'; value: number }
  | { type: 'result'; result: AnalysisResult }
  | { type: 'error'; message: string }

self.onmessage = (e: MessageEvent<ChordWorkerRequest>) => {
  const { samples, sampleRate } = e.data
  try {
    const result = analyzeAudio(samples, sampleRate, (value) => {
      const msg: ChordWorkerResponse = { type: 'progress', value }
      self.postMessage(msg)
    })
    const msg: ChordWorkerResponse = { type: 'result', result }
    self.postMessage(msg)
  } catch (err) {
    const msg: ChordWorkerResponse = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(msg)
  }
}
