"use client";

import { useEffect, useState, useRef } from "react";
import debounce from "lodash.debounce";
import {extractAmount, fuzzyFind} from "@/app/home/analyzer";


export default function FoodNLPPage() {
  const [foodList, setFoodList] = useState([]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [amount, setAmount] = useState(100);

  // YENİ: foodList her değiştiğinde yeni debounce oluşturmak için ref ve useEffect kullanıyoruz
  const analyzeInput = (val) => {
    const food = fuzzyFind(foodList, val);
    const amt = extractAmount(val);
    setAmount(amt);
    if (food) {
      setResult(food);
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

  // Fetch food list on mount
  useEffect(() => {
    fetch("http://localhost:8080/api/food/getAll")
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

  return (
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">PerhizApp Food NLP</h1>
        <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Yediğinizi yazın: örn. 150 gram tavuk göğüsü"
            className="w-full border rounded p-2 mb-3"
        />
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