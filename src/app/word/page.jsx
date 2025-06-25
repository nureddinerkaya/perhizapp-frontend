"use client";
import { useState, useRef, useEffect } from "react";
import debounce from "lodash.debounce";
import useFoodList from "@/app/useFoodList";
import { formatNumber } from "@/app/utils";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/home/analyzer";

export default function WordEditorPage() {
  const foodList = useFoodList();
  const [text, setText] = useState("");
  const [results, setResults] = useState([]); // Artık dizi
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const textareaRef = useRef(null);
  const resultsRef = useRef(null);
  const debouncedAnalyze = useRef(null);

  useEffect(() => {
    debouncedAnalyze.current = debounce((line, lineIndex) => {
      analyzeLine(line, lineIndex);
    }, 400);
    return () => debouncedAnalyze.current && debouncedAnalyze.current.cancel();
  }, [foodList]);

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



  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    const textarea = e.target;
    const { selectionStart, value } = textarea;
    const before = value.slice(0, selectionStart);
    const lineIndex = before.split("\n").length - 1;
    const lines = value.split("\n");
    const currLine = lines[lineIndex] || "";
    const matches = currLine.trim() ? fuzzyFind(foodList, currLine) : [];
    setSuggestions(matches);
    setSelectedIndex(matches.length ? 0 : -1);
    // Sonuç dizisini satır sayısına göre senkronize et
    setResults((prevResults) => {
      const arr = prevResults.slice();
      arr.length = lines.length;
      return arr;
    });
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

  function applySelection(item, lines, lineIndex) {
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
  }

  function finalizeLine(lines, lineIndex) {
    // Alt satıra geçmek için ilgili yere boş satır ekle
    lines.splice(lineIndex + 1, 0, "");
    const newText = lines.join("\n");
    setText(newText);
    // Sadece güncellenen satırları analiz et
    analyzeLine(lines[lineIndex], lineIndex);
    analyzeLine("", lineIndex + 1);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      const pos = lines.slice(0, lineIndex + 2).join("\n").length + 1;
      textarea.selectionStart = textarea.selectionEnd = pos;
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

  function handleKeyDown(e) {
    const textarea = textareaRef.current;
    const val = textarea.value;
    const before = val.slice(0, textarea.selectionStart);
    const lines = val.split("\n");
    const lineIndex = before.split("\n").length - 1;

    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((selectedIndex + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((selectedIndex - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setSelectedIndex((selectedIndex + 1) % suggestions.length);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions([]);
        setSelectedIndex(-1);
        return;
      }
      if (e.key === "Enter") {
        if (selectedIndex >= 0) {
          e.preventDefault();
          if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
          applySelection(suggestions[selectedIndex], lines, lineIndex);
          setSuggestions([]);
          setSelectedIndex(-1);
          finalizeLine(lines, lineIndex);
          return;
        }
        // else fall through to default behavior
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (debouncedAnalyze.current) debouncedAnalyze.current.cancel();
      const matches = fuzzyFind(foodList, lines[lineIndex]);
      if (matches && matches.length) {
        applySelection(matches[0], lines, lineIndex);
      }
      finalizeLine(lines, lineIndex);
    }
  }

  function handlePaste(e) {
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    if (!paste.includes('\n')) return; // Only handle multi-line paste
    e.preventDefault();
    const textarea = e.target;
    const { selectionStart, selectionEnd, value } = textarea;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const pastedLines = paste.split(/\r?\n/);
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    // Merge pasted lines into the text
    const newLines = [
      ...beforeLines.slice(0, -1),
      beforeLines[beforeLines.length - 1] + pastedLines[0],
      ...pastedLines.slice(1, -1),
      pastedLines.length > 1 ? pastedLines[pastedLines.length - 1] + afterLines[0] : afterLines[0],
      ...afterLines.slice(1)
    ];
    const newText = newLines.join('\n');
    setText(newText);
    // Sync results array
    setResults((prevResults) => {
      const arr = prevResults.slice();
      arr.length = newLines.length;
      return arr;
    });
    // Analyze only the newly pasted lines
    const startLine = beforeLines.length - 1;
    for (let i = 0; i < pastedLines.length; i++) {
      const lineIdx = startLine + i;
      const lineVal = newLines[lineIdx];
      if (lineVal && lineVal.trim() !== "") {
        analyzeLine(lineVal, lineIdx);
      } else {
        setResults((prevResults) => {
          const arr = prevResults.slice();
          arr[lineIdx] = "";
          return arr;
        });
      }
    }
    // Adjust textarea height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
      if (resultsRef.current) {
        resultsRef.current.style.height = 'auto';
        resultsRef.current.style.height = resultsRef.current.scrollHeight + 'px';
      }
    }, 0);
  }

  // Sonuç satırında kcal ifadesini sadece bold ve siyah yapan yardımcı fonksiyon
  function highlightCalories(line) {
    return line.replace(/(\d+(?:\.?\d*)?\s*kcal)/gi, '<span style="color:#000;font-weight:bold;">$1</span>');
  }

  return (
    <div className="flex justify-center items-start bg-gray-100 min-h-screen px-8"
      onMouseUp={e => {
        // Sadece textarea veya sonuçlar divi dışında bir yere tıklanırsa textarea'ya odaklan
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
          <div className="relative w-1/3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              style={{ resize: 'none' }}
              className="w-full outline-none p-2 bg-white text-xl"
            />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 z-20 bg-white border rounded shadow max-h-40 overflow-y-auto text-sm w-full">
                {suggestions.map((s, idx) => (
                  <li
                    key={s.name}
                    className={`px-2 py-1 cursor-pointer ${idx === selectedIndex ? 'bg-gray-200' : ''}`}
                    onMouseDown={e => {
                      e.preventDefault();
                      const lines = text.split('\n');
                      const before = textareaRef.current.value.slice(0, textareaRef.current.selectionStart);
                      const lineIndex = before.split('\n').length - 1;
                      applySelection(s, lines, lineIndex);
                      setSuggestions([]);
                      setSelectedIndex(-1);
                      finalizeLine(lines, lineIndex);
                    }}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div
            ref={resultsRef}
            className="w-2/3 outline-none p-2 bg-white text-gray-700 text-xl whitespace-pre-line select-text"
            style={{ minHeight: '100px' }}
            dangerouslySetInnerHTML={{
              __html: results.map(highlightCalories).join("\n")
            }}
            onMouseUp={e => {
              // Sadece tıklama ise textarea'ya odaklan, ama metin seçiliyorsa odaklanma
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
