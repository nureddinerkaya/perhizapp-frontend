"use client";
import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import getCaretCoordinates from "textarea-caret-position";
import { fuzzyFind, extractAmount, detectUnit } from "@/app/home/analyzer";

export default function FoodLoggerPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef(null);
  const debouncedAnalyze = useRef(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    debouncedAnalyze.current = debounce(analyzeCurrentLine, 300);
    return () => debouncedAnalyze.current && debouncedAnalyze.current.cancel();
  }, [foodList]);

  function analyzeCurrentLine(line) {
    const matches = fuzzyFind(foodList, line);
    setSuggestions(matches);
    setActiveIndex(0);
  }

  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    const textarea = e.target;
    const { selectionStart } = textarea;
    const before = val.slice(0, selectionStart);
    const line = before.split("\n").pop();
    const coords = getCaretCoordinates(textarea, selectionStart);
    const rect = textarea.getBoundingClientRect();
    setDropdownPos({ top: coords.top + rect.top + 20, left: coords.left + rect.left });
    if (debouncedAnalyze.current) debouncedAnalyze.current(line);
  }

  function selectSuggestion(item) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart } = textarea;
    const before = text.slice(0, selectionStart);
    const after = text.slice(selectionStart);
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);

    const amt = extractAmount(currentLine, item.portion);
    const unit = detectUnit(currentLine);
    let phrase = "";
    if (unit === "gram") {
      phrase = `${formatNumber(amt)} gram ${item.name}`;
    } else {
      let portionVal = amt / (item.portion || 100);
      portionVal = Number.isInteger(portionVal) ? portionVal : portionVal.toFixed(2);
      phrase = `${portionVal} porsiyon ${item.name}`;
    }

    const newText = text.slice(0, lineStart) + phrase + after;
    setText(newText);
    const pos = lineStart + phrase.length;
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = pos;
    });
    setSuggestions([]);
  }

  function handleKeyDown(e) {
    if (suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((activeIndex + 1) % suggestions.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((activeIndex - 1 + suggestions.length) % suggestions.length);
        return;
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
      const textarea = textareaRef.current;
      const val = textarea.value;
      const before = val.slice(0, textarea.selectionStart);
      const lines = val.split("\n");
      const lineIndex = before.split("\n").length - 1;
      const rawLine = lines[lineIndex];
      const matches = fuzzyFind(foodList, rawLine);
      if (matches && matches.length) {
        const item = matches[0];
        const amt = extractAmount(rawLine, item.portion);
        const unit = detectUnit(rawLine);
        let phrase = "";
        if (unit === "gram") {
          phrase = `${formatNumber(amt)} gram ${item.name}`;
        } else {
          let portionVal = amt / (item.portion || 100);
          portionVal = Number.isInteger(portionVal) ? portionVal : portionVal.toFixed(2);
          phrase = `${portionVal} porsiyon ${item.name}`;
        }
        const nutrition = `${formatNumber(amt)} gram, ${formatNumber(item.calorie * amt / 100)} kcal, ${formatNumber(item.protein * amt / 100)} g protein, ${formatNumber(item.carb * amt / 100)} g karbonhidrat, ${formatNumber(item.fiber * amt / 100)} g lif`;
        lines[lineIndex] = `${phrase} (${nutrition})`;
      }
      const newText = lines.join("\n") + "\n";
      setText(newText);
      requestAnimationFrame(() => {
        const pos = lines.slice(0, lineIndex + 1).join("\n").length + 1;
        textarea.selectionStart = textarea.selectionEnd = pos;
      });
      setSuggestions([]);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Food Logger</h1>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Yediklerinizi her satıra yazın"
          className="w-full border rounded p-2 font-mono leading-6 resize-none"
          rows={12}
        />
        {suggestions.length > 0 && (
          <ul
            className="absolute z-10 bg-white border rounded shadow max-h-60 overflow-y-auto w-64"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {suggestions.map((item, idx) => (
              <li
                key={item.name}
                className={`p-2 cursor-pointer ${idx === activeIndex ? "bg-gray-200" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(item);
                }}
              >
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
