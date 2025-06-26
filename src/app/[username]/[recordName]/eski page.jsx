"use client";
import { useState, useRef, useEffect } from "react";
import debounce from "lodash.debounce";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/analyzer";
import { useParams } from "next/navigation";
import { getBasicAuthHeader } from "@/app/utils";

export default function WordEditorPage() {
  const [foodList, setFoodList] = useState([]);
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [panelTop, setPanelTop] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const resultsRef = useRef(null);
  const debouncedAnalyze = useRef(null);
  const params = useParams();

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then((data) => setFoodList(data));
  }, []);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    if (params?.username && params?.recordName) {
      setLoading(true);
      setError("");
      fetch(`${baseUrl}/api/records/getRecord/${params.username}`, {
        headers: getBasicAuthHeader(),
      })
        .then(async (res) => {
          const text = await res.text();
          if (!text) throw new Error("Kayıt bulunamadı veya boş yanıt.");
          let arr;
          try {
            arr = JSON.parse(text);
          } catch (e) {
            throw new Error("Geçersiz JSON formatı.");
          }
          // Dizi içinden username ve name eşleşen kaydı bul
          const record = Array.isArray(arr)
            ? arr.find(
                (item) =>
                  item.username === params.username &&
                  item.name === params.recordName
              )
            : null;
          if (!record) throw new Error("Kayıt bulunamadı.");
          setText(record.foods || record.data || "");
          setResults([]); // results alanı yok, boş başlat
        })
        .catch((err) => {
          setText("");
          setResults([]);
          setError(err.message || "Kayıt yüklenemedi.");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [params?.username, params?.recordName]);

  useEffect(() => {
    debouncedAnalyze.current = debounce((line, lineIndex) => {
      analyzeLine(line, lineIndex);
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
      const resultLines = prevResults.slice();
      const matches = fuzzyFind(foodList, line);
      if (matches && matches.length) {
        const item = matches[0];
        const amt = extractAmount(line, item.portion);
        resultLines[lineIndex] = `${formatNumber(amt)} g, ${formatNumber(item.calorie * amt / 100)} kcal, ${formatNumber(item.protein * amt / 100)} g protein, ${formatNumber(item.carb * amt / 100)} g karbonhidrat, ${formatNumber(item.fiber * amt / 100)} g lif`;
      } else {
        resultLines[lineIndex] = "";
      }
      return resultLines;
    });
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
    setResults((prevResults) => {
      const arr = prevResults.slice();
      arr.length = lines.length;
      return arr;
    });
    updatePanelPosition(textarea);
    if (debouncedAnalyze.current) {
      if (currLine.trim() !== "") {
        debouncedAnalyze.current(currLine, lineIndex);
      } else {
        setResults((prevResults) => {
          const arr = prevResults.slice();
          arr[lineIndex] = "";
          return arr;
        });
      }
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
    if (resultsRef.current) {
      resultsRef.current.style.height = 'auto';
      resultsRef.current.style.height = resultsRef.current.scrollHeight + 'px';
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
      const textarea = textareaRef.current;
      const val = textarea.value;
      const atEnd = textarea.selectionStart === val.length;
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
      lines.splice(lineIndex + 1, 0, "");
      const newText = lines.join("\n");
      setText(newText);
      analyzeLine(lines[lineIndex], lineIndex);
      analyzeLine("", lineIndex + 1);
      requestAnimationFrame(() => {
        const pos = lines.slice(0, lineIndex + 2).join("\n").length + 1;
        textarea.selectionStart = textarea.selectionEnd = pos;
        setPanelTop((lineIndex + 2) * lineHeight - textarea.scrollTop);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
        if (resultsRef.current) {
          resultsRef.current.style.height = 'auto';
          resultsRef.current.style.height = resultsRef.current.scrollHeight + 'px';
        }
      });
    }
  }

  function highlightCalories(line) {
    return line.replace(/(\d+(?:\.?\d*)?\s*kcal)/gi, '<span style="color:#000;font-weight:bold;">$1</span>');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start bg-gray-100 min-h-screen px-8"
      onMouseUp={e => {
        if (
          textareaRef.current &&
          e.target !== textareaRef.current &&
          e.target !== resultsRef.current &&
          window.getSelection && window.getSelection().toString().length === 0
        ) {
          e.preventDefault();
          textareaRef.current.focus();
        }
      }}
    >
      <div className="relative flex w-full justify-center">
        <div className="bg-white w-full max-w-[1100px] min-h-screen h-auto shadow p-8 flex flex-row gap-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            style={{ resize: 'none' }}
            className="w-1/3 outline-none p-2 bg-white text-xl"
          />
          <div
            ref={resultsRef}
            className="w-2/3 outline-none p-2 bg-white text-gray-700 text-xl whitespace-pre-line select-text"
            style={{ minHeight: '100px' }}
            dangerouslySetInnerHTML={{
              __html: results.map(highlightCalories).join("\n")
            }}
            onMouseUp={e => {
              if (window.getSelection && window.getSelection().toString().length === 0) {
                if (textareaRef.current) textareaRef.current.focus();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
