"use client";
import React, { useEffect, useState, useRef } from "react";
import WordEditor from "@/components/WordEditor";

export default function RecordPage({ params }) {
  const { username, recordName } = React.use(params);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState("");
  const [data, setData] = useState("");
  const [total, setTotal] = useState("");
  const saveTimeout = useRef();

  // Fetch record on mount
  useEffect(() => {
    fetch(`${baseUrl}/api/records/getRecord?username=${username}&recordName=${recordName}`)
      .then((res) => res.json())
      .then((rec) => {
        setFoods(rec.foods || "");
        setData(rec.data || "");
        setTotal(rec.total || "");
      })
      .finally(() => setLoading(false));
  }, [baseUrl, username, recordName]);

  // Autosave when content changes
  useEffect(() => {
    if (loading) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch(`${baseUrl}/api/records/postRecord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recordName, foods, data, total }),
      });
    }, 5000);
    return () => clearTimeout(saveTimeout.current);
  }, [foods, data, total, username, recordName, baseUrl, loading]);

  // Save when leaving page
  useEffect(() => {
    function handleUnload() {
      const blob = new Blob([
        JSON.stringify({ username, recordName, foods, data, total })
      ], { type: "application/json" });
      navigator.sendBeacon(`${baseUrl}/api/records/postRecord`, blob);
    }
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [foods, data, total, username, recordName, baseUrl]);

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4 text-center">
        {username} / {recordName}
      </h1>
      <WordEditor
        initialText={foods}
        initialResults={data}
        initialTotal={total}
        onChange={({ foods: f, data: d, total: t }) => {
          setFoods(f);
          setData(d);
          setTotal(t);
        }}
      />
    </div>
  );
}
