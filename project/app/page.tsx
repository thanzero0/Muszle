"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocalStorage } from "../lib/useLocalStorage";
import { Plus, Download, Cloud, Calendar, Trash2, Loader2, ExternalLink, CheckCircle } from "lucide-react";

type Workout = {
  id: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight?: number | null;
};

export default function GymTracker() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [username] = useLocalStorage("muszle_username", "admin");

  const [currentDateString, setCurrentDateString] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: boolean, msg: string, link?: string} | null>(null);
  const [gdriveConnected, setGdriveConnected] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    setCurrentDateString(new Date().toLocaleDateString('id-ID', options));
  }, []);

  // Fetch workouts from backend
  const fetchWorkouts = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`http://localhost:5000/api/workouts?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (Array.isArray(data)) setWorkouts(data);
    } catch (err) { console.error("Gagal load data dari backend", err); }
  }, [username]);

  // Check GDrive status
  const checkDrive = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`http://localhost:5000/api/gdrive/status?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setGdriveConnected(data.connected);
    } catch { setGdriveConnected(false); }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchWorkouts();
      checkDrive();
    }
  }, [username, fetchWorkouts, checkDrive]);

  // Date tabs
  const uniqueDates = useMemo(() => Array.from(new Set(workouts.map(w => w.date))), [workouts]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (!selectedDate && uniqueDates.length > 0) {
      setSelectedDate(uniqueDates.includes(currentDateString) ? currentDateString : uniqueDates[uniqueDates.length - 1]);
    }
  }, [uniqueDates, currentDateString, selectedDate]);

  const displayedWorkouts = selectedDate ? workouts.filter(w => w.date === selectedDate) : [];

  // Form state
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState<number | "">("");
  const [reps, setReps] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise || !sets || !reps) return;

    const newWorkout: Workout = {
      id: crypto.randomUUID(),
      date: currentDateString,
      exercise,
      sets: Number(sets),
      reps: Number(reps),
      weight: weight === "" ? null : Number(weight),
    };

    try {
      const res = await fetch("http://localhost:5000/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, workout: newWorkout })
      });
      if (res.ok) {
        setWorkouts([...workouts, newWorkout]);
        setSelectedDate(currentDateString);
        setExercise(""); setSets(""); setReps(""); setWeight("");
      } else { alert("Gagal menyimpan ke backend."); }
    } catch { alert("Error menghubungi backend."); }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/workouts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, workoutId })
      });
      if (res.ok) setWorkouts(workouts.filter(w => w.id !== workoutId));
    } catch { alert("Gagal menghapus workout."); }
  };

  const handleDownloadCSV = () => {
    const headers = ["Tanggal,Latihan,Sets,Reps,Beban(kg)"];
    const rows = workouts.map(w => `"${w.date}",${w.exercise},${w.sets},${w.reps},${w.weight || '-'}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Muszle_${username}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncDrive = async () => {
    if (!gdriveConnected) {
      setSyncResult({ success: false, msg: "Google Drive belum terhubung. Hubungkan di Settings." });
      setTimeout(() => setSyncResult(null), 5000);
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/gdrive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult({ success: true, msg: data.message, link: data.fileLink });
    } catch (err: any) {
      setSyncResult({ success: false, msg: err.message });
    } finally { setIsSyncing(false); }
  };

  if (!isMounted) return <div className="p-8 text-center text-slate-500">Memuat Tracker...</div>;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex-1 flex flex-col justify-start">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Track Workout</h1>
        <p className="text-slate-500 dark:text-slate-400">Catat progres latihan harianmu untuk progressive overload.</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
        <form onSubmit={handleAddWorkout} className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</label>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium cursor-not-allowed">
              {currentDateString || "Memuat..."}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-4">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Exercise Name</label>
            <input type="text" placeholder="e.g. Barbell Bench Press" value={exercise} onChange={e => setExercise(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-600" required />
          </div>
          <div className="grid grid-cols-3 gap-4 sm:col-span-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sets</label>
              <input type="number" placeholder="4" min="1" value={sets} onChange={e => setSets(Number(e.target.value))}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reps</label>
              <input type="number" placeholder="10" min="1" value={reps} onChange={e => setReps(Number(e.target.value))}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Weight (kg) <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
              <input type="number" placeholder="80" min="0" step="0.5" value={weight} onChange={e => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 transition-shadow" />
            </div>
          </div>
          <button type="submit"
            className="sm:col-span-6 mt-2 flex items-center justify-center gap-2 w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-colors">
            <Plus className="w-5 h-5" /> Add Workout
          </button>
        </form>
      </div>

      {/* Export & Sync - Cleaner grouped buttons */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 overflow-hidden">
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
          <button onClick={handleDownloadCSV} disabled={workouts.length === 0}
            className="flex items-center justify-center gap-3 flex-1 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Export CSV</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Download data sebagai file</p>
            </div>
          </button>
          <button onClick={handleSyncDrive} disabled={workouts.length === 0 || isSyncing}
            className="flex items-center justify-center gap-3 flex-1 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${gdriveConnected ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-slate-100 dark:bg-slate-800'} group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50`}>
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Cloud className={`w-4 h-4 ${gdriveConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`} />}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {isSyncing ? "Syncing..." : "Sync to GDrive"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {gdriveConnected ? "Terhubung ✓" : "Belum terhubung"}
              </p>
            </div>
          </button>
        </div>
        {syncResult && (
          <div className={`px-5 py-3 border-t ${syncResult.success ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'}`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {syncResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <Cloud className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
              <span className={syncResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>{syncResult.msg}</span>
              {syncResult.link && (
                <a href={syncResult.link} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">
                  Buka <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Workout History */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          Riwayat Latihan
        </h2>

        {uniqueDates.length > 0 && (
          <div className="flex overflow-x-auto pb-2 mb-4 gap-2 no-scrollbar">
            {uniqueDates.map(date => (
              <button key={date} onClick={() => setSelectedDate(date)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${selectedDate === date ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                {date === currentDateString ? "Hari Ini" : date}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exercise</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Sets</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Reps</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Weight</th>
                  <th className="py-4 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedWorkouts.length > 0 ? (
                  displayedWorkouts.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white">{w.exercise}</td>
                      <td className="py-4 px-6 text-sm text-center text-slate-600 dark:text-slate-300">{w.sets}</td>
                      <td className="py-4 px-6 text-sm text-center text-slate-600 dark:text-slate-300">{w.reps}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-right text-slate-900 dark:text-white">{w.weight ? `${w.weight} kg` : '-'}</td>
                      <td className="py-4 px-2 text-center">
                        <button onClick={() => handleDeleteWorkout(w.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          title="Hapus workout">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                      Belum ada data latihan untuk tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}