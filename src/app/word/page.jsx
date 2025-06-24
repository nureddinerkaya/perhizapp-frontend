"use client";
import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind } from "@/app/home/analyzer";

export default function WordEditorPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const debouncedProcess = useRef(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    debouncedProcess.current = debounce((val) => {
      const processed = processText(val);
      setText(processed);
    }, 400);
    return () => debouncedProcess.current && debouncedProcess.current.cancel();
  }, [foodList]);

  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  function processText(val) {
    const lines = val.split("\n");
    const lastIndex = lines.length - 1;
    const rawLine = lines[lastIndex].replace(/\s*\([^)]*\)\s*$/, "");
    const matches = fuzzyFind(foodList, rawLine);
    if (matches && matches.length) {
      const item = matches[0];
      const amount = extractAmount(rawLine, item.portion);
      lines[lastIndex] = `${rawLine} (${formatNumber(amount)} gram, ${formatNumber(item.calorie * amount / 100)} kcal, ${formatNumber(item.protein * amount / 100)} g protein, ${formatNumber(item.carb * amount / 100)} g karbonhidrat, ${formatNumber(item.fiber * amount / 100)} g lif)`;
    } else {
      lines[lastIndex] = rawLine;
    }
    return lines.join("\n");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debouncedProcess.current) debouncedProcess.current.cancel();
      const processed = processText(text);
      setText(processed + "\n");
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    if (debouncedProcess.current) debouncedProcess.current(val);
  }

  return (
    <div className="flex justify-center p-8 bg-gray-100 min-h-screen">
      <div className="bg-white w-[595px] min-h-[842px] shadow p-8">
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full outline-none resize-none"
        />
      </div>
    </div>
  );
}
