"use client";
import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/home/analyzer";

export default function WordEditorPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const [info, setInfo] = useState("");
  const debouncedAnalyze = useRef(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    debouncedAnalyze.current = debounce((line) => {
      analyzeLine(line);
    }, 400);
    return () => debouncedAnalyze.current && debouncedAnalyze.current.cancel();
  }, [foodList]);

  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  function analyzeLine(line) {
    const matches = fuzzyFind(foodList, line);
    if (matches && matches.length) {
      const item = matches[0];
      const amt = extractAmount(line, item.portion);
      setInfo(
        `${formatNumber(amt)} gram, ${formatNumber(item.calorie * amt / 100)} kcal, ${formatNumber(
          item.protein * amt / 100
        )} g protein, ${formatNumber(item.carb * amt / 100)} g karbonhidrat, ${formatNumber(
          item.fiber * amt / 100
        )} g lif`
      );
    } else {
      setInfo("");
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    const lines = val.split("\n");
    const lastLine = lines[lines.length - 1];
    if (debouncedAnalyze.current) debouncedAnalyze.current(lastLine);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
      const lines = text.split("\n");
      const lastIndex = lines.length - 1;
      const rawLine = lines[lastIndex];
      const matches = fuzzyFind(foodList, rawLine);
      if (matches && matches.length) {
        const item = matches[0];
        const amt = extractAmount(rawLine, item.portion);
        const unit = detectUnit(rawLine);
        let display = "";
        if (unit === "gram") {
          display = `${formatNumber(amt)} gram ${item.name}`;
        } else {
          let portionVal = amt / (item.portion || 100);
          portionVal = Number.isInteger(portionVal) ? portionVal : portionVal.toFixed(2);
          display = `${portionVal} porsiyon ${item.name}`;
        }
        lines[lastIndex] = display;
        analyzeLine(display); // update info with final line
      }
      const newText = lines.join("\n") + "\n";
      setText(newText);
    }
  }

  return (
    <div className="flex justify-center p-8 bg-gray-100 min-h-screen">
      <div className="flex">
        <div className="bg-white w-[595px] min-h-[842px] shadow p-8">
          <textarea
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none resize-none"
          />
        </div>
        <div className="ml-4 w-64 bg-white shadow p-4 h-min whitespace-pre-line">
          {info}
        </div>
      </div>
    </div>
  );
}
