import type { PCGState } from 'pcg'

export type NeedleState = [value: number, nextState: PCGState]

export type Haystack = {
  seed: bigint | number | string
  needles: Record<string, NeedleState>
}

export type WeightMap = Record<string, number>

export type RandomResult<T> = [value: T, nextState: PCGState]
