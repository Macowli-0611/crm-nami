"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already authorized, redirect immediately to dashboard
    const isAuth = document.cookie.includes("nami_session=authorized") || localStorage.getItem("nami_session") === "authorized";
    if (isAuth) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulated short delay for animation/realism
    setTimeout(() => {
      // Correct password
      if (password === "NamiCRM2026!") {
        // Set cookie (valid for 7 days)
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        document.cookie = `nami_session=authorized; expires=${expiry.toUTCString()}; path=/; SameSite=Strict`;
        
        // Save in localStorage for backup
        localStorage.setItem("nami_session", "authorized");

        router.push("/");
      } else {
        setError("Contraseña incorrecta. Por favor, intenta de nuevo.");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4">
      {/* Decorative background grid/blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>

      <div className="glass-card w-full max-w-md p-8 relative z-10 border border-slate-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400">
            Ñami CRM
          </h1>
          <p className="text-xs text-slate-500 mt-2 tracking-widest uppercase">Acceso Restringido</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Contraseña del Sistema
            </label>
            <div className="relative flex items-center">
              <Lock size={18} className="text-slate-500 absolute left-3" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña..."
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2 animate-shake">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-98 transition-all"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Ingresar al CRM"
            )}
          </button>
        </form>

        <div className="text-center mt-8 text-[10px] text-slate-600">
          Ñami v2.0 PRO • Servidor Seguro
        </div>
      </div>
    </div>
  );
}
