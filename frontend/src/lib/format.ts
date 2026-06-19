/** Segundos → `m:ss` (p. ej. 75 → "1:15"). */
export const formatTime = (s: number): string =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
