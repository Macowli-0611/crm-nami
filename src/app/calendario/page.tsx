"use client";
import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  AlignLeft,
  Loader2,
  CreditCard,
  Hourglass,
  Pencil,
  Trash2,
  BellRing,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  description: string;
  color: string;
  source: "custom" | "payment" | "trial";
  clientName?: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  orange:  { bg: "bg-orange-500/20",   border: "border-orange-500/40",   text: "text-orange-300",   dot: "bg-orange-400" },
  emerald: { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  pink:    { bg: "bg-pink-500/20",    border: "border-pink-500/40",    text: "text-pink-300",    dot: "bg-pink-400" },
  amber:   { bg: "bg-amber-500/20",   border: "border-amber-500/40",   text: "text-amber-300",   dot: "bg-amber-400" },
  red:     { bg: "bg-red-500/20",     border: "border-red-500/40",     text: "text-red-300",     dot: "bg-red-400" },
  payment: { bg: "bg-pink-500/20",    border: "border-pink-500/40",    text: "text-pink-300",    dot: "bg-pink-400" },
  trial:   { bg: "bg-amber-500/20",   border: "border-amber-500/40",   text: "text-amber-300",   dot: "bg-amber-400" },
};

const COLORS = ["orange", "emerald", "pink", "amber", "red"];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseDateLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(ymd: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateLocal(ymd);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function urgencyClass(ymd: string): string {
  const d = daysUntil(ymd);
  if (d < 0) return "";
  if (d <= 3) return "ring-2 ring-red-500/70";
  if (d <= 7) return "ring-2 ring-amber-500/50";
  return "";
}

function clientDateToYMD(rawDate: string): string | null {
  if (!rawDate) return null;
  // Accepts YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  const parts = rawDate.split("/");
  if (parts.length === 3) {
    return `${parts[2].padStart(4,"0")}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string>(toYMD(today));

  const [customEvents, setCustomEvents] = useState<CalEvent[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    date: toYMD(today),
    time: "",
    location: "",
    description: "",
    color: "blue",
  });

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/calendario");
      const data = await res.json();
      if (data.success) {
        setCustomEvents(
          data.data.map((e: any) => ({ ...e, source: "custom" }))
        );
      }
    } catch (e) {
      console.error("Error loading calendar events:", e);
    }
    setLoadingEvents(false);
  };

  const loadClients = async () => {
    try {
      const cachedClients = localStorage.getItem("nami_cached_clients");
      if (cachedClients) setClients(JSON.parse(cachedClients));
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
        localStorage.setItem("nami_cached_clients", JSON.stringify(data.data));
      }
    } catch (e) {
      console.error("Error loading clients:", e);
    }
  };

  useEffect(() => {
    loadEvents();
    loadClients();
  }, []);

  // ── Derive client events ────────────────────────────────────────────────────

  const clientEvents = useMemo<CalEvent[]>(() => {
    const events: CalEvent[] = [];
    clients.forEach((c) => {
      if (c.payDate && c.plan && c.plan !== "Ninguno") {
        const ymd = clientDateToYMD(c.payDate);
        if (ymd) {
          events.push({
            id: `pay-${c.rowIndex}`,
            title: `Pago: ${c.name}`,
            date: ymd,
            time: "",
            location: "",
            description: `Plan: ${c.plan}`,
            color: "payment",
            source: "payment",
            clientName: c.name,
          });
        }
      }
      if (c.testMonths) {
        const ymd = clientDateToYMD(c.testMonths);
        if (ymd) {
          events.push({
            id: `trial-${c.rowIndex}`,
            title: `Fin prueba: ${c.name}`,
            date: ymd,
            time: "",
            location: "",
            description: "Fin del período de prueba gratuita",
            color: "trial",
            source: "trial",
            clientName: c.name,
          });
        }
      }
    });
    return events;
  }, [clients]);

  // ── All events merged ────────────────────────────────────────────────────────

  const allEvents = useMemo<CalEvent[]>(() => {
    return [...customEvents, ...clientEvents];
  }, [customEvents, clientEvents]);

  // ── Calendar grid generation ─────────────────────────────────────────────────

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // JS: 0=Sun..6=Sat → we want Mon=0..Sun=6
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-based

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startDow + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push(null);
      } else {
        cells.push(new Date(viewYear, viewMonth, dayNum));
      }
    }
    return cells;
  }, [viewYear, viewMonth]);

  // Map date → events
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    allEvents.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [allEvents]);

  // ── Upcoming alerts (next 7 days) ────────────────────────────────────────────

  const upcomingAlerts = useMemo<CalEvent[]>(() => {
    return allEvents
      .filter((ev) => {
        const d = daysUntil(ev.date);
        return d >= 0 && d <= 7;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents]);

  const todayYMD = toYMD(today);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDay(todayYMD); };

  // ── Modal helpers ────────────────────────────────────────────────────────────

  const openCreateModal = (prefillDate?: string) => {
    setEditingEvent(null);
    setForm({
      title: "", date: prefillDate || toYMD(today),
      time: "", location: "", description: "", color: "blue",
    });
    setShowModal(true);
  };

  const openEditModal = (ev: CalEvent) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title, date: ev.date, time: ev.time,
      location: ev.location, description: ev.description, color: ev.color,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingEvent ? "PUT" : "POST";
      const body = editingEvent
        ? { id: editingEvent.id, ...form }
        : form;
      const res = await fetch("/api/calendario", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await loadEvents();
        setShowModal(false);
      } else {
        alert("Error al guardar: " + data.error);
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!confirm(`¿Eliminar el evento "${editingEvent.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendario?id=${editingEvent.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await loadEvents();
        setShowModal(false);
      } else {
        alert("Error al eliminar: " + data.error);
      }
    } catch (err) {
      console.error(err);
    }
    setDeleting(false);
  };

  // ── Events for selected day ───────────────────────────────────────────────────

  const selectedDayEvents = eventsByDate[selectedDay] || [];

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderEventBadge = (ev: CalEvent, compact = false) => {
    const c = COLOR_MAP[ev.color] || COLOR_MAP.blue;
    const urgency = urgencyClass(ev.date);
    if (compact) {
      return (
        <div
          key={ev.id}
          onClick={(e) => { e.stopPropagation(); if (ev.source === "custom") openEditModal(ev); }}
          className={`w-full truncate text-[9px] font-semibold px-1 py-0.5 rounded border ${c.bg} ${c.border} ${c.text} ${urgency} ${ev.source === "custom" ? "cursor-pointer hover:brightness-125" : "cursor-default"} transition-all`}
          title={ev.title}
        >
          {ev.time && <span className="opacity-70 mr-0.5">{ev.time.slice(0,5)}</span>}
          {ev.title}
        </div>
      );
    }
    return (
      <div
        key={ev.id}
        className={`flex items-start gap-2 p-2.5 rounded-lg border ${c.bg} ${c.border} ${urgency} transition-all`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${c.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-start gap-2">
            <p className={`text-xs font-semibold ${c.text} truncate`}>{ev.title}</p>
            {ev.source === "custom" && (
              <button
                onClick={() => openEditModal(ev)}
                className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors"
                title="Editar evento"
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
          {ev.time && <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={9} />{ev.time}</p>}
          {ev.location && <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={9} />{ev.location}</p>}
          {ev.description && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{ev.description}</p>}
          {ev.source !== "custom" && (
            <span className={`text-[9px] font-bold uppercase tracking-wide mt-1 inline-block ${c.text} opacity-70`}>
              {ev.source === "payment" ? "Cobro de cliente" : "Fin de prueba"}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-500">
            Calendario
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Pagos, pruebas y eventos del equipo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 rounded-lg transition-all"
          >
            Hoy
          </button>
          <button
            onClick={() => openCreateModal(todayYMD)}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/30 active:scale-95"
          >
            <Plus size={16} />
            Nuevo Evento
          </button>
        </div>
      </header>

      {/* ── Upcoming alerts banner ──────────────────────────────────────────────── */}
      {upcomingAlerts.length > 0 && (
        <div className="mb-6 glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BellRing size={15} className="text-amber-400" />
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Próximos 7 días ({upcomingAlerts.length} evento{upcomingAlerts.length !== 1 ? "s" : ""})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingAlerts.slice(0, 10).map((ev) => {
              const d = daysUntil(ev.date);
              const c = COLOR_MAP[ev.color] || COLOR_MAP.blue;
              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${c.bg} ${c.border} text-xs`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                  <span className={`font-semibold ${c.text}`}>{ev.title}</span>
                  <span className="text-slate-500">
                    {d === 0 ? "Hoy" : d === 1 ? "Mañana" : `en ${d} días`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main layout: Calendar + Day Panel ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Calendar grid (3/4 width) */}
        <div className="xl:col-span-3 glass-card p-4 md:p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-100">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="min-h-[80px] md:min-h-[110px] rounded-lg" />;
              }
              const ymd = toYMD(date);
              const isToday = ymd === todayYMD;
              const isSelected = ymd === selectedDay;
              const dayEvents = eventsByDate[ymd] || [];

              return (
                <div
                  key={ymd}
                  onClick={() => setSelectedDay(ymd)}
                  className={`min-h-[80px] md:min-h-[110px] rounded-lg p-1.5 flex flex-col gap-1 cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-orange-600/15 border-orange-500/50"
                      : isToday
                      ? "bg-orange-500/5 border-orange-500/20"
                      : "border-slate-800/40 hover:bg-slate-800/30 hover:border-slate-700/50"
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                        isToday
                          ? "bg-blue-500 text-white"
                          : isSelected
                          ? "text-blue-300"
                          : "text-slate-400"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCreateModal(ymd); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-300 transition-all"
                        title="Añadir evento"
                      >
                        <Plus size={11} />
                      </button>
                    )}
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => renderEventBadge(ev, true))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-slate-500 pl-1">
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-pink-500/30 border border-pink-500/50" />
              Pago de cliente
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" />
              Fin de prueba
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/30 border border-orange-500/50" />
              Evento propio
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-red-500/70 bg-transparent" />
              Urgente (≤3 días)
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-amber-500/50 bg-transparent" />
              Próximo (4–7 días)
            </div>
          </div>
        </div>

        {/* Day panel (1/4 width) */}
        <div className="xl:col-span-1 glass-card p-4 flex flex-col gap-4 max-h-[700px] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar size={14} className="text-orange-400" />
              {selectedDay === todayYMD ? "Hoy" : parseDateLocal(selectedDay).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
            </h3>
            <button
              onClick={() => openCreateModal(selectedDay)}
              className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all"
              title="Añadir evento en este día"
            >
              <Plus size={14} />
            </button>
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-orange-400" />
            </div>
          ) : selectedDayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Calendar size={28} className="text-slate-700" />
              <p className="text-xs text-slate-500">Sin eventos</p>
              <button
                onClick={() => openCreateModal(selectedDay)}
                className="text-xs text-orange-400 hover:text-orange-300 underline transition-colors mt-1"
              >
                Crear uno
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayEvents
                .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
                .map((ev) => renderEventBadge(ev, false))}
            </div>
          )}

          {/* Divider — upcoming next 7 days */}
          <div className="border-t border-slate-800/50 pt-4 mt-2">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BellRing size={10} />
              Próximos 7 días
            </h4>
            {upcomingAlerts.length === 0 ? (
              <p className="text-[10px] text-slate-600">Sin alertas próximas</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {upcomingAlerts.slice(0, 8).map((ev) => {
                  const d = daysUntil(ev.date);
                  const c = COLOR_MAP[ev.color] || COLOR_MAP.blue;
                  return (
                    <div
                      key={`upcoming-${ev.id}`}
                      onClick={() => { setSelectedDay(ev.date); setViewYear(parseInt(ev.date.split("-")[0])); setViewMonth(parseInt(ev.date.split("-")[1]) - 1); }}
                      className={`flex items-center gap-2 text-[10px] px-2 py-1.5 rounded border ${c.bg} ${c.border} cursor-pointer hover:brightness-110 transition-all`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold truncate ${c.text}`}>{ev.title}</p>
                        <p className="text-slate-500">{d === 0 ? "Hoy" : d === 1 ? "Mañana" : `en ${d} días`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Event Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {editingEvent ? <Pencil size={16} className="text-orange-400" /> : <Plus size={16} className="text-orange-400" />}
                {editingEvent ? "Editar Evento" : "Nuevo Evento"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Título *</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Reunión con cliente, Llamada de seguimiento..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hora (opcional)</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={10} />Lugar (opcional)</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ej: Oficina central, Google Meet, Restaurante El Mar..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><AlignLeft size={10} />Descripción (opcional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Notas adicionales sobre el evento..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Color del evento</label>
                <div className="flex gap-2">
                  {COLORS.map((col) => {
                    const c = COLOR_MAP[col];
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setForm({ ...form, color: col })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${c.dot} ${
                          form.color === col ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                        title={col}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <div>
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-950/70 border border-red-900/30 transition-colors disabled:opacity-50"
                    >
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Eliminar
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    {saving ? "Guardando..." : editingEvent ? "Guardar" : "Crear Evento"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
