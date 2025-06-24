"use client";

import { useEffect, useState, useRef } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/home/analyzer";


export default function FoodNLPPage() {
  const [foodList, setFoodList] = useState([]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [amount, setAmount] = useState(100);
  const [suggestions, setSuggestions] = useState([]);

  // YENİ: foodList her değiştiğinde yeni debounce oluşturmak için ref ve useEffect kullanıyoruz
  const analyzeInput = (val) => {
    const matches = fuzzyFind(foodList, val);
    setSuggestions(matches);
    const portion = matches && matches.length ? matches[0].portion : 100;
    const amt = extractAmount(val, portion);
    setAmount(amt);
    if (matches && matches.length) {
      setResult(matches[0]);
    } else {
      setResult(null);
    }
  };

  const debouncedAnalyze = useRef();
  useEffect(() => {
    debouncedAnalyze.current = debounce(analyzeInput, 400);
    // Temizlik
    return () => debouncedAnalyze.current.cancel();
  }, [foodList]); // foodList değiştikçe yeni debounce oluştur

  function handleInputChange(e) {
    const val = e.target.value;
    setInput(val);
    if (debouncedAnalyze.current)
      debouncedAnalyze.current(val); // sadece value geç, foodList zaten closure'da güncel
  }
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
      analyzeInput(e.target.value); // direkt analiz
    }
  }

  function handleSelect(item) {
    const amt = extractAmount(input, item.portion);
    setAmount(amt);
    setResult(item);

    const unit = detectUnit(input);
    let display = "";
    if (unit === "gram") {
      display = `${amt} gram ${item.name} `;
    } else {
      let portionVal = amt / (item.portion || 100);
      portionVal = Number.isInteger(portionVal) ? portionVal : portionVal.toFixed(2);
      display = `${portionVal} porsiyon ${item.name}`;
    }
    setInput(display);
    setSuggestions([]);
  }

  // Fetch food list on mount
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

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

  // Helper to format numbers with up to 2 decimals, but no trailing zeros
  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  return (
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">PerhizApp Food NLP</h1>
        <div className="relative mb-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Yediğinizi yazın: örn. 150 gram tavuk göğüsü"
            className="w-full border rounded p-2 mb-1"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
              {suggestions.map((item) => (
                <li
                  key={item.name}
                  className="p-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSelect(item)}
                >
                  {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {result ? (
            <div className="p-4 rounded shadow bg-white">
              <h2 className="text-xl font-semibold mb-2">{result.name}</h2>
              <div className="mb-1">Miktar: {formatNumber(amount)} g</div>
              <ul>
                <li>Kalori: {formatNumber(result.calorie * amount / 100)} kcal</li>
                <li>Protein: {formatNumber(result.protein * amount / 100)} g</li>
                <li>Karbonhidrat: {formatNumber(result.carb * amount / 100)} g</li>
                <li>Yağ: {formatNumber(result.fat * amount / 100)} g</li>
                <li>Lif: {formatNumber(result.fiber * amount / 100)} g</li>
              </ul>
            </div>
        ) : (
            input && (
                <div className="p-4 rounded bg-red-100 text-red-700">
                  Eşleşen gıda bulunamadı!
                </div>
            )
        )}
      </div>
  );
}