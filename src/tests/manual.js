import { createHaystack, randomNeedles, createRarityGenerator, randomRarity } from 'shuffle-duplication';

const ORIGINAL_WEIGHTS = {
  '2': 200000,
  '3': 300000,
  '4': 400000,
};

const resultsWithoutSeed = {
  '2': 0,
  '3': 0,
  '4': 0,
};

const resultsWithSeed = {
  '2': 0,
  '3': 0,
  '4': 0,
};

const resultsFromRarityGenerator = {
  '2': 0,
  '3': 0,
  '4': 0,
};

const weightsWithoutSeed = structuredClone(ORIGINAL_WEIGHTS);
const weightsWithSeed = structuredClone(ORIGINAL_WEIGHTS);
const weightsForRarityGenerator = structuredClone(ORIGINAL_WEIGHTS);

for (let i = 0; i < 300000; i++) {
  let r = Math.random() * (weightsWithoutSeed['2'] + weightsWithoutSeed['3'] + weightsWithoutSeed['4']);
  if (r < weightsWithoutSeed['4']) {
    resultsWithoutSeed['4']++;
    weightsWithoutSeed['4']--;
  } else {
    r -= weightsWithoutSeed['4'];
    if (r < weightsWithoutSeed['3']) {
      resultsWithoutSeed['3']++;
      weightsWithoutSeed['3']--;
    } else {
      resultsWithoutSeed['2']++;
      weightsWithoutSeed['2']--;
    }
  }
}
console.log(resultsWithoutSeed);

for (const needleId of randomNeedles(createHaystack(0), weightsWithSeed, 300000, true)) {
  resultsWithSeed[needleId]++;
}
console.log(resultsWithSeed);

let rng = createRarityGenerator(40);
for (let i = 0; i < 300000; i++) {
  let w = [
    weightsForRarityGenerator['2'] / (weightsForRarityGenerator['2'] + weightsForRarityGenerator['3'] + weightsForRarityGenerator['4']),
    weightsForRarityGenerator['3'] / (weightsForRarityGenerator['2'] + weightsForRarityGenerator['3'] + weightsForRarityGenerator['4']),
    weightsForRarityGenerator['4'] / (weightsForRarityGenerator['2'] + weightsForRarityGenerator['3'] + weightsForRarityGenerator['4']),
  ];
  const ret = randomRarity(rng, w);
  weightsForRarityGenerator[2+ ret[0]]--;
  resultsFromRarityGenerator[2 + ret[0]]++;
  rng = ret[1];
}
console.log(resultsFromRarityGenerator);

