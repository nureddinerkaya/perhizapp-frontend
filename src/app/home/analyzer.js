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
export function fuzzyFind(foodList, input, limit = 5) {
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

  const results = fuse.search(normalizedInput);
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
export function extractAmount(input) {
  if (!input) return 100;
  const match = input.match(/(\d+([\.,]\d+)?)/);
  if (match) {
    // Replace comma with dot for decimal numbers
    return parseFloat(match[0].replace(",", "."));
  }
  return 100;
}
