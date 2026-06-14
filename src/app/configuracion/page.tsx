"use client";
import { useState, useEffect } from "react";
import { 
  Paintbrush, 
  MessageSquare, 
  Save, 
  Settings2, 
  Loader2, 
  CheckCircle,
  Plus,
  Trash2
} from "lucide-react";

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [config, setConfig] = useState({
    templates: [] as { id: number; name: string; text: string }[],
    plans: [] as { id: number; name: string; price: number }[],
    pricePlus: 120,
    pricePro: 250
  });

  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/configuracion");
        const data = await res.json();
        if (data.success) {
          setConfig(data.data);
          if (data.data.templates?.length > 0) {
            setActiveTabId(data.data.templates[0].id);
          }
        }
      } catch (e) {
        console.error("Error loading configuration:", e);
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  const addTemplate = () => {
    if (config.templates.length >= 5) {
      alert("Máximo 5 plantillas permitidas.");
      return;
    }
    const existingIds = config.templates.map(t => t.id);
    let nextId = 1;
    while (existingIds.includes(nextId)) {
      nextId++;
    }
    const newTemplate = {
      id: nextId,
      name: `Plantilla ${config.templates.length + 1}`,
      text: `¡Hola [NOMBRE]! 👋\nTe saludamos desde Ñami.`
    };
    setConfig(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
    setActiveTabId(nextId);
  };

  const deleteTemplate = (id: number) => {
    if (config.templates.length <= 1) {
      alert("Debes mantener al menos una plantilla activa.");
      return;
    }
    const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar esta plantilla?");
    if (!confirmDelete) return;

    const updated = config.templates.filter(t => t.id !== id);
    setConfig(prev => ({
      ...prev,
      templates: updated
    }));

    if (activeTabId === id) {
      setActiveTabId(updated[0].id);
    }
  };

  const updateActiveTemplate = (field: 'name' | 'text', val: string) => {
    const updated = config.templates.map(t => {
      if (t.id === activeTabId) {
        return { ...t, [field]: val };
      }
      return t;
    });
    setConfig(prev => ({
      ...prev,
      templates: updated
    }));
  };

  const addPlan = () => {
    if (config.plans.length >= 5) {
      alert("Máximo 5 planes permitidos.");
      return;
    }
    const existingIds = config.plans.map(p => p.id);
    let nextId = 1;
    while (existingIds.includes(nextId)) {
      nextId++;
    }
    const newPlan = {
      id: nextId,
      name: `Plan Nuevo ${config.plans.length + 1}`,
      price: 100
    };
    setConfig(prev => ({
      ...prev,
      plans: [...prev.plans, newPlan]
    }));
  };

  const deletePlan = (id: number) => {
    if (config.plans.length <= 1) {
      alert("Debes mantener al menos un plan activo.");
      return;
    }
    const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este plan?");
    if (!confirmDelete) return;

    setConfig(prev => ({
      ...prev,
      plans: prev.plans.filter(p => p.id !== id)
    }));
  };

  const updatePlan = (id: number, field: 'name' | 'price', val: any) => {
    const updated = config.plans.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          [field]: field === 'price' ? (parseFloat(val) || 0) : val 
        };
      }
      return p;
    });
    setConfig(prev => ({
      ...prev,
      plans: updated
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert("Error al guardar: " + data.error);
      }
    } catch (e) {
      console.error("Error saving configuration:", e);
    }
    setSaving(false);
  };

  const activeTemplate = config.templates.find(t => t.id === activeTabId);

  return (
    <div className="w-full">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Configuración del Sistema
          </h1>
          <p className="text-slate-400 mt-1">Personaliza plantillas y precios sincronizados con Google Sheets</p>
        </div>
        
        <div className="flex items-center gap-4">
          {success && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all animate-pulse">
              <CheckCircle size={14} />
              ¡Guardado con éxito!
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
          <span className="text-slate-400 text-sm">Cargando variables desde Google Sheets...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Editor de Mensajes / Plantillas */}
          <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-400" />
                Plantillas de WhatsApp
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Define y organiza plantillas de mensajes. Puedes usar variables dinámicas:
                <br />
                <code className="bg-slate-800 text-blue-300 px-1 rounded text-[10px] mr-1">[NOMBRE]</code> para el contacto,
                <code className="bg-slate-800 text-blue-300 px-1 rounded text-[10px] mr-1">[LUGAR]</code> para el restaurante,
                <code className="bg-slate-800 text-blue-300 px-1 rounded text-[10px] mr-1">[MESES]</code> para el tiempo de prueba.
              </p>

              {/* Selector de Pestañas (Plantillas) */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800/80 pb-3 items-center">
                {config.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTabId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      activeTabId === t.id
                        ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                        : "bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-800/60"
                    }`}
                  >
                    {t.name || `Plantilla ${t.id}`}
                  </button>
                ))}
                {config.templates.length < 5 && (
                  <button
                    type="button"
                    onClick={addTemplate}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-850 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-all active:scale-95 flex items-center gap-1"
                    title="Añadir plantilla"
                  >
                    <Plus size={12} />
                    <span>Añadir</span>
                  </button>
                )}
              </div>

              {activeTemplate ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nombre de la Plantilla</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activeTemplate.name}
                        onChange={(e) => updateActiveTemplate('name', e.target.value)}
                        className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                        placeholder="Ej: Bienvenida, Cobro Pendiente..."
                      />
                      <button
                        type="button"
                        onClick={() => deleteTemplate(activeTemplate.id)}
                        disabled={config.templates.length <= 1}
                        className="px-3 py-2 rounded-lg bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/30 disabled:opacity-30 transition-colors"
                        title="Eliminar plantilla"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Mensaje de WhatsApp</label>
                    <textarea
                      rows={10}
                      value={activeTemplate.text}
                      onChange={(e) => updateActiveTemplate('text', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200 resize-none font-mono focus:border-blue-500/50 outline-none"
                      placeholder="Escribe el mensaje de la plantilla aquí..."
                    ></textarea>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No hay plantilla seleccionada.
                </div>
              )}
            </div>
          </div>

          {/* Gestor Dinámico de Planes */}
          <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 size={18} className="text-emerald-400" />
                  Planes de Facturación y Precios
                </h2>
                {config.plans.length < 5 && (
                  <button 
                    onClick={addPlan}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-650/30 border border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95"
                  >
                    <Plus size={12} />
                    <span>Añadir Plan</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Define tus planes y precios mensuales. Los cambios afectarán automáticamente a las opciones disponibles para tus clientes y el cálculo del MRR en el Dashboard.
              </p>

              <div className="space-y-3">
                {config.plans.map((p) => (
                  <div key={p.id} className="bg-slate-800/30 border border-slate-700/30 p-4 rounded-xl flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mb-1">Nombre del Plan</label>
                      <input 
                        type="text" 
                        value={p.name} 
                        onChange={(e) => updatePlan(p.id, 'name', e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50" 
                        placeholder="Ej: Básico, Plus..."
                      />
                    </div>
                    
                    <div className="w-32">
                      <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mb-1">Precio Mensual</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-sm font-semibold">$</span>
                        <input 
                          type="number" 
                          value={p.price} 
                          onChange={(e) => updatePlan(p.id, 'price', e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50" 
                        />
                      </div>
                    </div>

                    <div className="self-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => deletePlan(p.id)}
                        disabled={config.plans.length <= 1}
                        className="p-2 rounded-lg bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/30 disabled:opacity-30 transition-colors"
                        title="Eliminar Plan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-950/20 border border-blue-900/20 p-4 rounded-xl mt-6 text-xs text-blue-400">
              💡 <strong>Tip:</strong> Al renombrar o cambiar los precios, los nuevos valores impactarán de inmediato en los formularios de clientes y cobros del CRM.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
