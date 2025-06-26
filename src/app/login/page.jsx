"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();

  const baseUrl = "http://localhost:8080";

  function handleSubmit(e) {
    e.preventDefault();
    fetch(`${baseUrl}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    })
      .then(async (res) => {
        let text = await res.text();
        let message = text;
        try {
          const data = JSON.parse(text);
          message = data.message || text;
        } catch (e) {}
        // İngilizce mesajları Türkçe'ye çevir
        if (message === "Login successful") message = "Giriş başarılı!";
        if (message === "Invalid username or password") message = "Kullanıcı adı veya şifre hatalı.";
        if (!res.ok) throw new Error(message || "Giriş başarısız");
        localStorage.setItem("username", username);
        localStorage.setItem("password", password);
        setMessage(message || "Giriş başarılı");
        router.push("/");
      })
      .catch((err) => setMessage(err.message || "Giriş başarısız"));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <Paper elevation={6} className="p-8 w-full max-w-md flex flex-col items-center">
        <Typography variant="h4" className="mb-6 font-bold text-blue-700">Giriş Yap</Typography>
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
            Giriş Yap
          </Button>
        </form>
        <Button component={Link} href="/signup" color="secondary" className="mt-4" fullWidth>
          Hesabın yok mu? Kayıt Ol
        </Button>
        {message && <Typography className="mt-4 text-center" color="error">{message}</Typography>}
      </Paper>
    </div>
  );
}
