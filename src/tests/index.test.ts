import { describe, expect, test } from 'vitest'

import {
  createHaystack,
  randomNeedle,
  randomNeedles,
  randomNeedleFromHaystacks,
} from '../index'

const EPSILON = 1e-12

const expectClose = (
  actual: unknown,
  expected: unknown,
  context: unknown
): void => {
  if (
    typeof actual === 'number' &&
    typeof expected === 'number'
  ) {
    expect(
      actual,
      JSON.stringify(context, null, 2)
    ).toBeCloseTo(expected, 12)

    return
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    expect(
      actual.length,
      JSON.stringify(context, null, 2)
    ).toBe(expected.length)

    for (let i = 0; i < actual.length; i++) {
      expectClose(actual[i], expected[i], context)
    }

    return
  }

  if (
    actual &&
    expected &&
    typeof actual === 'object' &&
    typeof expected === 'object'
  ) {
    const actualKeys = Object.keys(actual as object).sort()
    const expectedKeys = Object.keys(expected as object).sort()

    expect(
      actualKeys,
      JSON.stringify(context, null, 2)
    ).toEqual(expectedKeys)

    for (const key of actualKeys) {
      expectClose(
        (actual as Record<string, unknown>)[key],
                  (expected as Record<string, unknown>)[key],
                  context
      )
    }

    return
  }

  expect(
    actual,
    JSON.stringify(context, null, 2)
  ).toEqual(expected)
}

describe('randomNeedles equivalency', () => {
  test('matches repeated randomNeedle calls with replacement', () => {
    const seeds = [
      0,
      1,
      42,
      123456789,
      0xffffffff,
    ]

    const weightSets = [
      {},
      { '2': 1 },
      { '2': 1, '3': 1 },
      { '2': 5, '3': 2, '4': 9 },
      { '2': 0, '3': -1, '4': 7 },
      { '2': 0.5, '3': 1.25, '4': 10.75 },
    ]

    const counts = [0, 1, 2, 5, 20, 100]

    for (const seed of seeds) {
      for (const originalWeights of weightSets) {
        for (const n of counts) {
          const context = {
            mode: 'withReplacement',
            seed,
            originalWeights,
            n,
          }

          const haystackA = createHaystack(seed)
          const haystackB = createHaystack(seed)

          const weightsA = structuredClone(originalWeights)
          const weightsB = structuredClone(originalWeights)

          const repeated: Array<string | null> = []

          for (let i = 0; i < n; i++) {
            repeated.push(randomNeedle(haystackA, weightsA))
          }

          const bulk = randomNeedles(
            haystackB,
            weightsB,
            n,
            true
          )

          expect(
            bulk,
            JSON.stringify(context, null, 2)
          ).toEqual(repeated.filter(x => x !== null))

          expectClose(haystackB, haystackA, context)

          expect(
            weightsB,
            JSON.stringify(context, null, 2)
          ).toEqual(originalWeights)

          expect(
            weightsA,
            JSON.stringify(context, null, 2)
          ).toEqual(originalWeights)
        }
      }
    }
  })

  test('matches repeated randomNeedle calls without replacement', () => {
    const seeds = [
      0,
      1,
      42,
      123456789,
      0xffffffff,
    ]

    const weightSets = [
      {},
      { '2': 1 },
      { '2': 2, '3': 1 },
      { '2': 5, '3': 2, '4': 9 },
      { '2': 0, '3': -1, '4': 7 },
      { '2': 1.5, '3': 2.25, '4': 4.75 },
    ]

    const counts = [0, 1, 2, 5, 20, 100]

    for (const seed of seeds) {
      for (const originalWeights of weightSets) {
        for (const n of counts) {
          const context = {
            mode: 'withoutReplacement',
            seed,
            originalWeights,
            n,
          }

          const haystackA = createHaystack(seed)
          const haystackB = createHaystack(seed)

          const weightsA = structuredClone(originalWeights)
          const weightsB = structuredClone(originalWeights)

          const repeated: string[] = []

          for (let i = 0; i < n; i++) {
            const needle = randomNeedle(haystackA, weightsA)

            if (needle === null) {
              break
            }

            repeated.push(needle)

            weightsA[needle]--

            // if (!(weightsA[needle] > 0)) {
            //   delete weightsA[needle]
            // }
          }

          const bulk = randomNeedles(
            haystackB,
            weightsB,
            n,
            false
          )

          expect(
            bulk,
            JSON.stringify(context, null, 2)
          ).toEqual(repeated)

          expectClose(haystackB, haystackA, context)

          expectClose(weightsB, weightsA, context)
        }
      }
    }
  })

  test('large deterministic equivalency stress test', () => {
    for (let seed = 0; seed < 100; seed++) {
      const originalWeights: Record<string, number> = {}

      for (let i = 2; i < 50; i++) {
        originalWeights[String(i)] =
        ((seed * i * 17) % 11) + 1
      }

      const context = {
        mode: 'stress',
        seed,
        originalWeights,
        n: 500,
      }

      const haystackA = createHaystack(seed)
      const haystackB = createHaystack(seed)

      const weightsA = structuredClone(originalWeights)
      const weightsB = structuredClone(originalWeights)

      const repeated: string[] = []

      for (let i = 0; i < 500; i++) {
        const needle = randomNeedle(haystackA, weightsA)

        if (needle === null) {
          break
        }

        repeated.push(needle)
      }

      const bulk = randomNeedles(
        haystackB,
        weightsB,
        500,
        true
      )

      expect(
        bulk,
        JSON.stringify(context, null, 2)
      ).toEqual(repeated)

      expectClose(haystackB, haystackA, context)
    }
  })
})

test('randomNeedleFromHaystacks draw probabilities are proportional across haystacks', () => {
  const counts: Record<string, number> = {
    A: 0,
    B: 0,
  }

  const pool = {
    A: {
      haystack: createHaystack(123),
      weights: {
        "2": 3,
      },
    },
    B: {
      haystack: createHaystack(456),
      weights: {
        "2": 1,
        "3": 6,
      },
    },
  } // Note: In the main use case for randomNeedleFromHaystacks, you want each haystack to have an equal chance. If you wanted that here, you'd change A's weight(s) to 3/3 and B's to 1/7 and 6/7, so that each haystack has the same total weight.

  const trials = 100_000
  for (let i = 0; i < trials; i++) {
    const result = randomNeedleFromHaystacks(pool)
    expect(result).not.toBeNull()
    counts[result![0]]++
  }

  const expected = 3 / 10
  const actual = counts.A / trials

  const sigma = Math.sqrt((expected * (1 - expected)) / trials)

  expect(
    Math.abs(actual - expected),
    JSON.stringify(
      {
        counts,
        trials,
        expected,
        actual,
        sigma,
      },
      null,
      2
    )
  ).toBeLessThan(5 * sigma)
})
