"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "../../lib/useLocalStorage";
import {
  Save, LogOut, Key, Cloud, CheckCircle, XCircle,
  Loader2, User, Pencil, ExternalLink, Unplug, X
} from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey, isMounted] = useLocalStorage("gemini_api_key", "");
  const [, setIsLoggedIn] = useLocalStorage("muszle_logged_in", false);
  const [username, setUsername] = useLocalStorage("muszle_username", "");
  const [storedEmail, setStoredEmail] = useLocalStorage("muszle_email", "");
  const [inputKey, setInputKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, msg: string} | null>(null);

  // GDrive state
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(true);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCurrentPassword, setEditCurrentPassword] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{success: boolean, msg: string} | null>(null);

  useEffect(() => {
    if (isMounted && apiKey) setInputKey(apiKey);
  }, [isMounted, apiKey]);

  // Check GDrive status from backend
  const checkDriveStatus = useCallback(async () => {
    if (!username) return;
    setGdriveLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/gdrive/status?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setGdriveConnected(data.connected);
    } catch { setGdriveConnected(false); }
    finally { setGdriveLoading(false); }
  }, [username]);

  useEffect(() => {
    if (isMounted && username) {
      checkDriveStatus();
      // Listen for window focus (user comes back from Google consent)
      const handler = () => checkDriveStatus();
      window.addEventListener("focus", handler);
      return () => window.removeEventListener("focus", handler);
    }
  }, [isMounted, username, checkDriveStatus]);

  // Load profile
  useEffect(() => {
    if (isMounted && username) {
      setEditUsername(username);
      setEditEmail(storedEmail);
    }
  }, [isMounted, username, storedEmail]);

  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(inputKey.trim());
    setIsSaved(true);
    setTestResult(null);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestAPI = async () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, msg: "API Key kosong!" });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": inputKey.trim() },
        body: JSON.stringify({ prompt: "Balas dengan kata 'OK' saja." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestResult({ success: true, msg: "API Key valid dan terhubung!" });
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || "Gagal." });
    } finally { setIsTesting(false); }
  };

  const handleConnectDrive = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/gdrive/auth-url?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.url) {
        // Open Google consent in popup
        window.open(data.url, '_blank', 'width=600,height=700');
      }
    } catch {
      alert("Gagal mendapatkan URL Google. Pastikan backend berjalan.");
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await fetch("http://localhost:5000/api/gdrive/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      setGdriveConnected(false);
    } catch {
      alert("Gagal memutus koneksi Google Drive.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      const body: Record<string, string> = { currentUsername: username };
      if (editUsername && editUsername !== username) body.newUsername = editUsername;
      if (editEmail && editEmail !== storedEmail) body.newEmail = editEmail;
      if (editNewPassword) {
        body.newPassword = editNewPassword;
        body.currentPassword = editCurrentPassword;
      }

      // If nothing changed
      if (!body.newUsername && !body.newEmail && !body.newPassword) {
        setProfileMsg({ success: false, msg: "Tidak ada perubahan." });
        setProfileLoading(false);
        return;
      }

      if (body.newPassword && !body.currentPassword) {
        setProfileMsg({ success: false, msg: "Masukkan password saat ini untuk mengganti password." });
        setProfileLoading(false);
        return;
      }

      const res = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUsername(data.username);
      setStoredEmail(data.email || "");
      setEditUsername(data.username);
      setEditEmail(data.email || "");
      setEditCurrentPassword("");
      setEditNewPassword("");
      setIsEditingProfile(false);
      setProfileMsg({ success: true, msg: data.message });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ success: false, msg: err.message });
    } finally { setProfileLoading(false); }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setStoredEmail("");
    window.location.href = "/";
  };

  if (!isMounted) return <div className="p-8 text-center text-slate-500">Memuat pengaturan...</div>;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full flex-1 flex flex-col justify-start">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Kelola akun, integrasi API, dan Google Drive.</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ===== Account Section ===== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">Akun</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Profil dan pengaturan akun</p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => { setIsEditingProfile(true); setProfileMsg(null); }}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100" />
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-3">Ganti password (opsional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="password" placeholder="Password saat ini" value={editCurrentPassword} onChange={e => setEditCurrentPassword(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100" />
                  <input type="password" placeholder="Password baru" value={editNewPassword} onChange={e => setEditNewPassword(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100" />
                </div>
              </div>
              {profileMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium border ${profileMsg.success ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'}`}>
                  {profileMsg.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {profileMsg.msg}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={profileLoading}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold py-2.5 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50">
                  {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan
                </button>
                <button type="button" onClick={() => { setIsEditingProfile(false); setEditUsername(username); setEditEmail(storedEmail); setEditCurrentPassword(""); setEditNewPassword(""); setProfileMsg(null); }}
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium py-2.5 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-4 h-4" /> Batal
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center font-bold text-white text-sm">
                    {username ? username.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{username || "Belum Login"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{storedEmail || "Tidak ada email"}</p>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
              {profileMsg && (
                <div className={`flex items-center gap-2 p-3 mt-3 rounded-xl text-sm font-medium border ${profileMsg.success ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'}`}>
                  {profileMsg.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {profileMsg.msg}
                </div>
              )}
            </>
          )}
        </div>

        {/* ===== Google Drive ===== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Cloud className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Google Drive</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sinkronisasi data latihan ke Google Drive secara real.</p>
            </div>
          </div>

          {gdriveLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa koneksi...
            </div>
          ) : gdriveConnected ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle className="w-5 h-5" />
                <span>Google Drive Terhubung</span>
              </div>
              <button onClick={handleDisconnectDrive}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors">
                <Unplug className="w-3.5 h-3.5" /> Putuskan
              </button>
            </div>
          ) : (
            <button onClick={handleConnectDrive}
              className="flex items-center justify-center gap-2 w-full bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-4 px-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 transition-all group">
              <ExternalLink className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
              <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Hubungkan Google Drive</span>
            </button>
          )}
        </div>

        {/* ===== API Key ===== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Key className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Gemini API Key</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Untuk fitur AI Analysis. Key disimpan di browser.</p>
            </div>
          </div>

          <form onSubmit={handleSaveApi} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="password" placeholder="Paste Gemini API Key..." value={inputKey} onChange={e => setInputKey(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow" />
              <button type="submit"
                className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold py-2.5 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-colors">
                <Save className="w-4 h-4" />
                {isSaved ? "Tersimpan!" : "Save"}
              </button>
              <button type="button" onClick={handleTestAPI} disabled={isTesting || !inputKey.trim()}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Test
              </button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 p-3 mt-2 rounded-xl text-sm font-medium border ${testResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'}`}>
                {testResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                <span className="break-all">{testResult.msg}</span>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
