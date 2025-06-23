"use client";

import { useEffect, useState } from "react";

// Helper: Simple normalization and amount parsing
function normalize(text) {
  return text
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\w\sğüşıöç]/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
}

// Helper: Very basic fuzzy search (improve with fuse.js if needed)
function fuzzyFind(foodList, input) {
  const nInput = normalize(input);
  // First try exact includes
  let found = foodList.find(f => nInput.includes(normalize(f.name)));
  if (found) return found;
  // Otherwise try partial match (split by space and check all words)
  for (let f of foodList) {
    let fname = normalize(f.name);
    if (
        fname.split(" ").some(word => nInput.includes(word)) ||
        nInput.split(" ").some(word => fname.includes(word))
    ) {
      return f;
    }
  }
  return null;
}

// Helper: Amount parser, tries to find numbers (grams, adet, etc)
function extractAmount(sentence) {
  // e.g., "150 gram tavuk göğüsü" or "2 dilim ekmek"
  let match = sentence.match(/(\d+([.,]\d+)?)/);
  if (!match) return 100; // default to 100g
  return parseFloat(match[1].replace(",", "."));
}

export default function FoodNLPPage() {
  const [foodList, setFoodList] = useState([]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [amount, setAmount] = useState(100);

  useEffect(() => {
    // Fetch on mount
    fetch("http://localhost:8080/api/food/getAll")
        .then((res) => res.json())
        .then((data) => setFoodList(data));
  }, []);

  function handleAnalyze() {
    if (!foodList.length) return;

    // Find food
    const food = fuzzyFind(foodList, input);
    // Find amount (default 100g)
    const amt = extractAmount(input);
    setAmount(amt);
    if (food) {
      setResult(food);
    } else {
      setResult(null);
    }
  }

  return (
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">PerhizApp Food NLP</h1>

        <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Yediğinizi yazın: örn. 150 gram tavuk göğüsü"
            className="w-full border rounded p-2 mb-3"
        />

        <button
            onClick={handleAnalyze}
            className="bg-blue-600 text-white rounded px-4 py-2 mb-4"
        >
          Analyze
        </button>

        {result ? (
            <div className="p-4 rounded shadow bg-white">
              <h2 className="text-xl font-semibold mb-2">{result.name}</h2>
              <div className="mb-1">Amount: <b>{amount}</b> g (shown per entered amount)</div>
              <ul>
                <li>Calories: {(result.calorie * amount / 100).toFixed(1)} kcal</li>
                <li>Protein: {(result.protein * amount / 100).toFixed(1)} g</li>
                <li>Carb: {(result.carb * amount / 100).toFixed(1)} g</li>
                <li>Fat: {(result.fat * amount / 100).toFixed(1)} g</li>
                <li>Fiber: {(result.fiber * amount / 100).toFixed(1)} g</li>
                {/* add other fields if needed */}
              </ul>
            </div>
        ) : (
            input && (
                <div className="p-4 rounded bg-red-100 text-red-700">
                  No matching food found!
                </div>
            )
        )}
      </div>
  );
}
