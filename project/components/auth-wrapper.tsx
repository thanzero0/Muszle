"use client";

import { useState } from "react";
import { useLocalStorage } from "../lib/useLocalStorage";
import { Lock, Mail, User, KeyRound } from "lucide-react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn, isMounted] = useLocalStorage("muszle_logged_in", false);
  const [, setStoredUsername] = useLocalStorage("muszle_username", "");
  const [, setStoredEmail] = useLocalStorage("muszle_email", "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isRegistering ? "/api/register" : "/api/login";
      const bodyPayload = isRegistering
        ? { username, email, password }
        : { username, password }; // Login bisa pakai username ATAU email di field 'username'

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStoredUsername(data.username || username);
        setStoredEmail(data.email || email || "");
        setIsLoggedIn(true);
      } else {
        setError(data.error || `Gagal ${isRegistering ? 'mendaftar' : 'login'}.`);
      }
    } catch (err: any) {
      setError("Tidak dapat terhubung ke server backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const googleName = decoded.name || decoded.email || "GoogleUser";
      const googleEmail = decoded.email || "";
      
      // Auto-register Google user in backend
      try {
        await fetch("http://localhost:5000/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: googleName, email: googleEmail, password: "google-oauth" }),
        });
      } catch {} // ignore if already registered
      
      setStoredUsername(googleName);
      setStoredEmail(googleEmail);
      setIsLoggedIn(true);
    } catch (err) {
      setError("Gagal membaca data dari Google.");
    }
  };

  const handleGoogleError = () => {
    setError("Login Google dibatalkan atau gagal.");
  };

  if (!isMounted) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  }

  if (!isLoggedIn) {
    return (
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
            
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-slate-900 dark:bg-white flex items-center justify-center rounded-2xl shadow-sm">
                <span className="font-bold text-white dark:text-slate-900 text-3xl tracking-tighter">M</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-1 text-slate-900 dark:text-white">
              {isRegistering ? "Buat Akun Baru" : "Selamat Datang"}
            </h1>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-7 text-sm">
              {isRegistering
                ? "Isi form di bawah untuk mulai tracking latihanmu."
                : "Masuk untuk melanjutkan tracking latihanmu."}
            </p>

            {/* Google Login - tampilkan di atas form agar terlihat profesional */}
            <div className="flex justify-center mb-5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                shape="pill"
                size="large"
                width="350"
                text={isRegistering ? "signup_with" : "signin_with"}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
              <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">atau</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-3.5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isRegistering ? "Username" : "Username atau Email"}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow"
                    placeholder={isRegistering ? "Pilih username" : "Username atau email"}
                    required
                  />
                </div>
              </div>

              {/* Email - hanya muncul saat Register */}
              {isRegistering && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow"
                      placeholder="contoh@email.com"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              {/* Error */}
              {error && (
                <div className="text-red-500 text-sm font-medium p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50 mt-2"
              >
                {isLoading ? "Memproses..." : <><Lock className="w-4 h-4" /> {isRegistering ? "Daftar Sekarang" : "Masuk"}</>}
              </button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {isRegistering ? "Sudah punya akun? " : "Belum punya akun? "}
              </span>
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                }}
                className="text-sm text-slate-900 dark:text-white font-semibold hover:underline"
              >
                {isRegistering ? "Masuk di sini" : "Daftar di sini"}
              </button>
            </div>

          </div>
        </div>
      </GoogleOAuthProvider>
    );
  }

  return <>{children}</>;
}
