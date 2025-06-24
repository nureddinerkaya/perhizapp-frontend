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
export function fuzzyFind(foodList, input, limit = 5, tokenScoreThreshold = 0.4) {
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

  const tokens = normalizedInput.split(/\s+/).filter(Boolean);
  const filteredTokens = tokens.filter((t) => {
    const res = fuse.search(t);
    const top = res.length ? res[0].score : 1;
    return top <= tokenScoreThreshold;
  });
  const searchQuery = filteredTokens.length ? filteredTokens.join(" ") : normalizedInput;

  const results = fuse.search(searchQuery);
  if (process.env.NODE_ENV !== "production" && results.length) {
    console.log(
      "Top matches:",
      results
        .slice(0, 10)
        .map((r) => `${r.item.name} (score: ${r.score})`)
        .join(", ")
    );
  }

  return results
    .filter((r) => r.score <= 0.4)
    .slice(0, limit)
    .map((r) => r.item);
}

// Extract amount: looks for a number in the input, returns it, or defaults to 100
export function extractAmount(input, portion = 100) {
  if (!input) return portion;

  let text = input.toString().toLowerCase();

  // common fraction words
  text = text.replace(/yarım/g, "0.5");
  text = text.replace(/çeyrek/g, "0.25");

  // convert simple fractions like 1/2 or 3/4 to decimals
  text = text.replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => {
    const num = parseFloat(a);
    const denom = parseFloat(b);
    return denom ? (num / denom).toString() : _;
  });

  const numberMatch = text.match(/(\d+(?:[\.,]\d+)?)/);
  const amount = numberMatch
    ? parseFloat(numberMatch[0].replace(",", "."))
    : 1;

  const normalized = text.replace(/[.]/g, " ");

  const gramRegex = /\b\d*(?:\s*)?(?:gr|gram)\.?\b/;
  const kiloRegex = /\b\d*(?:\s*)?(?:kg|kilo|kilogram)\.?\b/;
  const portionRegex = /adet|dilim|kaşık|çorba kaşığı|tatlı kaşığı|yemek kaşığı|çay kaşığı|kepçe|tabak|porsiyon|bardak|çay bardağı|su bardağı|kutu|şişe|paket|parça/;

  if (kiloRegex.test(normalized)) {
    return amount * 1000;
  }

  if (gramRegex.test(normalized)) {
    return amount;
  }

  if (portionRegex.test(normalized) || numberMatch) {
    return amount * portion;
  }

  return portion;
}
