"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, DollarSign, Settings, LogOut, Menu, X, CalendarDays, Megaphone } from 'lucide-react';

interface CalEvent {
  date: string;
}

interface Client {
  plan?: string;
  payDate?: string;
  testMonths?: string;
}

function toYMD(d: Date) {
  return d.toISOString().split('T')[0];
}

function daysUntil(ymd: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = ymd.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function clientDateToYMD(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split('/');
  if (parts.length === 3) {
    return `${parts[2].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);

  // Count upcoming alerts from cache
  useEffect(() => {
    const today = toYMD(new Date());

    const countFromCache = () => {
      let count = 0;

      // From custom calendar events
      try {
        const cachedEvents: CalEvent[] = JSON.parse(localStorage.getItem('nami_cached_cal_events') || '[]');
        cachedEvents.forEach((ev) => {
          const d = daysUntil(ev.date);
          if (d >= 0 && d <= 7) count++;
        });
      } catch (e) {}

      // From client payment / trial dates
      try {
        const cachedClients: Client[] = JSON.parse(localStorage.getItem('nami_cached_clients') || '[]');
        cachedClients.forEach((c) => {
          if (c.payDate && c.plan && c.plan !== 'Ninguno') {
            const ymd = clientDateToYMD(c.payDate);
            if (ymd) { const d = daysUntil(ymd); if (d >= 0 && d <= 7) count++; }
          }
          if (c.testMonths) {
            const ymd = clientDateToYMD(c.testMonths);
            if (ymd) { const d = daysUntil(ymd); if (d >= 0 && d <= 7) count++; }
          }
        });
      } catch (e) {}

      setUpcomingCount(count);
    };

    countFromCache();

    // Also fetch latest calendar events and cache them
    fetch('/api/calendario')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem('nami_cached_cal_events', JSON.stringify(data.data));
          countFromCache();
        }
      })
      .catch(() => {});
  }, [pathname]);

  if (pathname === '/login') return null;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push('/login');
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      isActive(href)
        ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-900/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`;

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 pt-5 pb-1.5">
      <p className="text-[9px] font-bold text-orange-800/60 uppercase tracking-widest">{children}</p>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-[60] md:hidden bg-slate-800/80 border border-slate-700/50 p-2.5 rounded-xl text-slate-200 hover:text-white transition-all backdrop-blur-sm shadow-lg active:scale-95"
        title={isOpen ? 'Cerrar Menú' : 'Abrir Menú'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 glass border-r border-slate-700/50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 pt-20 md:pt-6 border-b border-orange-900/20">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-500">
            Ñami CRM
          </h2>
          <p className="text-xs text-slate-500 mt-1">v2.0 PRO</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto pb-4">
          {/* Overview */}
          <SectionLabel>Resumen</SectionLabel>
          <Link href="/" onClick={closeSidebar} className={linkClass('/')}>
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Commercial */}
          <SectionLabel>Gestión Comercial</SectionLabel>
          <Link href="/clientes" onClick={closeSidebar} className={linkClass('/clientes')}>
            <Users size={20} />
            <span className="font-medium">Clientes</span>
          </Link>

          <Link href="/calendario" onClick={closeSidebar} className={`relative ${linkClass('/calendario')}`}>
            <CalendarDays size={20} />
            <span className="font-medium">Calendario</span>
            {upcomingCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-pink-900/50 animate-pulse">
                {upcomingCount > 9 ? '9+' : upcomingCount}
              </span>
            )}
          </Link>

          {/* Operations */}
          <SectionLabel>Operaciones</SectionLabel>
          <Link href="/finanzas" onClick={closeSidebar} className={linkClass('/finanzas')}>
            <DollarSign size={20} />
            <span className="font-medium">Finanzas</span>
          </Link>

          {/* Marketing */}
          <SectionLabel>Marketing</SectionLabel>
          <Link href="/marketing" onClick={closeSidebar} className={linkClass('/marketing')}>
            <Megaphone size={20} />
            <span className="font-medium">Herramientas</span>
          </Link>

          {/* System */}
          <SectionLabel>Sistema</SectionLabel>
          <Link href="/configuracion" onClick={closeSidebar} className={linkClass('/configuracion')}>
            <Settings size={20} />
            <span className="font-medium">Configuración</span>
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
