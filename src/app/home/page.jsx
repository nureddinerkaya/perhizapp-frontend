"use client";

import { useEffect, useState, useRef } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind } from "@/app/home/analyzer";

export default function FoodNLPPage() {
  const [foodList, setFoodList] = useState([]);
  const [lines, setLines] = useState([{ text: "", selected: null, done: false }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  // Fetch food list on mount
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  const analyzeInput = (val) => {
    const matches = fuzzyFind(foodList, val);
    setSuggestions(matches);
  };

  const debouncedAnalyze = useRef();
  useEffect(() => {
    debouncedAnalyze.current = debounce(analyzeInput, 400);
    return () => debouncedAnalyze.current.cancel();
  }, [foodList]);

  function handleChange(index, val) {
    setLines((prev) => {
      const arr = [...prev];
      arr[index].text = val;
      arr[index].selected = null;
      return arr;
    });
    setActiveIndex(index);
    if (debouncedAnalyze.current) debouncedAnalyze.current(val);
  }

  function handleSelect(item) {
    setLines((prev) => {
      const arr = [...prev];
      arr[activeIndex].text = item.name;
      arr[activeIndex].selected = item;
      return arr;
    });
    setSuggestions([]);
  }

  function finalizeLine(index) {
    const line = lines[index];
    const matches = fuzzyFind(foodList, line.text);
    const food = line.selected || (matches && matches[0]);
    if (!food) return;
    const amt = extractAmount(line.text, food.portion);
    const text = `${food.name} - ${amt} g`;
    setLines((prev) => {
      const arr = [...prev];
      arr[index] = { text, selected: food, amount: amt, done: true };
      if (index === prev.length - 1) arr.push({ text: "", selected: null, done: false });
      return arr;
    });
    setActiveIndex(index + 1);
    setSuggestions([]);
  }

  function handleKeyDown(index, e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
      finalizeLine(index);
    }
  }

  const finalized = lines.filter((l) => l.done);

  return (
    <div className="flex gap-8 p-4">
      <div className="flex-1">
        {lines.map((line, idx) => (
          <div key={idx} className="relative mb-2">
            {line.done ? (
              <div className="p-2 border rounded bg-gray-50">{line.text}</div>
            ) : (
              <>
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={() => setActiveIndex(idx)}
                  className="w-full border rounded p-2"
                  placeholder="Bir besin yazın"
                />
                {activeIndex === idx && suggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
                    {suggestions.map((item) => (
                      <li
                        key={item.name}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onMouseDown={() => handleSelect(item)}
                      >
                        {item.name}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="w-72">
        {finalized.length ? (
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Besin</th>
                <th className="text-right py-1">Miktar(g)</th>
                <th className="text-right py-1">kcal</th>
              </tr>
            </thead>
            <tbody>
              {finalized.map((l, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="pr-2">{l.selected.name}</td>
                  <td className="text-right pr-2">{l.amount}</td>
                  <td className="text-right">{(l.selected.calorie * l.amount / 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">Henüz bir besin eklenmedi.</p>
        )}
      </div>
    </div>
  );
}
