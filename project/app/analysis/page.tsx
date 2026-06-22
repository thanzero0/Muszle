"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalStorage } from "../../lib/useLocalStorage";
import { Send, FileText, RefreshCcw } from "lucide-react";

type Workout = {
  id: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight?: number | null;
};

type Message = {
  role: "user" | "model";
  text: string;
};

export default function AnalysisPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [apiKey, , isMounted] = useLocalStorage("gemini_api_key", "");
  const [username] = useLocalStorage("muszle_username", "");

  const fetchWorkouts = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`http://localhost:5000/api/workouts?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (Array.isArray(data)) setWorkouts(data);
    } catch {}
  }, [username]);

  useEffect(() => {
    if (isMounted && username) fetchWorkouts();
  }, [isMounted, username, fetchWorkouts]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartAnalysis = async () => {
    if (!apiKey) {
      alert("API Key belum diatur. Silakan ke menu Settings dan tambahkan API Key kamu.");
      return;
    }
    if (workouts.length === 0) {
      alert("Tidak ada data latihan untuk dianalisis. Tambahkan data terlebih dahulu di menu Tracker.");
      return;
    }

    setLoading(true);

    try {
      const prompt = `Ini adalah data latihan saya: ${JSON.stringify(workouts)}. Tolong berikan evaluasi singkat, kritik yang membangun, dan saran. Buat maksimal 2 paragraf.`;
      
      const newMessages: Message[] = [{ role: "user", text: "Tolong analisis data latihanku." }];
      setMessages(newMessages);

      const res = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey || "",
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi backend.");
      
      setMessages([...newMessages, { role: "model", text: data.text }]);
    } catch (error: any) {
      console.error(error);
      setMessages([{ role: "model", text: `Terjadi kesalahan API: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", text: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const context = newMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join("\n");
      const prompt = `Konteks percakapan sebelumnya:\n${context}\n\nJawab pertanyaan terbaru user dengan bahasa yang nyaman, singkat dan memotivasi.`;

      const res = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey || "",
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi backend.");
      
      setMessages([...newMessages, { role: "model", text: data.text }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: "model", text: `Maaf, terjadi kesalahan saat menghubungi AI: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChat = () => {
    if (messages.length === 0) return;
    const textContent = messages.map(m => `${m.role.toUpperCase()}:\n${m.text}\n`).join("\n");
    const blob = new Blob([textContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Muszle_Analysis_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  if (!isMounted) return <div className="p-8 text-center text-slate-500">Memuat AI Analysis...</div>;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">AI Analysis</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tanya pelatih AI kamu sepuasnya.</p>
        </div>
        <button
          onClick={handleSaveChat}
          disabled={messages.length === 0}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-2 px-4 rounded-xl transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <FileText className="w-4 h-4" />
          <span>Save Chat</span>
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4">
        {/* Chat Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="m-auto flex flex-col items-center text-center max-w-sm">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-4">
                <RefreshCcw className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Mulai Analisis</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Tidak ada limitasi, tanyakan apa saja tentang data latihanmu.
              </p>
              <button
                onClick={handleStartAnalysis}
                disabled={loading}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-colors"
              >
                {loading ? "Menyiapkan Data..." : "Kirim Data & Analisis"}
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[90%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-tr-none' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={messages.length === 0 || loading}
              placeholder="Tanya sesuatu tentang data latihanku..."
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={messages.length === 0 || loading || !input.trim()}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-3 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
