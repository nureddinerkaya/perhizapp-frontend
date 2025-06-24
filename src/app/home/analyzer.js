import Fuse from "fuse.js";

//EXAMPLE foodList FORMAT
/*
  {
    "dana beyin (pismis)": {
    "name": "Dana Beyin (Pişmiş)",
        "calorie": 127,
        "protein": 10.67,
        "carb": 0.99,
        "fat": 8.96,
        "fiber": 0.0,
        "portion": 125.0
  },
    "nachos": {
    "name": "Nachos",
        "calorie": 317,
        "protein": 5.21,
        "carb": 41.76,
        "fat": 14.47,
        "fiber": 3.41,
        "portion": 81.0
  },
    "tadim ceviz i̇ci": {
    "name": "Tadım Ceviz İçi",
        "calorie": 600,
        "protein": 16.5,
        "carb": 8.0,
        "fat": 55.8,
        "fiber": 14.4,
        "portion": 80.0
  },
*/

export function normalizeInput(input) {
  return input
      ?.toString()
      .trim()
      .toLowerCase()
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/â/g, "a")
      .replace(/î/g, "i")
      .replace(/û/g, "u");
}

// Fuzzy find using Fuse.js: returns up to `limit` matching food items
export function fuzzyFind(foodList, input, limit = 5, tokenScoreThreshold = 0.3) {
  const normalizedInput = normalizeInput(input);
  if (!normalizedInput || !foodList || normalizedInput.length < 2) return [];

  const foodsArray = Array.isArray(foodList)
      ? foodList.map((item) => ({
          ...item,
          normalizedName: normalizeInput(item.name),
        }))
      : Object.values(foodList).map((item) => ({
          ...item,
          normalizedName: normalizeInput(item.name),
        }));

  const fuse = new Fuse(foodsArray, {
    keys: ["normalizedName"],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

// Split the normalized input into tokens (words)
const tokens = normalizedInput.split(/\s+/).filter(Boolean);

// Helper to get all 2- and 3-word combinations from tokens
function getCombinations(arr, comboLength) {
  const results = [];
  for (let i = 0; i <= arr.length - comboLength; i++) {
    results.push(arr.slice(i, i + comboLength).join(" "));
  }
  return results;
}

// Get all 2- and 3-word combinations
const twoWordCombos = getCombinations(tokens, 2);
const threeWordCombos = getCombinations(tokens, 3);

// Filter tokens: keep only those where the best match score is below the threshold
const filteredTokens = tokens.filter((t) => {
  const res = fuse.search(t);
  const top = res.length ? res[0].score : 1;
  return top <= tokenScoreThreshold;
});

// Build the search queries: filtered tokens, 2-word, 3-word combos, and full input
const searchQueries = [
  ...(filteredTokens.length ? [filteredTokens.join(" ")] : []),
  ...twoWordCombos,
  ...threeWordCombos,
  normalizedInput,
].filter(Boolean);

// Perform fuzzy search for each query, collect all results
let allResults = [];
for (const query of searchQueries) {
  const res = fuse.search(query);
  allResults = allResults.concat(res);
}

// Permütasyon işlemi: filteredTokens üzerinde, 2-4 kelime arası ise permütasyonları oluştur ve arama yap
if (filteredTokens.length > 1 && filteredTokens.length <= 3) {
  function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const perms = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const perm of getPermutations(rest)) {
        perms.push([arr[i], ...perm]);
      }
    }
    return perms;
  }
  const perms = getPermutations(filteredTokens).map(p => p.join(" "));
  const permQuerySet = new Set(perms);
  for (const query of permQuerySet) {
    const res = fuse.search(query);
    allResults = allResults.concat(res);
  }
}

// Sort all results by score ascending, remove duplicates by item name
const seen = new Set();
const uniqueSortedResults = allResults
  .sort((a, b) => a.score - b.score)
  .filter((r) => {
    if (seen.has(r.item.name)) return false;
    seen.add(r.item.name);
    return true;
  });

// In non-production, log the top 10 matches and their scores for debugging
if (process.env.NODE_ENV !== "production" && uniqueSortedResults.length) {
  console.log(
    "Top matches:",
    uniqueSortedResults
      .slice(0, 10)
      .map((r) => `${r.item.name} (score: ${r.score})`)
      .join(", ")
  );
}

  return uniqueSortedResults.slice(0, limit).map((r) => r.item);
}

// Extract amount: looks for a number in the input, returns it, or defaults to 100
export function extractAmount(input) {
  if (!input) return 100;
  const match = input.match(/(\d+([\.,]\d+)?)/);
  if (match) {
    // Replace comma with dot for decimal numbers
    return parseFloat(match[0].replace(",", "."));
  }
  return 100;
}
