export type Rng = () => number

export function seededRandom(seed: number): Rng {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const previous = result[i]!
    result[i] = result[j]!
    result[j] = previous
  }
  return result
}
