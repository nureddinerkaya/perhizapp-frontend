"use client";
import React from "react";
import { useEffect, useState, useRef } from "react";
import WordEditor from "@/components/WordEditor";

export default function RecordPage({ params }) {
  // Unwrap params using React.use for Next.js 14+ compatibility
  const { username, recordName } = React.use(params);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState({
    username,
    records: [
      {
        recordName,
        entries: [],
      },
    ],
  });
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  const saveTimeout = useRef();

  // Kayıt verisini backend'den çek
  useEffect(() => {
    fetch(`${baseUrl}/api/users/getHistory?username=${username}`)
      .then((res) => res.json())
      .then((data) => {
        const rec = (data.records || []).find((r) => r.recordName === recordName);
        if (rec) {
          setRecord({ username, records: [rec] });
        }
        setAuthorized(true);
      })
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, [baseUrl, username, recordName]);

  // Backend'den gelen kayıtları tümüyle al
  useEffect(() => {
    fetch(`${baseUrl}/api/users/getHistory?username=${username}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setRecord({ username, records: data.records });
        }
        setAuthorized(true);
      })
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, [baseUrl, username, recordName]);

  // Yeni perhiz kaydı ekle fonksiyonu
  function addNewRecord(newRecord) {
    setRecord((prev) => ({
      ...prev,
      records: [...prev.records, newRecord],
    }));
  }

  // Otomatik kaydetme (debounce)
  useEffect(() => {
    if (!authorized) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch(`${baseUrl}/api/users/putHistory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    }, 5000); // 5 saniye sonra kaydet
    return () => clearTimeout(saveTimeout.current);
  }, [record, authorized, baseUrl]);

  // Sayfa kapatılırken kaydet
  useEffect(() => {
    function handleBeforeUnload() {
      navigator.sendBeacon(
        `${baseUrl}/api/users/putHistory`,
        new Blob([JSON.stringify(record)], { type: "application/json" })
      );
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [record, baseUrl]);

  if (loading) return <div className="text-center p-8">Yükleniyor...</div>;
  if (!authorized) return <div className="text-center p-8">Erişim hatası</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4 text-center">
        {username} / Kayıtlar
      </h1>
      <ul className="mb-6">
        {record.records.map((rec, idx) => (
          <li key={rec.recordName + idx} className="border rounded p-3 mb-2">
            <div className="font-bold">{rec.recordName}</div>
            <div className="text-xs text-gray-500">{rec.entries.length} giriş</div>
          </li>
        ))}
      </ul>
      <WordEditor addNewRecord={addNewRecord} />
    </div>
  );
}
