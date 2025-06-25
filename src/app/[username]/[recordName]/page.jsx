"use client";
import { useEffect, useState } from "react";
import WordEditor from "@/components/WordEditor";

export default function RecordPage({ params }) {
  const { username, recordName } = params;
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${baseUrl}/api/records/${username}/${encodeURIComponent(recordName)}`)
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, [baseUrl, username, recordName]);

  if (loading) return <div className="text-center p-8">Yükleniyor...</div>;
  if (!authorized) return <div className="text-center p-8">Erişim hatası</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4 text-center">
        {username} / {recordName}
      </h1>
      <WordEditor />
    </div>
  );
}
