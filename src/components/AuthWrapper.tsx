"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const isLoginPath = pathname === "/login";
      const hasCookie = document.cookie.includes("nami_session=authorized");
      const hasLocalStore = typeof window !== "undefined" && localStorage.getItem("nami_session") === "authorized";
      const isAuth = hasCookie || hasLocalStore;

      if (isLoginPath) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      if (!isAuth) {
        setAuthorized(false);
        router.push("/login");
      } else {
        setAuthorized(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-[99]">
        <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
        <span className="text-slate-400 text-sm">Verificando sesión...</span>
      </div>
    );
  }

  // If path is /login, we don't block render. If authorized, we show children. Otherwise, show nothing.
  if (pathname === "/login" || authorized) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-[99]">
      <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
      <span className="text-slate-400 text-sm">Redireccionando...</span>
    </div>
  );
}
