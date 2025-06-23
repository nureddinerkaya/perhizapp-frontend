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

// Fuzzy find using Fuse.js: returns the best matching food item or null
export function fuzzyFind(foodList, input) {
  const normalizedInput = normalizeInput(input);
  if (!normalizedInput || !foodList) return null;

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
    threshold: 0.8,
    includeScore: true,
    ignoreLocation: true,
  });

  const results = fuse.search(normalizedInput);
  if (results.length) {
      console.log(
        "Top 10 matches:",
        results.slice(0, 10).map((r) => `${r.item.name} (score: ${r.score})`).join(", ")
      );
      return results[0].item;
  }
  return null;
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
