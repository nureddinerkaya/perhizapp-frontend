"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export default function Home() {
  const [records, setRecords] = useState([]);
  const [username, setUsername] = useState("");
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  function fetchHistory() {
    if (!username) return;
    fetch(`${baseUrl}/api/records/getRecord?username=${username}`)
      .then((res) => res.json())
      .then((data) => {
        const recs = Array.isArray(data) ? data : [];
        setRecords(recs);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUsername(localStorage.getItem("username") || "");
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [baseUrl, username]);

  function createRecord() {
    const recordName = prompt("Perhiz kaydının ismi");
    if (!recordName) return;
    fetch(`${baseUrl}/api/records/postRecord`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        recordName,
        foods: "",
        data: "",
        total: "",
      }),
    })
      .then(() => fetchHistory())
      .catch(() => {});
  }

  // Kullanıcı login/signup sonrası anasayfaya yönlendirildiğinde username güncellensin
  useEffect(() => {
    function handleStorage() {
      setUsername(localStorage.getItem("username") || "");
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Çıkış fonksiyonu
  function handleLogout() {
    localStorage.removeItem("username");
    setUsername("");
    window.location.reload();
  }

  // Eğer kullanıcı yoksa kayıt ekleme ve kayıtlar gösterilmesin
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 px-2 py-8">
      <Paper elevation={8} className="w-full max-w-3xl p-10 flex flex-col items-center gap-8" style={{borderRadius: 24}}>
        <Typography variant="h2" className="mb-2 font-bold text-blue-700" align="center" style={{letterSpacing: 1}}>
          PerhizApp
        </Typography>
        {username ? (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" className="w-full mb-4">
              <Typography variant="h6">Hoş geldin, {username}!</Typography>
              <Button onClick={handleLogout} variant="outlined" color="error">
                Çıkış Yap
              </Button>
            </Stack>
            <Typography className="mb-8 text-center" color="text.secondary" style={{fontSize: 18}}>
              Kişisel diyet kayıtlarınızı tutabileceğiniz bir uygulama.
            </Typography>
            <Button onClick={createRecord} variant="contained" color="success" className="mb-8" size="large" style={{minWidth: 220, fontSize: 18}}>
              Yeni Perhiz Kaydı
            </Button>
            <Typography variant="h5" className="mb-4 text-center font-semibold">
              Perhiz Kayıtları
            </Typography>
            {records.length === 0 ? (
              <Typography align="center" color="text.secondary">Henüz kayıt yok</Typography>
            ) : (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3} className="w-full" flexWrap="wrap" justifyContent="center">
                {records.map((r) => (
                  <Link
                    key={r.recordName || r.name}
                    href={`/${username}/${encodeURIComponent(r.recordName || r.name)}`}
                    style={{ textDecoration: "none", flex: 1, minWidth: 180, maxWidth: 260 }}
                  >
                    <Paper elevation={2} className="p-6 hover:bg-blue-50 cursor-pointer text-center" style={{borderRadius: 16}}>
                      <Typography variant="subtitle1" style={{fontSize: 18}}>{r.recordName || r.name}</Typography>
                    </Paper>
                  </Link>
                ))}
              </Stack>
            )}
          </>
        ) : (
          <>
            <Typography className="mb-8 text-center" color="text.secondary" style={{fontSize: 18}}>
              Kişisel diyet kayıtlarınızı tutabileceğiniz bir uygulama.
            </Typography>
            <Stack direction="row" spacing={3} justifyContent="center" className="mb-8">
              <Button component={Link} href="/login" variant="contained" color="primary" size="large" style={{minWidth: 160, fontSize: 18}}>
                Login
              </Button>
              <Button component={Link} href="/signup" variant="outlined" color="secondary" size="large" style={{minWidth: 160, fontSize: 18}}>
                Sign Up
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </div>
  );
}
