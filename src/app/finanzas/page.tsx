"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, DollarSign, Plus, Loader2, Edit2, Trash2, X, Search, Calendar, Filter, FileText, AlertCircle } from "lucide-react";

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  // Offline state
  const [isOffline, setIsOffline] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    rowIndex: null as number | null,
    type: 'Ingreso',
    date: new Date().toISOString().split('T')[0],
    concept: '',
    category: 'Planes',
    amount: '',
    notes: ''
  });

  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/finanzas');
      const data = await res.json();
      if(data.success) {
        setTransactions(data.data);
        setIsOffline(false);
        // Save cache
        localStorage.setItem("nami_cached_transactions", JSON.stringify(data.data));
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      console.error("Error fetching transactions:", e);
      setIsOffline(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Instant render from cache if available
    const cached = localStorage.getItem("nami_cached_transactions");
    if (cached) {
      try {
        setTransactions(JSON.parse(cached));
        setLoading(false); // Hide spinner early since we have cache
      } catch (e) {}
    }

    loadTransactions();

    // Fetch config for categories
    fetch("/api/configuracion")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.categories) {
          setCategories(data.data.categories);
        } else {
          setCategories(["Planes", "Soporte", "Publicidad", "Servicios", "Suscripciones", "Comisiones", "Sueldos", "Otro"]);
        }
      })
      .catch(e => {
        console.error("Error loading categories config:", e);
        setCategories(["Planes", "Soporte", "Publicidad", "Servicios", "Suscripciones", "Comisiones", "Sueldos", "Otro"]);
      });
  }, []);

  const openNewModal = () => {
    setEditingTransaction(null);
    setNewCategoryName("");
    setFormData({
      rowIndex: null,
      type: 'Ingreso',
      date: new Date().toISOString().split('T')[0],
      concept: '',
      category: categories[0] || 'Planes',
      amount: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (t: any) => {
    setEditingTransaction(t);
    setNewCategoryName("");
    
    // Parse date from DD/MM/YYYY to YYYY-MM-DD
    let formattedDate = '';
    if (t.date) {
      const parts = t.date.split('/');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        const testDate = new Date(t.date);
        if (!isNaN(testDate.getTime())) {
          formattedDate = testDate.toISOString().split('T')[0];
        } else {
          formattedDate = t.date;
        }
      }
    } else {
      formattedDate = new Date().toISOString().split('T')[0];
    }

    const absAmount = Math.abs(t.amount);

    setFormData({
      rowIndex: t.rowIndex,
      type: t.amount >= 0 ? 'Ingreso' : 'Gasto',
      date: formattedDate,
      concept: t.concept || '',
      category: t.category || 'Planes',
      amount: absAmount.toString(),
      notes: t.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalAmount = formData.type === 'Ingreso' 
        ? parseFloat(formData.amount) 
        : -Math.abs(parseFloat(formData.amount));

      // Date format for the spreadsheet DD/MM/YYYY
      const dateParts = formData.date.split('-');
      const formattedDate = dateParts.length === 3 
        ? `${parseInt(dateParts[2])}/${parseInt(dateParts[1])}/${dateParts[0]}`
        : formData.date;

      const categoryToSave = formData.category === 'NEW_CATEGORY' ? newCategoryName.trim() : formData.category;

      const payload = {
        rowIndex: formData.rowIndex,
        date: formattedDate,
        concept: formData.concept,
        category: categoryToSave,
        amount: finalAmount,
        notes: formData.notes
      };

      const method = editingTransaction ? 'PUT' : 'POST';
      const response = await fetch('/api/finanzas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        // If a new category was created, save it to the config
        if (formData.category === 'NEW_CATEGORY' && categoryToSave) {
          try {
            const configRes = await fetch("/api/configuracion");
            const configData = await configRes.json();
            if (configData.success) {
              const updatedCategories = Array.from(new Set([...(configData.data.categories || categories), categoryToSave]));
              const newConfig = {
                ...configData.data,
                categories: updatedCategories
              };
              await fetch("/api/configuracion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newConfig)
              });
              setCategories(updatedCategories);
            }
          } catch (err) {
            console.error("Failed to save new category in config:", err);
          }
        }

        setNewCategoryName("");
        await loadTransactions();
        setShowModal(false);
      } else {
        alert("Error al guardar transacción: " + data.error);
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!formData.rowIndex) return;
    if (!confirm(`¿Estás seguro de eliminar este movimiento contable? Esta acción modificará tu historial financiero en Google Sheets.`)) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/finanzas?rowIndex=${formData.rowIndex}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await loadTransactions();
        setShowModal(false);
      } else {
        alert("Error al eliminar transacción: " + data.error);
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
    setDeleting(false);
  };

  // Helper calculations
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.amount < 0).reduce((acc, curr) => acc + curr.amount, 0);
  const net = totalIncome + totalExpense;

  // Filter Logics
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = 
      typeFilter === "Todos" ||
      (typeFilter === "Ingresos" && t.amount >= 0) ||
      (typeFilter === "Gastos" && t.amount < 0);

    const matchesCategory = categoryFilter === "Todos" || t.category === categoryFilter;

    // Date range filter
    let matchesDate = true;
    if (t.date) {
      let tDate = new Date();
      const parts = t.date.split('/');
      if (parts.length === 3) {
        tDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        tDate = new Date(t.date);
      }

      if (!isNaN(tDate.getTime())) {
        if (startDate) {
          const sDate = new Date(startDate);
          sDate.setHours(0,0,0,0);
          if (tDate < sDate) matchesDate = false;
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23,59,59,999);
          if (tDate > eDate) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesType && matchesCategory && matchesDate;
  });

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...categories, ...uniqueCategories]));

  // Analytics Calculations for Charts
  const categoryStats = filteredTransactions.reduce((acc: any, t) => {
    const cat = t.category || "Otros";
    if (!acc[cat]) {
      acc[cat] = { income: 0, expense: 0 };
    }
    if (t.amount >= 0) {
      acc[cat].income += t.amount;
    } else {
      acc[cat].expense += Math.abs(t.amount);
    }
    return acc;
  }, {});

  const maxVal = Math.max(...Object.values(categoryStats).map((s: any) => Math.max(s.income, s.expense)), 1);

  const totalExpenses = Object.values(categoryStats).reduce((sum: number, s: any) => sum + s.expense, 0);

  const expenseCategories = Object.keys(categoryStats)
    .map(cat => ({
      name: cat,
      value: categoryStats[cat].expense,
      percent: totalExpenses > 0 ? (categoryStats[cat].expense / totalExpenses) * 100 : 0
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Colors for donut chart
  const donutColors = [
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#a855f7", // Purple
    "#f59e0b", // Amber
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#6366f1"  // Indigo
  ];

  return (
    <div className="w-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-500">
            Finanzas y Estadísticas
          </h1>
          <p className="text-slate-400 mt-1">Conectado en vivo y bidireccional con tu Google Sheet</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/30 active:scale-95"
        >
          <Plus size={16} />
          Nuevo Movimiento
        </button>
      </header>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} className="shrink-0" />
          <span>Sin conexión a internet. Mostrando los movimientos contables guardados localmente.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Ingresos Totales</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ArrowUpRight size={20} className="text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-50 mb-1">${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="glass-card p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Gastos Totales</h3>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ArrowDownRight size={20} className="text-red-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-50 mb-1">${Math.abs(totalExpense).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-orange-500/20 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <h3 className="text-slate-400 text-sm font-medium">Beneficio Neto</h3>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <DollarSign size={20} className="text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 mb-1 relative z-10">
            ${net.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Analítica y Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in">
        {/* Gráfico 1: Comparativa de Ingresos vs Gastos */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Ingresos vs Gastos por Categoría</h3>
          <p className="text-xs text-slate-450 mb-6">Comparación acumulada en el período seleccionado</p>
          
          {Object.keys(categoryStats).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-slate-500">
              No hay datos para mostrar en este período.
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {Object.keys(categoryStats).map((cat) => {
                const stats = categoryStats[cat];
                const incPercent = (stats.income / maxVal) * 100;
                const expPercent = (stats.expense / maxVal) * 100;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-350">{cat}</span>
                      <span className="text-slate-400">
                        {stats.income > 0 && <span className="text-emerald-400 mr-2">+$ {stats.income.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>}
                        {stats.expense > 0 && <span className="text-red-400">-$ {stats.expense.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>}
                      </span>
                    </div>
                    <div className="space-y-1 pl-1">
                      {/* Barra Ingresos */}
                      {stats.income > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-emerald-500/80 w-6 shrink-0 font-semibold">ING</span>
                          <div className="flex-1 bg-slate-900/50 rounded-full h-2.5 overflow-hidden border border-slate-800/30">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${incPercent}%` }}></div>
                          </div>
                        </div>
                      )}
                      {/* Barra Gastos */}
                      {stats.expense > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-red-500/80 w-6 shrink-0 font-semibold">GAS</span>
                          <div className="flex-1 bg-slate-900/50 rounded-full h-2.5 overflow-hidden border border-slate-800/30">
                            <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${expPercent}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico 2: Distribución de Gastos */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Distribución de Gastos</h3>
            <p className="text-xs text-slate-450 mb-6">Proporción de egresos por categoría</p>
          </div>

          {totalExpenses === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-slate-500">
              No hay gastos registrados en este período.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Donut Chart SVG */}
              <div className="flex justify-center relative">
                <svg width="150" height="150" viewBox="0 0 160 160" className="transform -rotate-90">
                  {(() => {
                    let accumulatedPercent = 0;
                    const radius = 50;
                    const circumference = 2 * Math.PI * radius; // 314.16

                    return expenseCategories.map((item, idx) => {
                      const color = donutColors[idx % donutColors.length];
                      const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = `${- (accumulatedPercent / 100) * circumference}`;
                      accumulatedPercent += item.percent;

                      return (
                        <circle
                          key={item.name}
                          r={radius}
                          cx="80"
                          cy="80"
                          fill="transparent"
                          stroke={color}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 hover:stroke-white cursor-pointer"
                        >
                          <title>{`${item.name}: ${item.percent.toFixed(1)}%`}</title>
                        </circle>
                      );
                    });
                  })()}
                  {/* Inner cutout for donut */}
                  <circle r="40" cx="80" cy="80" fill="#0d1527" /> {/* Matches card dark background */}
                </svg>
                {/* Center text showing Total Expense */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Total Gastos</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5">
                    ${totalExpenses.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {expenseCategories.map((item, idx) => {
                  const color = donutColors[idx % donutColors.length];
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                        <span className="text-slate-300 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-255 shrink-0">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="glass-card p-4 mb-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Filter size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Filtros de Búsqueda</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative glass rounded-xl px-3 py-2 flex items-center md:col-span-2">
            <Search size={16} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar por concepto, categoría o notas..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <div>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full glass border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
            >
              <option value="Todos">Todos los Tipos</option>
              <option value="Ingresos">Ingresos (+)</option>
              <option value="Gastos">Gastos (-)</option>
            </select>
          </div>

          <div>
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full glass border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
            >
              <option value="Todos">Todas las Categorías</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="flex gap-2 items-center col-span-1 md:col-span-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              title="Fecha inicial"
              className="w-full glass border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
            />
            <span className="text-slate-500 text-xs shrink-0">a</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              title="Fecha final"
              className="w-full glass border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center justify-between">
          <span>Historial Financiero</span>
          <span className="text-xs font-normal text-slate-400">Total filtrados: {filteredTransactions.length}</span>
        </h2>
        <div className="overflow-x-auto">
          {loading && transactions.length === 0 ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-500 h-8 w-8" /></div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead className="text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Concepto / Cliente</th>
                  <th className="pb-3 font-medium">Categoría</th>
                  <th className="pb-3 font-medium">Notas</th>
                  <th className="pb-3 font-medium text-right">Monto</th>
                  <th className="pb-3 font-medium text-right">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTransactions.map((t) => {
                  const isIncome = t.amount > 0;
                  return (
                    <tr key={t.rowIndex} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="py-4 text-slate-400">{t.date}</td>
                      <td className="py-4 font-bold text-slate-200">{t.concept}</td>
                      <td className="py-4 text-slate-400">
                        <span className="bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded text-xs">
                          {t.category || 'Otros'}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-slate-400 max-w-[200px] truncate" title={t.notes}>
                        {t.notes || '-'}
                      </td>
                      <td className={`py-4 text-right font-bold text-base ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isIncome ? '+' : '-'}${Math.abs(t.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors inline-flex"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No hay transacciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                {editingTransaction ? <Edit2 size={18} className="text-emerald-400" /> : <Plus size={18} className="text-emerald-400" />}
                {editingTransaction ? 'Editar Movimiento' : 'Registrar Movimiento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'Ingreso'})}
                    className={`py-2 px-4 rounded-lg text-sm font-semibold border flex justify-center items-center gap-2 transition-all ${
                      formData.type === 'Ingreso' 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-900/10' 
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <ArrowUpRight size={16} />
                    Ingreso (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'Gasto'})}
                    className={`py-2 px-4 rounded-lg text-sm font-semibold border flex justify-center items-center gap-2 transition-all ${
                      formData.type === 'Gasto' 
                        ? 'bg-red-500/10 border-red-500 text-red-400 shadow-md shadow-red-900/10' 
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <ArrowDownRight size={16} />
                    Gasto (-)
                  </button>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Monto ($) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha (Calendario) *</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Concept */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Concepto / Cliente *</label>
                <input
                  required
                  type="text"
                  value={formData.concept}
                  onChange={e => setFormData({...formData, concept: e.target.value})}
                  placeholder="Ej: Pago Pizzería Napoli - Plan Pro"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 font-semibold"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="NEW_CATEGORY" className="text-emerald-450 font-bold">+ Crear Nueva Categoría...</option>
                </select>
              </div>

              {formData.category === 'NEW_CATEGORY' && (
                <div className="animate-fade-in">
                  <label className="block text-xs text-slate-400 mb-1">Nombre de la Nueva Categoría *</label>
                  <input
                    required
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Mantenimiento, Hosting, Impuestos..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notas / Descripción adicional</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Escribe comentarios de la transacción aquí..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none outline-none focus:border-emerald-500/50 transition-colors"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <div>
                  {editingTransaction && (
                    <button 
                      type="button" 
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="bg-red-950/40 text-red-400 hover:bg-red-950/85 border border-red-900/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Eliminar
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving || deleting} 
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? 'Guardando...' : editingTransaction ? 'Guardar Cambios' : 'Registrar'}
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
