"use client";
import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/home/analyzer";

export default function WordEditorPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [panelTop, setPanelTop] = useState(0);
  const textareaRef = useRef(null);
  const debouncedSuggest = useRef(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    debouncedSuggest.current = debounce((line) => {
      const matches = fuzzyFind(foodList, line);
      setSuggestions(matches.slice(0, 5));
      setSelectedIndex(0);
    }, 300);
    return () => debouncedSuggest.current && debouncedSuggest.current.cancel();
  }, [foodList]);

  function formatNumber(val) {
    if (typeof val !== "number" || isNaN(val)) return "";
    if (Number.isInteger(val)) return val.toString();
    return parseFloat(val.toFixed(2)).toString();
  }

  function replaceLineWithInfo(lineIndex, rawLine, lines) {
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
  }

  const lineHeight = 24; // approximate line height in px

  function updatePanelPosition(textarea) {
    const { selectionStart, scrollTop, value } = textarea;
    const before = value.slice(0, selectionStart);
    const lineIndex = before.split("\n").length - 1;
    const currentLine = before.split("\n").pop();
    setPanelTop(lineIndex * lineHeight - scrollTop);
    return currentLine;
  }

  function replaceCurrentLineWithItem(item) {
    const textarea = textareaRef.current;
    const val = textarea.value;
    const before = val.slice(0, textarea.selectionStart);
    const lines = val.split("\n");
    const lineIndex = before.split("\n").length - 1;
    const rawLine = lines[lineIndex];
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
    lines[lineIndex] = phrase;
    const newText = lines.join("\n");
    setText(newText);
    requestAnimationFrame(() => {
      const pos = lines.slice(0, lineIndex + 1).join("\n").length;
      textarea.selectionStart = textarea.selectionEnd = pos;
      setPanelTop(lineIndex * lineHeight - textarea.scrollTop);
    });
  }

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    const currLine = updatePanelPosition(e.target);
    if (currLine.trim() === "") {
      setSuggestions([]);
    } else if (debouncedSuggest.current) {
      debouncedSuggest.current(currLine);
    }
  }

  function handleKeyDown(e) {
    const textarea = textareaRef.current;
    if (suggestions.length) {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((selectedIndex + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((selectedIndex - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = suggestions[selectedIndex];
        if (item) {
          replaceCurrentLineWithItem(item);
          setSuggestions([]);
        }
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const val = textarea.value;
      const before = val.slice(0, textarea.selectionStart);
      const lines = val.split("\n");
      const lineIndex = before.split("\n").length - 1;
      const rawLine = lines[lineIndex];
      replaceLineWithInfo(lineIndex, rawLine, lines);
      const newText = lines.join("\n") + "\n";
      setText(newText);
      requestAnimationFrame(() => {
        const pos = lines.slice(0, lineIndex + 1).join("\n").length + 1;
        textarea.selectionStart = textarea.selectionEnd = pos;
        setPanelTop((lineIndex + 1) * lineHeight - textarea.scrollTop);
      });
      setSuggestions([]);
    }
  }

  return (
    <div className="flex justify-center p-8 bg-gray-100 min-h-screen">
      <div className="relative flex">
        <div className="bg-white w-[595px] min-h-[842px] shadow p-8">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none resize-none"
          />
        </div>
        {suggestions.length > 0 && (
          <ul
            style={{ top: panelTop }}
            className="absolute left-full ml-4 w-64 bg-white shadow rounded max-h-60 overflow-y-auto z-10"
          >
            {suggestions.map((item, idx) => (
              <li
                key={item.name}
                className={`p-2 cursor-pointer ${idx === selectedIndex ? "bg-gray-200" : ""}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  replaceCurrentLineWithItem(item);
                  setSuggestions([]);
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
