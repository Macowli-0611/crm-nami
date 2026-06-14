"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, DollarSign, Plus, Loader2, Edit2, Trash2, X, Search, Calendar, Filter, FileText, AlertCircle } from "lucide-react";

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
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

  const categories = ["Planes", "Soporte", "Publicidad", "Servicios", "Suscripciones", "Comisiones", "Sueldos", "Otro"];

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
  }, []);

  const openNewModal = () => {
    setEditingTransaction(null);
    setFormData({
      rowIndex: null,
      type: 'Ingreso',
      date: new Date().toISOString().split('T')[0],
      concept: '',
      category: 'Planes',
      amount: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (t: any) => {
    setEditingTransaction(t);
    
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

      const payload = {
        rowIndex: formData.rowIndex,
        date: formattedDate,
        concept: formData.concept,
        category: formData.category,
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

  return (
    <div className="w-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500">
            Finanzas y Estadísticas
          </h1>
          <p className="text-slate-400 mt-1">Conectado en vivo y bidireccional con tu Google Sheet</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
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
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <h3 className="text-slate-400 text-sm font-medium">Beneficio Neto</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <DollarSign size={20} className="text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-1 relative z-10">
            ${net.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </div>
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
              {Array.from(new Set([...categories, ...uniqueCategories])).map((cat) => (
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
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

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
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
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
