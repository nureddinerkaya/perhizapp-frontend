"use client";
import { useState, useEffect } from "react";
import { extractAmount, fuzzyFind } from "@/app/home/analyzer";

export default function WordEditorPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const lines = text.split("\n");
      const lastLine = lines[lines.length - 1];
      const matches = fuzzyFind(foodList, lastLine);
      if (matches && matches.length) {
        const item = matches[0];
        const amount = extractAmount(lastLine, item.portion);
        const newLine = `${lastLine} (${formatNumber(amount)} gram, ${formatNumber(item.calorie * amount / 100)} kcal, ${formatNumber(item.protein * amount / 100)} g protein, ${formatNumber(item.carb * amount / 100)} g karbonhidrat, ${formatNumber(item.fiber * amount / 100)} g lif)`;
        lines[lines.length - 1] = newLine;
      }
      const updated = lines.join("\n") + "\n";
      setText(updated);
    }
  }

  return (
    <div className="flex justify-center p-8 bg-gray-100 min-h-screen">
      <div className="bg-white w-[595px] min-h-[842px] shadow p-8">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full outline-none resize-none"
        />
      </div>
    </div>
  );
}
