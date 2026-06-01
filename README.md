# shuffle-duplication

Advanced shuffle duplication for autochess-likes and other games, as explained in the following article:

 - [Beyond Duplicate Bridge: Generalizing Shuffle Duplication to Autochess, Deckbuilders, and other games](https://gist.github.com/Xom/d836151a320d116936ea00203f70d46b)

## Demo

```ts
import { createHaystack, randomNeedle } from 'shuffle-duplication';
import { createPcg32, randomInt } from 'pcg';

let seedGenerator = createPcg32({}, 42, 54);

const randomUint32 = () => {
  const ret = randomInt(0, 2 ** 32, seedGenerator);
  seedGenerator = ret[1];
  return ret[0];
};

const randomUint64 = () => {
  const lo = BigInt(randomUint32());
  const hi = BigInt(randomUint32());
  return (hi << 32n) | lo;
};

const CARDS = {
  '2': 'Diana',
  '3': 'Elise',
  '4': 'Fiora',
  '5': 'Garen',
  '6': 'Maokai',
  '7': 'Nidalee',
  '8': 'Tahm Kench',
  '9': 'Twisted Fate',
  '10': 'Wukong',
  '11': 'Yasuo',
};

const seatSeeds = [];
const seatStates = [];
const seatShops = [];
for (let i = 0; i < 8; i++) {
  seatSeeds.push(randomUint64());
  seatStates.push(createHaystack(seatSeeds[i]));
  seatShops.push([]);
}

const pool = {};
for (const id of Object.keys(CARDS)) {
  pool[id] = 29;
}

for (let k = 0; k < 5; k++) {
  for (let i = 0; i < 8; i++) {
    seatShops[i].push(randomNeedle(seatStates[i], pool));
  }
  for (let i = 0; i < 8; i++) {
    pool[seatShops[i][k]]--;
  }
}

const seatShopsWithNames = [];
for (let i = 0; i < 8; i++) {
  const names = [];
  for (const id of seatShops[i]) {
    names.push(CARDS[id]);
  }
  seatShopsWithNames.push(names);
}

console.log(seatSeeds);
console.log(pool);
console.log(seatShops);
console.log(seatShopsWithNames);
```

This implements the simultaneous method of dealing cards to multiple players described in the 2026-05-29 addendum to [Beyond Duplicate Bridge](https://gist.github.com/Xom/d836151a320d116936ea00203f70d46b), which I don't actually recommend; for that purpose, use `randomNeedleFromHaystacks` instead, as described in the 2026-06-01 addendum.

## API

`createHaystack(seed) → Haystack`

 - `seed` must be an integer or bigint in \[0, 2 ** 64), or a string representation thereof, such as '42' instead of 42. For testing, any number is fine. For production, use random numbers.
 - Haystack is a state object that cleanly serializes and deserializes with JSON.stringify and JSON.parse.

`randomNeedle(haystack, weights) → needleId | null`

 - `weights` is a JS object that maps needleId to probability weight. Weight values need only be in proportion to each other, and need not sum to 1.
 - needleIds must be positive integers other than 1. But they're mostly used as object keys, so in most places, the string representation is used, including in randomNeedle's return value.
 - Pathological combinations of needleIds are possible, but you're not gonna run into one unless it's deliberate. It's fine to start at 2 and count up, as seen in the demo code.
 - This mutates the haystack.
 - This returns null if and only if no weight is positive.

`randomNeedles(haystack, weights, n, withReplacement = true) → needleId[]`

 - Same as calling randomNeedle n times, with similar performance. Use whichever is convenient.
 - If `withReplacement` is **false**, then after each needle is chosen, its weight will be decremented by 1, before choosing the next needle. In this case, the weights object will be mutated! If all weights end up non-positive, the array returned may be shorter than n.

`randomNeedleFromHaystacks(Record<string, { haystack: Haystack; weights: WeightMap }>) → [haystackId, needleId]`

 - The string key is the haystackId. See test code for usage example.
 - Explanation in the 2026-06-01 addendum to [Beyond Duplicate Bridge](https://gist.github.com/Xom/d836151a320d116936ea00203f70d46b). (In the main use case, you want the same total weight in each haystack.)

`createRarityGenerator(seed) → PCGState`

`randomRarity(pcgState, probabilities) → [number, PCGState]`

 - Not part of the haystack implementation, but may be useful for autochess-like games.
 - `shuffle-duplication` depends on `pcg`, which exports PCGState. For convenience, `shuffle-duplication` re-exports PCGState, so you can import it from either.
 - PCGState is never mutated. Like `pcg`'s `randomInt`, `randomRarity` returns a two-element array of the random outcome and the new state. Remember to store the new state over the old state!
 - `probabilities` is an array of the probabilities of each rarity. Unlike the weights, these probabilities must sum to 1. (Except that probabilities\[0] is ignored, since it's enough to read all of the other probabilities.) The number returned by `randomRarity` is the randomly-chosen index in `probabilities`.
 - needleIds shouldn't be 1 because it's reserved for internal use by these functions. As long as you abide by that restriction, you can use the same set of seeds for `createHaystack` and `createRarityGenerator`. If you don't use these functions, you can use 1 as a needleId.
 - 2026-05-29 Addendum: I'd only recommend using these functions if it's almost always advantageous to roll a higher rarity. In general, for most games, including, hypothetically, TFT, I'd recommend using the haystack instead. The same haystack can be used as long as each rarity uses a needleId that isn't used elsewhere. Think of needleId as outcomeId.
