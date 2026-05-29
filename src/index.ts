import { createPcg32, randomInt } from 'pcg'
import type { PCGState } from 'pcg'

import type { Haystack, NeedleState, RandomResult, WeightMap } from './types'

const negExpQuantile = (p: number): number => Math.log(1 - p) // returns a negative number

const MAX_R = 2 ** 32
const INV_R = 2 ** -32

const randomFloat = (pcgState: PCGState): RandomResult<number> => {
  const [value, nextState] = randomInt(0, MAX_R, pcgState)
  return [value * INV_R, nextState]
}

const randomNegExp = (pcgState: PCGState): NeedleState => {
  const [value, nextState] = randomInt(0, MAX_R, pcgState)
  return [negExpQuantile(value * INV_R), nextState]
}

export const createHaystack = (seed: bigint | number | string): Haystack => ({
  seed,
  needles: {},
})

export const randomNeedle = (
  haystack: Haystack,
  weights: WeightMap
): string | null => {
  const { seed, needles } = haystack

  // First, we calculate the projections and find the nearest to 0.
  const projections: Record<string, number> = {}
  let bestId: string | null = null
  for (const [needleId, weight] of Object.entries(weights)) {
    if (!(weight > 0)) {
      continue
    }
    if (!needles[needleId]) {
      needles[needleId] = randomNegExp(createPcg32({}, seed, needleId))
    }
    projections[needleId] = needles[needleId][0] / weight
    if (bestId === null || projections[needleId] > projections[bestId]) {
      bestId = needleId
    }
  }

  if (bestId === null) {
    return null // no weight was positive
  }

  // Based on the outcome, we update the haystack.
  const bestProj = projections[bestId]
  for (const [needleId, proj] of Object.entries(projections)) {
    if (needleId === bestId) {
      needles[needleId] = randomNegExp(needles[needleId][1])
    } else {
      needles[needleId][0] = (proj - bestProj) * weights[needleId]
    }
  }

  return bestId
}

export const randomNeedles = (
  haystack: Haystack,
  weights: WeightMap,
  n: number,
  withReplacement = true
): string[] => {
  if (!(n > 0)) {
    return [];
  }
  const { seed, needles } = haystack

  const projections: Record<string, number> = {}
  const result: string[] = []

  // First, we calculate the projections and find the nearest to 0.
  let bestId: string | null = null
  for (const [needleId, weight] of Object.entries(weights)) {
    if (!(weight > 0)) {
      continue
    }
    if (!needles[needleId]) {
      needles[needleId] = randomNegExp(createPcg32({}, seed, needleId))
    }
    projections[needleId] = needles[needleId][0] / weight
    if (bestId === null || projections[needleId] > projections[bestId]) {
      bestId = needleId
    }
  }

  for (let i = 0; i < n; i++) {
    if (bestId === null) {
      break
    }

    result.push(bestId)

    // If not withReplacement, update the weight. Either way, update the projections.
    let nextBestId: string | null = null
    const bestProj = projections[bestId]
    for (const needleId of Object.keys(projections)) {
      if (needleId === bestId) {
        needles[needleId] = randomNegExp(needles[needleId][1])
        if (!withReplacement) {
          weights[needleId]--
          if (!(weights[needleId] > 0)) {
            delete projections[needleId]
            continue
          }
        }
        projections[needleId] = needles[needleId][0] / weights[needleId]
      } else {
        projections[needleId] -= bestProj
      }
      if (nextBestId === null || projections[needleId] > projections[nextBestId]) {
        nextBestId = needleId
      }
    }
    bestId = nextBestId
  }

  if (result.length === 0) {
    return result
  }

  // go back to the last chosen needleId, which was overwritten by nextBestId at the end of the last loop
  bestId = result.at(-1) ?? null // The early return above already guards against result.at(-1) being undefined, but I still have to satisfy the type-checker here

  // Update the haystack.
  for (const [needleId, proj] of Object.entries(projections)) {
    if (needleId === bestId) {
      // We already did needles[needleId] = randomNegExp(needles[needleId][1])
    } else {
      // We already did projections[needleId] -= bestProj
      needles[needleId][0] = proj * weights[needleId]
    }
  }

  return result
}

// Code beyond this line is non-essential to the haystack implementation, but is useful for autochess-like games.

const reverseQuantile = (r: number, probabilities: number[]): number => {
  // The lower the roll, the higher the rarity. (Could've been the opposite, but
  // it doesn't matter as long as it's consistent. This way saves on subtraction.)
  for (let i = probabilities.length - 1; i > 0; i--) {
    const p = probabilities[i]
    if (r < p) {
      return i
    }
    r -= p
  }
  return 0 // 0 is the fallback value anyway, so we don't need to look at probabilities[0]
}

export const createRarityGenerator = (seed: bigint | number | string) => createPcg32({}, seed, 1)

export const randomRarity = (pcgState: PCGState, probabilities: number[]): RandomResult<number> => {
  const [r, nextState] = randomFloat(pcgState)
  return [reverseQuantile(r, probabilities), nextState]
}

export type {
  Haystack,
  NeedleState,
  RandomResult,
  WeightMap,
} from './types'

export type { PCGState } from 'pcg'
