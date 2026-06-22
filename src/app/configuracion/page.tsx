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
    plans: [] as { id: number; name: string; subplans: { id: number; name: string; price: number }[] }[],
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
    const existingIds = config.plans.map(p => p.id);
    let nextId = 1;
    while (existingIds.includes(nextId)) {
      nextId++;
    }
    const newPlan = {
      id: nextId,
      name: `Plan Nuevo ${config.plans.length + 1}`,
      subplans: [
        { id: 1, name: "Estándar", price: 100 }
      ]
    };
    setConfig(prev => ({
      ...prev,
      plans: [...prev.plans, newPlan]
    }));
  };

  const deletePlan = (id: number) => {
    const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este plan principal y todas sus tarifas?");
    if (!confirmDelete) return;

    setConfig(prev => ({
      ...prev,
      plans: prev.plans.filter(p => p.id !== id)
    }));
  };

  const updatePlanName = (id: number, val: string) => {
    const updated = config.plans.map(p => {
      if (p.id === id) {
        return { ...p, name: val };
      }
      return p;
    });
    setConfig(prev => ({
      ...prev,
      plans: updated
    }));
  };

  const addSubplan = (planId: number) => {
    const updated = config.plans.map(p => {
      if (p.id === planId) {
        const subplans = p.subplans || [];
        const existingIds = subplans.map(s => s.id);
        let nextId = 1;
        while (existingIds.includes(nextId)) {
          nextId++;
        }
        const newSub = {
          id: nextId,
          name: `Tarifa ${subplans.length + 1}`,
          price: 100
        };
        return {
          ...p,
          subplans: [...subplans, newSub]
        };
      }
      return p;
    });
    setConfig(prev => ({
      ...prev,
      plans: updated
    }));
  };

  const deleteSubplan = (planId: number, subId: number) => {
    const plan = config.plans.find(p => p.id === planId);
    if (plan && (plan.subplans || []).length <= 1) {
      alert("Debes mantener al menos una tarifa/subcategoría de precio para este plan.");
      return;
    }
    const updated = config.plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          subplans: (p.subplans || []).filter(s => s.id !== subId)
        };
      }
      return p;
    });
    setConfig(prev => ({
      ...prev,
      plans: updated
    }));
  };

  const updateSubplan = (planId: number, subId: number, field: 'name' | 'price', val: any) => {
    const updated = config.plans.map(p => {
      if (p.id === planId) {
        const updatedSubs = (p.subplans || []).map(s => {
          if (s.id === subId) {
            return {
              ...s,
              [field]: field === 'price' ? (parseFloat(val) || 0) : val
            };
          }
          return s;
        });
        return {
          ...p,
          subplans: updatedSubs
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
    // Validate plans have subplans
    for (const p of config.plans) {
      if (!p.subplans || p.subplans.length === 0) {
        alert(`El plan "${p.name}" debe tener al menos una subcategoría de precio.`);
        return;
      }
    }

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
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-500">
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
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/30 active:scale-95"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-orange-500 h-10 w-10" />
          <span className="text-slate-400 text-sm">Cargando variables desde Google Sheets...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Editor de Mensajes / Plantillas */}
          <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-400" />
                Plantillas de WhatsApp
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Define y organiza plantillas de mensajes. Puedes usar variables dinámicas:
                <br />
                <code className="bg-slate-800 text-orange-300 px-1 rounded text-[10px] mr-1">[NOMBRE]</code> para el contacto,
                <code className="bg-slate-800 text-orange-300 px-1 rounded text-[10px] mr-1">[LUGAR]</code> para el restaurante,
                <code className="bg-slate-800 text-orange-300 px-1 rounded text-[10px] mr-1">[MESES]</code> para el tiempo de prueba.
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
                        ? "bg-orange-600/20 text-orange-400 border-orange-500/40"
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
                <button 
                  onClick={addPlan}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-650/30 border border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95"
                >
                  <Plus size={12} />
                  <span>Añadir Plan</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Define tus planes principales y añade subcategorías (tarifas) con sus precios mensuales correspondientes.
              </p>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {config.plans.map((p) => (
                  <div key={p.id} className="bg-slate-800/30 border border-slate-700/30 p-4 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mb-1">Nombre del Plan Principal</label>
                        <input 
                          type="text" 
                          value={p.name} 
                          onChange={(e) => updatePlanName(p.id, e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50" 
                          placeholder="Ej: Facturación Electrónica, Agente IA..."
                        />
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

                    {/* Subcategories */}
                    <div className="pl-4 border-l border-slate-750 space-y-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subcategorías y Tarifas</span>
                        <button 
                          onClick={() => addSubplan(p.id)}
                          className="px-2 py-0.5 rounded text-[10px] bg-emerald-600/10 text-emerald-450 hover:bg-emerald-600/20 border border-emerald-500/25 transition-all flex items-center gap-0.5"
                        >
                          <Plus size={10} />
                          <span>Tarifa</span>
                        </button>
                      </div>

                      {p.subplans?.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={sub.name} 
                              onChange={(e) => updateSubplan(p.id, sub.id, 'name', e.target.value)}
                              className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500/40" 
                              placeholder="Ej: Básico, 200 folios, etc."
                            />
                          </div>

                          <div className="w-24">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 text-xs">$</span>
                              <input 
                                type="number" 
                                value={sub.price} 
                                onChange={(e) => updateSubplan(p.id, sub.id, 'price', e.target.value)}
                                className="w-full bg-slate-900/40 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500/40" 
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteSubplan(p.id, sub.id)}
                            disabled={(p.subplans || []).length <= 1}
                            className="p-1 rounded bg-red-950/10 hover:bg-red-900/20 text-red-400 disabled:opacity-30 transition-colors"
                            title="Eliminar Tarifa"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-950/20 border border-orange-900/20 p-4 rounded-xl mt-6 text-xs text-orange-400">
              💡 <strong>Tip:</strong> Al renombrar o cambiar los precios, los nuevos valores impactarán de inmediato en los formularios de clientes y cobros del CRM.
            </div>
          </div>

          {/* ── System Overview (full-width) ───────────────────────────────────── */}
          <div className="lg:col-span-2 glass border border-slate-700/30 rounded-xl p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Left: label */}
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20 shrink-0">
                  <Paintbrush size={20} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">Estado de la Configuración</h3>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                    Todo se sincroniza automáticamente con Google Sheets. Los cambios aplican en toda la app al guardar.
                  </p>
                </div>
              </div>

              {/* Right: quick stats */}
              <div className="flex flex-wrap gap-6 shrink-0">
                {[
                  { label: "Plantillas WA", value: config.templates.length, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                  { label: "Planes", value: config.plans.length, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                  { label: "Tarifas totales", value: config.plans.reduce((acc, p) => acc + (p.subplans?.length || 0), 0), color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className={`flex flex-col items-center px-4 py-2.5 rounded-xl border ${bg} ${border}`}>
                    <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync indicator */}
            <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-2 text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Configuración activa y sincronizada con Google Sheets — los precios y plantillas afectan la sección de Clientes y los cobros automáticos en tiempo real.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
