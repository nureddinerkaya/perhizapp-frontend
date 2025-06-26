"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export default function SignUpPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();

  const baseUrl = "http://localhost:8080";

  function handleSubmit(e) {
    e.preventDefault();
    fetch(`${baseUrl}/api/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        password: password
      }),
    })
      .then(async (res) => {
        let text = await res.text();
        // Sunucu JSON dönerse parse et, yoksa düz metin olarak kullan
        let message = text;
        try {
          const data = JSON.parse(text);
          message = data.message || text;
        } catch (e) {}
        // İngilizce mesajları Türkçe'ye çevir
        if (message === "Signup successful") message = "Kaydolma başarılı! Giriş yapabilirsiniz.";
        if (message === "User already exists") message = "Bu kullanıcı adı zaten kayıtlı.";
        if (!res.ok) throw new Error(message || "Kaydolma başarısız");
        localStorage.setItem("username", username);
        localStorage.setItem("password", password);
        setMessage(message || "Kaydolma başarılı");
        router.push("/");
      })
      .catch((err) => setMessage(err.message || "Kaydolma başarısız"));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <Paper elevation={6} className="p-8 w-full max-w-md flex flex-col items-center">
        <Typography variant="h4" className="mb-6 font-bold text-blue-700">Kayıt Ol</Typography>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <TextField
            label="Kullanıcı adı"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            label="Şifre"
            type="password"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" color="primary" fullWidth size="large">
            Kaydol
          </Button>
        </form>
        <Button component={Link} href="/login" color="secondary" className="mt-4" fullWidth>
          Zaten hesabın var mı? Giriş Yap
        </Button>
        {message && <Typography className="mt-4 text-center" color="error">{message}</Typography>}
      </Paper>
    </div>
  );
}
