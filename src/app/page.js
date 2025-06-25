"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [records, setRecords] = useState([]);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  const username = typeof window !== "undefined" ? localStorage.getItem("username") || "" : "";

  function fetchHistory() {
    if (!username) return;
    fetch(`${baseUrl}/api/getHistory?username=${username}`)
      .then((res) => res.json())
      .then((data) => {
        const recs = Array.isArray(data.records) ? data.records : data;
        setRecords(recs || []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchHistory();
  }, [baseUrl]);

  function createRecord() {
    const recordName = prompt("Perhiz kaydının ismi");
    if (!recordName || !username) return;
    const payload = {
      username,
      records: [{ recordName, entries: [] }],
    };
    fetch(`${baseUrl}/api/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(() => fetchHistory())
      .catch(() => {});
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2 text-center">PerhizApp</h1>
      {username && (
        <p className="text-center mb-2">Hoş geldin, {username}!</p>
      )}
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
        className="mb-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Yeni Perhiz Kaydı
      </button>
      <h2 className="text-xl font-semibold mb-4 text-center">Perhiz Kayıtları</h2>
      {records.length === 0 ? (
        <div className="text-center text-gray-500">Henüz kayıt yok</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map((r) => (
            <Link
              key={r.recordName || r.name}
              href={`/${username}/${encodeURIComponent(r.recordName || r.name)}`}
              className="block p-4 border rounded shadow hover:bg-gray-50"
            >
              {r.recordName || r.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
