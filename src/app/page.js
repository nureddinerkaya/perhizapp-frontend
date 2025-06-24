"use client";

import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { fuzzyFind, extractAmount } from "@/app/home/analyzer";

export default function Home() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const [infos, setInfos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestTop, setSuggestTop] = useState(0);
  const textareaRef = useRef(null);
  const debouncedAnalyze = useRef(null);
  const debouncedSuggest = useRef(null);
  const lineHeight = 24;

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    debouncedAnalyze.current = debounce(analyzeAllLines, 300);
    debouncedSuggest.current = debounce(doSuggest, 300);
    return () => {
      debouncedAnalyze.current && debouncedAnalyze.current.cancel();
      debouncedSuggest.current && debouncedSuggest.current.cancel();
    };
  }, [foodList]);

  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  function getInfo(line) {
    if (!line.trim()) return null;
    const matches = fuzzyFind(foodList, line);
    if (!matches.length) return null;
    const item = matches[0];
    const amt = extractAmount(line, item.portion);
    return {
      line,
      name: item.name,
      amount: formatNumber(amt),
      calorie: formatNumber((item.calorie * amt) / 100),
      protein: formatNumber((item.protein * amt) / 100),
      carb: formatNumber((item.carb * amt) / 100),
    };
  }

  function analyzeAllLines(val) {
    const lines = val.split("\n");
    const newInfos = lines.map((l) => getInfo(l));
    setInfos(newInfos);
  }

  function doSuggest(word) {
    if (!word || word.length < 2) {
      setSuggestions([]);
      return;
    }
    const matches = fuzzyFind(foodList, word, 5);
    setSuggestions(matches);
  }

  function getCurrentWord(value, pos) {
    const before = value.slice(0, pos);
    const match = before.match(/([\wğüşıöçĞÜŞİÖÇ]+)$/i);
    return match ? match[1] : "";
  }

  function updateSuggestionPos(textarea) {
    const { selectionStart, scrollTop, value } = textarea;
    const before = value.slice(0, selectionStart);
    const lineIndex = before.split("\n").length - 1;
    setSuggestTop(lineIndex * lineHeight - scrollTop + lineHeight);
  }

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    if (debouncedAnalyze.current) debouncedAnalyze.current(val);
    updateSuggestionPos(e.target);
    const word = getCurrentWord(val, e.target.selectionStart);
    if (debouncedSuggest.current) debouncedSuggest.current(word);
  }

  function handleSelectSuggestion(item) {
    const textarea = textareaRef.current;
    const pos = textarea.selectionStart;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const word = getCurrentWord(before, before.length);
    const newBefore = before.slice(0, before.length - word.length) + item.name;
    const newText = newBefore + after;
    setText(newText);
    analyzeAllLines(newText);
    textarea.focus();
    const newPos = newBefore.length;
    textarea.setSelectionRange(newPos, newPos);
    setSuggestions([]);
  }

  function renderHighlighted() {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const info = infos[idx];
      return (
        <div key={idx} className="whitespace-pre-wrap">
          {line}
          {info && (
            <span className="ml-1 whitespace-nowrap">
              (<span className="text-red-600">{info.calorie}</span> kcal,{' '}
              <span className="text-green-600">{info.protein}g</span> protein,{' '}
              <span className="text-blue-600">{info.carb}g</span> karbonhidrat)
            </span>
          )}
        </div>
      );
    });
  }

  return (
    <div className="flex h-screen divide-x">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="relative h-full font-mono">
          <div className="absolute inset-0 p-2 whitespace-pre-wrap pointer-events-none text-black">
            {renderHighlighted()}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full p-2 resize-none bg-transparent text-transparent caret-black outline-none"
          />
          {suggestions.length > 0 && (
            <ul
              className="absolute left-2 bg-white border rounded shadow text-sm z-10"
              style={{ top: suggestTop }}
            >
              {suggestions.map((s) => (
                <li
                  key={s.name}
                  className="px-2 py-1 cursor-pointer hover:bg-gray-200"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(s);
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="w-1/2 p-4 overflow-y-auto">
        <ul className="space-y-2 font-mono">
          {infos.map((info, idx) =>
            info ? (
              <li key={idx} className="whitespace-nowrap">
                <span className="font-semibold">{info.name}</span> - {info.amount}
                g (<span className="text-red-600">{info.calorie} kcal</span>,{' '}
                <span className="text-green-600">{info.protein}g protein</span>,{' '}
                <span className="text-blue-600">{info.carb}g karbonhidrat</span>)
              </li>
            ) : null
          )}
        </ul>
      </div>
    </div>
  );
}

