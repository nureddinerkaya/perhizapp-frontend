"use client";
import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/home/analyzer";

export default function WordEditorPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const [results, setResults] = useState("");
  const [panelTop, setPanelTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const textareaRef = useRef(null);
  const resultsRef = useRef(null);
  const debouncedAnalyze = useRef(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && containerHeight === 0) {
      setContainerHeight(window.innerHeight * 0.8);
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text]);

  function adjustHeight() {
    if (!textareaRef.current || !resultsRef.current) return;
    const base = window.innerHeight * 0.8;
    const needed = Math.max(
      textareaRef.current.scrollHeight,
      resultsRef.current.scrollHeight
    ) + 32;
    setContainerHeight((h) => Math.max(h, Math.max(base, needed)));
  }

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

  function analyzeLine(line, lineIndex) {
    setResults((prevResults) => {
      const resultLines = prevResults.split("\n");
      const matches = fuzzyFind(foodList, line);
      if (matches && matches.length) {
        const item = matches[0];
        const amt = extractAmount(line, item.portion);
        resultLines[lineIndex] = `${formatNumber(amt)} gram, ${formatNumber(item.calorie * amt / 100)} kcal, ${formatNumber(item.protein * amt / 100)} g protein, ${formatNumber(item.carb * amt / 100)} g karbonhidrat, ${formatNumber(item.fiber * amt / 100)} g lif`;
      } else {
        resultLines[lineIndex] = "";
      }
      return resultLines.join("\n");
    });
  }

  function analyzeAllLines(text) {
    const lines = text.split("\n");
    const resultLines = lines.map((line) => {
      if (!line.trim()) return "";
      const matches = fuzzyFind(foodList, line);
      if (matches && matches.length) {
        const item = matches[0];
        const amt = extractAmount(line, item.portion);
        return `${formatNumber(amt)} gram, ${formatNumber(item.calorie * amt / 100)} kcal, ${formatNumber(item.protein * amt / 100)} g protein, ${formatNumber(item.carb * amt / 100)} g karbonhidrat, ${formatNumber(item.fiber * amt / 100)} g lif`;
      } else {
        return "";
      }
    });
    setResults(resultLines.join("\n"));
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

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    const textarea = e.target;
    const { selectionStart, value } = textarea;
    const before = value.slice(0, selectionStart);
    const lineIndex = before.split("\n").length - 1;
    const lines = value.split("\n");
    const currLine = lines[lineIndex] || "";
    // Sadece değişen satırı analiz et
    analyzeLine(currLine, lineIndex);
    updatePanelPosition(textarea);
    if (debouncedAnalyze.current) {
      const currLine = updatePanelPosition(e.target);
      if (currLine.trim() !== "") {
        debouncedAnalyze.current(currLine);
      }
    }
    adjustHeight();
  }

  function handleKeyDown(e) {
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
        lines[lineIndex] = phrase;
      }
      // Alt satıra geçmek için ilgili yere boş satır ekle
      lines.splice(lineIndex + 1, 0, "");
      const newText = lines.join("\n");
      setText(newText);
      // Sadece güncellenen satırları analiz et
      analyzeLine(lines[lineIndex], lineIndex);
      analyzeLine("", lineIndex + 1);
      adjustHeight();
      requestAnimationFrame(() => {
        // İmleci yeni satıra konumlandır
        const pos = lines.slice(0, lineIndex + 2).join("\n").length + 1;
        textarea.selectionStart = textarea.selectionEnd = pos;
        setPanelTop((lineIndex + 2) * lineHeight - textarea.scrollTop);
      });
    }
  }

  return (
    <div className="flex justify-center items-center p-8 bg-gray-100 min-h-screen">
      <div className="relative flex w-full justify-center">
        <div
          className="bg-white w-full max-w-[1100px] min-h-[80vh] h-auto shadow p-8 flex flex-row gap-4"
          style={{ minHeight: containerHeight }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            style={{ minHeight: containerHeight, height: 'auto', overflowY: 'auto', resize: 'none' }}
            className="w-1/3 outline-none p-2 bg-white"
          />
          <textarea
            ref={resultsRef}
            value={results}
            readOnly
            style={{ minHeight: containerHeight, height: 'auto', overflowY: 'auto', resize: 'none' }}
            className="w-2/3 outline-none p-2 bg-white text-gray-700"
          />
        </div>
      </div>
    </div>
  );
}
