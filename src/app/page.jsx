"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

function slugify(text) {
  const map = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  return text
    .split("")
    .map((ch) => map[ch] || ch)
    .join("")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export default function Home() {
  const [records, setRecords] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  function getAuthHeaders() {
    if (!username || !password) return {};
    return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
  }

  function fetchHistory() {
    if (!username || !password) return;
    fetch(`${baseUrl}/api/records/getRecord`, {
      headers: getAuthHeaders(),
    })
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
      setPassword(localStorage.getItem("password") || "");
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [baseUrl, username, password]);

  function createRecord() {
    const recordName = prompt("Perhiz kaydının ismi");
    if (!recordName) return;
    const slug = slugify(recordName);
    if (!password) return;
    fetch(`${baseUrl}/api/records/postRecord`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        username,
        name: slug,
        foods: "",
        data: "",
        toplam: "",
      }),
      // credentials: "include", // Cookie göndermek isterseniz açabilirsiniz
    })
      .then(() => {
        fetchHistory();
        router.push(`/${username}/${encodeURIComponent(slug)}`);
      })
      .catch(() => {});
  }

  // Kullanıcı login/signup sonrası anasayfaya yönlendirildiğinde username güncellensin
  useEffect(() => {
    function handleStorage() {
      setUsername(localStorage.getItem("username") || "");
      setPassword(localStorage.getItem("password") || "");
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Çıkış fonksiyonu
  function handleLogout() {
    localStorage.removeItem("username");
    localStorage.removeItem("password");
    setUsername("");
    setPassword("");
    window.location.reload();
  }

  // Eğer kullanıcı yoksa kayıt ekleme ve kayıtlar gösterilmesin
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-2 py-8">
      <Paper
        elevation={8}
        className="relative w-full max-w-4xl p-12 flex flex-col items-center gap-8"
        style={{ borderRadius: 24 }}
      >
        <Typography variant="h3" className="font-bold text-blue-700" align="center">
          PerhizApp
        </Typography>
          {username ? (
            <>
              <Typography variant="h5" className="font-medium" align="center">
                Hoş geldin, {username}!
              </Typography>
              <Typography color="text.secondary" align="center" style={{ fontSize: 18 }}>
                Kişisel diyet kayıtlarınızı tutabileceğiniz bir uygulama.
              </Typography>
              <Button onClick={createRecord} variant="contained" color="success" className="mb-4" size="large" style={{ minWidth: 220, fontSize: 18 }}>
                Yeni Perhiz Kaydı
              </Button>
              <Typography variant="h5" className="mt-2 mb-4 font-semibold" align="center">
                Perhiz Kayıtları
              </Typography>
              {records.length === 0 ? (
                <Typography align="center" color="text.secondary">
                  Henüz kayıt yok
                </Typography>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3} className="w-full" flexWrap="wrap" justifyContent="center">
                  {records.map((r) => (
                    <Link
                      key={r.recordName || r.name}
                      href={`/${username}/${encodeURIComponent(r.recordName || r.name)}`}
                      style={{ textDecoration: "none", flex: 1, minWidth: 180, maxWidth: 260 }}
                    >
                      <Paper elevation={2} className="p-6 hover:bg-blue-50 cursor-pointer text-center" style={{ borderRadius: 16 }}>
                        <Typography variant="subtitle1" style={{ fontSize: 18 }}>
                          {r.recordName || r.name}
                        </Typography>
                      </Paper>
                    </Link>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <>
              <Typography variant="h4" className="mb-4 font-bold text-blue-700" align="center">
                PerhizApp'e Hoş Geldiniz
              </Typography>
              <Typography className="mb-8 text-center" color="text.secondary" style={{ fontSize: 18 }}>
                Kişisel diyet kayıtlarınızı tutabileceğiniz bir uygulama.
              </Typography>
              <Stack direction="row" spacing={3} justifyContent="center" className="mb-8">
                <Button component={Link} href="/login" variant="contained" color="primary" size="large" style={{ minWidth: 160, fontSize: 18 }}>
                  Login
                </Button>
                <Button component={Link} href="/signup" variant="outlined" color="secondary" size="large" style={{ minWidth: 160, fontSize: 18 }}>
                  Sign Up
                </Button>
              </Stack>
            </>
          )}
          {username && (
            <div className="absolute right-8 top-8">
              <Button
                onClick={handleLogout}
                variant="contained"
                color="error"
                size="large"
                style={{ backgroundColor: "#d3d3d3", color: "#d32f2f" }}
              >
                Çıkış Yap
              </Button>
            </div>
          )}
        </Paper>
      </div>
  );
}
