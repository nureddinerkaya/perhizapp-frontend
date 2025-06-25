"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [records, setRecords] = useState([]);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${baseUrl}/api/records`)
      .then((res) => res.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [baseUrl]);

  function createRecord() {
    const recordName = prompt("Perhiz kaydının ismi");
    if (!recordName) return;
    const username = localStorage.getItem("username") || "kullanici_adi";
    const payload = {
      username,
      records: [{ recordName, entries: [] }],
    };
    fetch(`${baseUrl}/api/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        const rec = data.recordName ? data : { recordName };
        setRecords((prev) => [...prev, rec]);
      })
      .catch(() => {});
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">PerhizApp</h1>
      <p className="mb-6 text-center">
        Kişisel diyet kayıtlarınızı tutabileceğiniz basit bir uygulama.
      </p>
      <div className="flex justify-center gap-4 mb-6">
        <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded">
          Login
        </Link>
        <Link href="/signup" className="px-4 py-2 bg-gray-500 text-white rounded">
          Sign Up
        </Link>
      </div>
      <button
        onClick={createRecord}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded"
      >
        Yeni Perhiz Kaydı
      </button>
      <h2 className="text-xl font-semibold mb-2">Perhiz Kayıtları</h2>
      <ul className="list-disc pl-5">
        {records.length === 0 && <li>Henüz kayıt yok</li>}
        {records.map((r, idx) => (
          <li key={idx}>{r.recordName || r.name}</li>
        ))}
      </ul>
    </div>
  );
}
