import Fuse from "fuse.js";

// keywords used for amounts
const portionKeywords = [
  "adet",
  "dilim",
  "kasik",
  "corba kasigi",
  "tatli kasigi",
  "yemek kasigi",
  "cay kasigi",
  "kepce",
  "tabak",
  "porsiyon",
  "bardak",
  "cay bardagi",
  "su bardagi",
  "kutu",
  "sise",
  "paket",
  "parca",
];
const gramKeywords = ["gram", "gr", "g"];
const kiloKeywords = ["kilogram", "kilo", "kg"];

function approxMatch(word, keywords) {
  const fuse = new Fuse(keywords, {
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    isCaseSensitive: false,
  });
  const res = fuse.search(word);
  if (!res.length) return false;
  const best = res[0];
  const lenDiff = Math.abs(word.length - best.item.length);
  return best.score <= 0.3 && lenDiff <= 2;
}

function stripAmountKeywords(text) {
  const cleaned = text.replace(/[.,]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((t) => {
    if (/^\d+(?:[.,]\d+)?$/.test(t)) return false;
    const mix = t.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
    if (mix) {
      if (
        approxMatch(mix[2], [
          ...portionKeywords,
          ...gramKeywords,
          ...kiloKeywords,
        ])
      ) {
        return false;
      }
      return true;
    }
    return !approxMatch(t, [
      ...portionKeywords,
      ...gramKeywords,
      ...kiloKeywords,
    ]);
  });
  return filtered.join(" ");
}

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
let cachedFoodList = null;
let cachedFoodsArray = null;
let cachedFuse = null;

export function fuzzyFind(foodList, input, limit = 5, tokenScoreThreshold = 0.3) {
  const normalizedInput = normalizeInput(input);
  if (!normalizedInput || !foodList || normalizedInput.length < 2) return [];

  const cleanedInput = stripAmountKeywords(normalizedInput);

  // Only rebuild foodsArray and Fuse if foodList changed
  if (foodList !== cachedFoodList) {
    cachedFoodsArray = Array.isArray(foodList)
      ? foodList.map((item) => ({
          ...item,
          normalizedName: normalizeInput(item.name),
        }))
      : Object.values(foodList).map((item) => ({
          ...item,
          normalizedName: normalizeInput(item.name),
        }));
    cachedFuse = new Fuse(cachedFoodsArray, {
      keys: ["normalizedName"],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    cachedFoodList = foodList;
  }
  const fuse = cachedFuse;

  // Split the cleaned input into tokens (words)
  const tokens = cleanedInput.split(/\s+/).filter(Boolean);

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
    cleanedInput,
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
export function extractAmount(input, portion = 100) {
  if (!input) return 100;
  const normalized = normalizeInput(input);

  const cleaned = normalized.replace(/[.,]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  let isGram = false;
  let isKilo = false;
  let hasHalf = false;
  let hasQuarter = false;

  for (const t of tokens) {
    if (/^\d/.test(t)) {
      const mix = t.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
      if (mix) {
        if (approxMatch(mix[2], kiloKeywords)) isKilo = true;
        else if (approxMatch(mix[2], gramKeywords)) isGram = true;
      }
    } else if (approxMatch(t, kiloKeywords)) {
      isKilo = true;
    } else if (approxMatch(t, gramKeywords)) {
      isGram = true;
    } else if (approxMatch(t, ["yarim"])) {
      hasHalf = true;
    } else if (approxMatch(t, ["ceyrek"])) {
      hasQuarter = true;
    }
  }

  let amount = null;

  const fraction = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  if (fraction) {
    amount = parseInt(fraction[1], 10) / parseInt(fraction[2], 10);
  } else {
    const num = normalized.match(/\d+(?:[.,]\d+)?/);
    if (num) {
      amount = parseFloat(num[0].replace(",", "."));
    }
  }

  if (amount === null) {
    if (hasHalf) amount = 0.5;
    else if (hasQuarter) amount = 0.25;
  }

  if (amount === null) return 100;

  if (isKilo) return amount * 1000;
  if (isGram) return amount;
  return amount * portion;
}

export function detectUnit(input) {
  if (!input) return "porsiyon";
  const normalized = normalizeInput(input);
  const cleaned = normalized.replace(/[.,]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let isGram = false;
  let isKilo = false;
  for (const t of tokens) {
    if (/^\d/.test(t)) {
      const mix = t.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
      if (mix) {
        if (approxMatch(mix[2], kiloKeywords)) isKilo = true;
        else if (approxMatch(mix[2], gramKeywords)) isGram = true;
      }
    } else if (approxMatch(t, kiloKeywords)) {
      isKilo = true;
    } else if (approxMatch(t, gramKeywords)) {
      isGram = true;
    }
  }
  return isGram || isKilo ? "gram" : "porsiyon";
}
