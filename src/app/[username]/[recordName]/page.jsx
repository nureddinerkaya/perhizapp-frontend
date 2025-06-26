"use client";
import { useState, useRef, useEffect } from "react";
import debounce from "lodash.debounce";
import useFoodList from "@/app/useFoodList";
import { formatNumber } from "@/app/utils";
import { extractAmount, fuzzyFind, detectUnit } from "@/app/analyzer";
import { useParams } from "next/navigation";

export default function WordEditorPage() {
  const params = useParams();
  const foodList = useFoodList();
  const [text, setText] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [password, setPassword] = useState("");
  const [results, setResults] = useState([]); // Artık dizi
  const [lineValues, setLineValues] = useState([]); // per line numeric results
  const [totals, setTotals] = useState({
    gram: 0,
    kcal: 0,
    protein: 0,
    carb: 0,
    fiber: 0,
  });
  const textareaRef = useRef(null);
  const resultsRef = useRef(null);
  const debouncedAnalyze = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUser(localStorage.getItem("username") || "");
      setPassword(localStorage.getItem("password") || "");
    }
  }, []);

  useEffect(() => {
    function handleStorage() {
      setAuthUser(localStorage.getItem("username") || "");
      setPassword(localStorage.getItem("password") || "");
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function getAuthHeaders() {
    if (!authUser || !password) return {};
    return { Authorization: `Basic ${btoa(`${authUser}:${password}`)}` };
  }

  function adjustTotals(delta) {
    setTotals((t) => ({
      gram: t.gram + (delta.gram || 0),
      kcal: t.kcal + (delta.kcal || 0),
      protein: t.protein + (delta.protein || 0),
      carb: t.carb + (delta.carb || 0),
      fiber: t.fiber + (delta.fiber || 0),
    }));
  }

  // Suggestion dropdown state
  const [suggestions, setSuggestions] = useState([]); // Array of food items
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1); // -1: none
  const [suggestionLine, setSuggestionLine] = useState(-1); // Which line suggestions are for

  useEffect(() => {
    debouncedAnalyze.current = debounce((line, lineIndex) => {
      analyzeLine(line, lineIndex);
      // Suggestion logic: only if line is not empty
      if (line.trim() !== "") {
        const matches = fuzzyFind(foodList, line, 5);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
        setSelectedSuggestion(-1);
        setSuggestionLine(lineIndex);
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedSuggestion(-1);
        setSuggestionLine(-1);
      }
    }, 400);
    return () => debouncedAnalyze.current && debouncedAnalyze.current.cancel();
  }, [foodList]);

  // Yuvarlama yardımcı fonksiyonu
  function roundNumber(val) {
    return Math.round(val);
  }

  function analyzeLine(line, lineIndex) {
    const matches = fuzzyFind(foodList, line);
    let lineResult = null;
    let display = "";
    if (matches && matches.length) {
      const item = matches[0];
      const amt = extractAmount(line, item.portion);
      lineResult = {
        gram: amt,
        kcal: (item.calorie * amt) / 100,
        protein: (item.protein * amt) / 100,
        carb: (item.carb * amt) / 100,
        fiber: (item.fiber * amt) / 100,
      };
      display = `${roundNumber(amt)} g, ${roundNumber(lineResult.kcal)} kcal, ${roundNumber(lineResult.protein)} g protein, ${roundNumber(lineResult.carb)} g karbonhidrat, ${roundNumber(lineResult.fiber)} g lif`;
    }

    setResults((prevResults) => {
      const resultLines = prevResults.slice();
      resultLines[lineIndex] = display;
      return resultLines;
    });

    setLineValues((prev) => {
      const arr = prev.slice();
      const prevVal = arr[lineIndex];
      if (prevVal) {
        adjustTotals({
          gram: -prevVal.gram,
          kcal: -prevVal.kcal,
          protein: -prevVal.protein,
          carb: -prevVal.carb,
          fiber: -prevVal.fiber,
        });
      }
      if (lineResult) {
        adjustTotals(lineResult);
        arr[lineIndex] = lineResult;
      } else {
        arr[lineIndex] = null;
      }
      return arr;
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
    // Sonuç dizisini satır sayısına göre senkronize et
    setResults((prevResults) => {
      const arr = prevResults.slice();
      arr.length = lines.length;
      return arr;
    });
    setLineValues((prev) => {
      const arr = prev.slice();
      if (lines.length < arr.length) {
        for (let i = lines.length; i < arr.length; i++) {
          const val = arr[i];
          if (val) {
            adjustTotals({
              gram: -val.gram,
              kcal: -val.kcal,
              protein: -val.protein,
              carb: -val.carb,
              fiber: -val.fiber,
            });
          }
        }
      }
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
        setLineValues((prev) => {
          const arr = prev.slice();
          if (arr[lineIndex]) {
            adjustTotals({
              gram: -arr[lineIndex].gram,
              kcal: -arr[lineIndex].kcal,
              protein: -arr[lineIndex].protein,
              carb: -arr[lineIndex].carb,
              fiber: -arr[lineIndex].fiber,
            });
          }
          arr[lineIndex] = null;
          return arr;
        });
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedSuggestion(-1);
        setSuggestionLine(-1);
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
    // Suggestion menu navigation
    if (showSuggestions && suggestions.length > 0 && suggestionLine >= 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        return;
      }
      if (e.key === "Enter" && selectedSuggestion >= 0) {
        e.preventDefault();
        // Insert suggestion into current line
        const textarea = textareaRef.current;
        const val = textarea.value;
        const lines = val.split("\n");
        const item = suggestions[selectedSuggestion];
        // Replace the current line with the suggestion's name
        lines[suggestionLine] = item.name;
        const newText = lines.join("\n");
        setText(newText);
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        setSuggestionLine(-1);
        // Analyze the new line
        analyzeLine(item.name, suggestionLine);
        // Move cursor to end of line
        setTimeout(() => {
          const pos = lines.slice(0, suggestionLine + 1).join("\n").length;
          textarea.selectionStart = textarea.selectionEnd = pos;
        }, 0);
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
        lines[lineIndex] = phrase;
      }
      // Alt satıra geçmek için ilgili yere boş satır ekle
      lines.splice(lineIndex + 1, 0, "");
      const newText = lines.join("\n");
      setText(newText);
      // Sadece güncellenen satırları analiz et
      analyzeLine(lines[lineIndex], lineIndex);
      analyzeLine("", lineIndex + 1);
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
      setSuggestionLine(-1);
      requestAnimationFrame(() => {
        // İmleci yeni satıra konumlandır
        const pos = lines.slice(0, lineIndex + 2).join("\n").length + 1;
        textarea.selectionStart = textarea.selectionEnd = pos;
        // textarea yüksekliğini ayarla
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
    setLineValues((prev) => {
      const arr = prev.slice();
      if (newLines.length < arr.length) {
        for (let i = newLines.length; i < arr.length; i++) {
          const val = arr[i];
          if (val) {
            adjustTotals({
              gram: -val.gram,
              kcal: -val.kcal,
              protein: -val.protein,
              carb: -val.carb,
              fiber: -val.fiber,
            });
          }
        }
      }
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
        setLineValues((prev) => {
          const arr = prev.slice();
          if (arr[lineIdx]) {
            adjustTotals({
              gram: -arr[lineIdx].gram,
              kcal: -arr[lineIdx].kcal,
              protein: -arr[lineIdx].protein,
              carb: -arr[lineIdx].carb,
              fiber: -arr[lineIdx].fiber,
            });
          }
          arr[lineIdx] = null;
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
    // Make both 'kalori' and 'kcal' bold, and also numbers before kcal bold
    return line
      .replace(/(\d+(?:\.?\d*)?\s*kcal)/gi, '<span style="font-weight:bold; color:#000;">$1</span>')
      .replace(/(\d+(?:\.?\d*)?\s*kalori)/gi, '<span style="font-weight:bold; color:#000;">$1</span>')
      .replace(/(kcal|kalori)/gi, '<span style="font-weight:bold; color:#000;">$1</span>');
  }

  // Helper: get caret position (line, column)
  function getCaretLineCol(text, caretPos) {
    const lines = text.slice(0, caretPos).split("\n");
    return { line: lines.length - 1, col: lines[lines.length - 1].length };
  }

  // Helper: get suggestion menu position (absolute, below textarea line)
  function getSuggestionMenuStyle() {
    if (!textareaRef.current || suggestionLine < 0) return { display: 'none' };
    // Try to position below the current line
    const textarea = textareaRef.current;
    const lineHeight = 32; // px, adjust as needed
    const rect = textarea.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const top = rect.top + scrollY + lineHeight * (suggestionLine + 1);
    const left = rect.left + window.scrollX + 8; // padding
    return {
      position: 'absolute',
      top: top + 'px',
      left: left + 'px',
      zIndex: 1000,
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      minWidth: '220px',
      maxWidth: '350px',
      fontSize: '1rem',
      padding: '2px 0',
      display: showSuggestions && suggestions.length > 0 ? 'block' : 'none',
      maxHeight: '180px',
      overflowY: 'auto',
    };
  }

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    if (params?.username && params?.recordName) {
      setLoading(true);
      setError("");
      fetch(`${baseUrl}/api/records/getRecord`, {
        headers: getAuthHeaders(),
      })
        .then(async (res) => {
          const text = await res.text();
          if (!text) {
            setText("");
            return;
          }
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
          if (!record) {
            setText("");
            return;
          }
          setText(record.foods || record.data || "");
        })
        .catch((err) => {
          setText("");
          setError(err.message || "Kayıt yüklenemedi.");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [params?.username, params?.recordName, authUser, password]);

  // Kayıt güncelleme fonksiyonu
  function saveRecord() {
    if (!params?.username || !params?.recordName) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const body = {
      username: params.username,
      name: params.recordName,
      foods: text,
    };
    fetch(`${baseUrl}/api/records/putRecord`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
  }

  useEffect(() => {
    return () => {
      saveRecord();
    };
  }, [params?.username, params?.recordName, text, authUser, password]);

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
        <div className="bg-white w-full max-w-[1100px] min-h-screen h-auto shadow p-8 flex flex-col">
          <div className="flex flex-row gap-4">
            <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            style={{ resize: 'none' }}
            className="w-1/3 outline-none p-2 bg-white text-xl"
          />
          {/* Suggestion dropdown menu */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={getSuggestionMenuStyle()}>
              {suggestions.map((item, idx) => (
                <div
                  key={item.name}
                  style={{
                    padding: '4px 12px',
                    background: idx === selectedSuggestion ? '#f0f0f0' : 'transparent',
                    color: '#222',
                    cursor: 'pointer',
                    fontWeight: idx === selectedSuggestion ? 'bold' : 'normal',
                    borderRadius: '4px',
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    // Select on click
                    const textarea = textareaRef.current;
                    const val = textarea.value;
                    const lines = val.split("\n");
                    lines[suggestionLine] = item.name;
                    const newText = lines.join("\n");
                    setText(newText);
                    setShowSuggestions(false);
                    setSelectedSuggestion(-1);
                    setSuggestionLine(-1);
                    analyzeLine(item.name, suggestionLine);
                    setTimeout(() => {
                      const pos = lines.slice(0, suggestionLine + 1).join("\n").length;
                      textarea.selectionStart = textarea.selectionEnd = pos;
                    }, 0);
                  }}
                  onMouseEnter={() => setSelectedSuggestion(idx)}
                >
                  {item.name}
                </div>
              ))}
            </div>
          )}
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
          <div className="flex w-full mt-8 text-xl">
            <div className="w-1/3" style={{ paddingLeft: '0.5em' }}>Toplam:</div>
            <div className="w-2/3" style={{ paddingLeft: '1.0em' }}>
              {`${roundNumber(totals.gram)} g, `}
              <span style={{ fontWeight: 'bold' }}>{`${roundNumber(totals.kcal)} kcal`}</span>
              {`, ${roundNumber(totals.protein)} g protein, ${roundNumber(totals.carb)} g karbonhidrat, ${roundNumber(totals.fiber)} g lif`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
