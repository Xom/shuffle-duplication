import { describe, it, expect } from 'vitest';
import { createHaystack, randomNeedles } from 'shuffle-duplication';

function combination(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - k + i) / i;
  }
  return result;
}

describe('urn sampling without replacement', () => {
  it('matches the hypergeometric distribution', () => {
    const trials = 100000;

    // counts[k] = number of trials with k red marbles drawn
    const counts = [0, 0, 0, 0];

    for (let seed = 0; seed < trials; seed++) {
      const haystack = createHaystack(seed);

      // 3 red marbles, 5 white marbles
      //
      // Using arbitrary needle IDs:
      // 2 = red
      // 3 = white
      const weights = {
        2: 3,
        3: 5,
      };

      const draw = randomNeedles(haystack, weights, 3, false);

      let redCount = 0;
      for (const marble of draw) {
        if (marble === '2') {
          redCount++;
        }
      }

      counts[redCount]++;
    }

    // Exact hypergeometric probabilities:
    //
    // P(k reds) =
    //   C(3, k) * C(5, 3-k) / C(8, 3)

    const totalWays = combination(8, 3);

    const expectedProbabilities = [
      combination(3, 0) * combination(5, 3) / totalWays,
      combination(3, 1) * combination(5, 2) / totalWays,
      combination(3, 2) * combination(5, 1) / totalWays,
      combination(3, 3) * combination(5, 0) / totalWays,
    ];

    // Roughly 5 standard deviations for binomial noise
    for (let k = 0; k <= 3; k++) {
      const expected = trials * expectedProbabilities[k];
      const variance =
        trials *
        expectedProbabilities[k] *
        (1 - expectedProbabilities[k]);

      const stddev = Math.sqrt(variance);

      const tolerance = 5 * stddev;

      const diff = Math.abs(counts[k] - expected);

      // console.log([
      //   `k=${k}`,
      //   `observed=${counts[k]}`,
      //   `expected=${expected}`,
      //   `tolerance=${tolerance}`,
      //   `counts=${JSON.stringify(counts)}`,
      // ].join(' | '));

      expect(
        diff,
        [
          `k=${k}`,
          `observed=${counts[k]}`,
          `expected=${expected}`,
          `tolerance=${tolerance}`,
          `counts=${JSON.stringify(counts)}`,
        ].join(' | ')
      ).toBeLessThanOrEqual(tolerance);
    }
  });
});
