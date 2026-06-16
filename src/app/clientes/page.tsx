"use client";
import { useState, useEffect } from "react";
import { Search, Plus, MapPin, Phone, Calendar, X, Loader2, Edit2, Trash2, MessageSquare, User, Award, Trash, DollarSign, CheckCircle, AlertCircle } from "lucide-react";

interface Contact {
  name: string;
  phone: string;
}

export default function ClientesPage() {
  const [showModal, setShowModal] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  
  // Offline state
  const [isOffline, setIsOffline] = useState(false);
  
  // Custom WhatsApp templates loaded from sheet config
  const [templates, setTemplates] = useState<any[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [whatsappActiveContact, setWhatsappActiveContact] = useState<{
    phone: string;
    contactName: string;
    clientName: string;
    testMonths: string;
  } | null>(null);
  const [planes, setPlanes] = useState<any[]>([]);
  
  // Loading state for specific rows when quick-billing is triggered
  const [billingRows, setBillingRows] = useState<{ [key: number]: boolean }>({});

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [interestFilter, setInterestFilter] = useState("Todos");
  const [planFilter, setPlanFilter] = useState("Todos");

  // Form state
  const [formData, setFormData] = useState({
    rowIndex: null as number | null,
    name: '',
    type: '',
    zone: '',
    contacts: [{ name: '', phone: '' }] as Contact[],
    status: 'Sin visitar',
    interest: 'Alto',
    nextAction: '',
    testMonths: '',
    notes: '',
    plan: 'Ninguno',
    payDate: '',
  });

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clientes');
      const data = await res.json();
      if(data.success) {
        setClientes(data.data);
        setIsOffline(false);
        // Save cache
        localStorage.setItem("nami_cached_clients", JSON.stringify(data.data));
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      setIsOffline(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Instant render from cache if available
    const cached = localStorage.getItem("nami_cached_clients");
    if (cached) {
      try {
        setClientes(JSON.parse(cached));
        setLoading(false); // Hide spinner early since we have cache
      } catch (e) {}
    }

    loadClients();
    
    // Load config dynamic WhatsApp templates and billing plans
    fetch("/api/configuracion")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTemplates(data.data.templates || []);
          setPlanes(data.data.plans || []);
          if (data.data.templates?.length > 0) {
            setSelectedTemplateId(data.data.templates[0].id);
          }
        }
      })
      .catch(e => console.error("Error loading config inside ClientesPage:", e));
  }, []);

  const openNewModal = () => {
    setEditingClient(null);
    setFormData({
      rowIndex: null,
      name: '',
      type: '',
      zone: '',
      contacts: [{ name: '', phone: '' }],
      status: 'Sin visitar',
      interest: 'Alto',
      nextAction: '',
      testMonths: '',
      notes: '',
      plan: 'Ninguno',
      payDate: ''
    });
    setShowModal(true);
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    
    // Parse testMonths to YYYY-MM-DD
    let parsedDate = '';
    if (client.testMonths) {
      const testDate = new Date(client.testMonths);
      if (!isNaN(testDate.getTime())) {
        parsedDate = testDate.toISOString().split('T')[0];
      } else {
        const parts = client.testMonths.split('/');
        if (parts.length === 3) {
          const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          const tryDate = new Date(formatted);
          if (!isNaN(tryDate.getTime())) {
            parsedDate = formatted;
          } else {
            parsedDate = client.testMonths;
          }
        } else {
          parsedDate = client.testMonths;
        }
      }
    }

    // Parse payDate to YYYY-MM-DD
    let parsedPayDate = '';
    if (client.payDate) {
      const payDateObj = new Date(client.payDate);
      if (!isNaN(payDateObj.getTime())) {
        parsedPayDate = payDateObj.toISOString().split('T')[0];
      } else {
        const parts = client.payDate.split('/');
        if (parts.length === 3) {
          const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          const tryDate = new Date(formatted);
          if (!isNaN(tryDate.getTime())) {
            parsedPayDate = formatted;
          } else {
            parsedPayDate = client.payDate;
          }
        } else {
          parsedPayDate = client.payDate;
        }
      }
    }

    // Parse multiple contacts
    const names = (client.contactName || '').split('/').map((s: string) => s.trim());
    const phones = (client.phone || '').split('/').map((s: string) => s.trim());
    const maxLength = Math.max(names.length, phones.length, 1);
    
    const contactsList: Contact[] = [];
    for (let i = 0; i < maxLength; i++) {
      contactsList.push({
        name: names[i] || '',
        phone: phones[i] || ''
      });
    }

    setFormData({
      rowIndex: client.rowIndex,
      name: client.name || '',
      type: client.type || '',
      zone: client.zone || '',
      contacts: contactsList,
      status: client.status || 'Sin visitar',
      interest: client.interest || 'Alto',
      nextAction: client.nextAction || '',
      testMonths: parsedDate,
      notes: client.notes || '',
      plan: client.plan || 'Ninguno',
      payDate: parsedPayDate,
    });
    setShowModal(true);
  };

  const addContactField = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', phone: '' }]
    });
  };

  const removeContactField = (index: number) => {
    const newContacts = formData.contacts.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      contacts: newContacts.length > 0 ? newContacts : [{ name: '', phone: '' }]
    });
  };

  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    const newContacts = formData.contacts.map((c, i) => {
      if (i === index) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setFormData({ ...formData, contacts: newContacts });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    const contactNames = formData.contacts.map(c => c.name.trim()).filter(Boolean).join(' / ');
    const phones = formData.contacts.map(c => c.phone.trim()).filter(Boolean).join(' / ');

    const payload = {
      rowIndex: formData.rowIndex,
      name: formData.name,
      type: formData.type,
      zone: formData.zone,
      phone: phones,
      contactName: contactNames,
      status: formData.status,
      interest: formData.interest,
      nextAction: formData.nextAction,
      testMonths: formData.testMonths,
      notes: formData.notes,
      plan: formData.plan,
      payDate: formData.payDate
    };

    try {
      const method = editingClient ? 'PUT' : 'POST';
      const response = await fetch('/api/clientes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();
      if (resData.success) {
        await loadClients();
        setShowModal(false);
      } else {
        alert("Error al guardar: " + resData.error);
      }
    } catch (error) {
      console.error("Error saving client:", error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!formData.rowIndex) return;
    if (!confirm(`¿Estás seguro de eliminar permanentemente a "${formData.name}"? Esta acción borrará la fila en el Excel de forma definitiva.`)) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientes?rowIndex=${formData.rowIndex}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (resData.success) {
        await loadClients();
        setShowModal(false);
      } else {
        alert("Error al eliminar: " + resData.error);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
    }
    setDeleting(false);
  };

  // Quick billing trigger
  const handleQuickBilling = async (client: any) => {
    const { rowIndex, name, plan, payDate } = client;
    if (!plan || plan === 'Ninguno') {
      alert("Este cliente no tiene un plan de pago contratado.");
      return;
    }

    const nextMonthExpected = new Date();
    if (payDate) {
      const parsed = new Date(payDate);
      if (!isNaN(parsed.getTime())) {
        nextMonthExpected.setTime(parsed.getTime());
      }
    }
    nextMonthExpected.setMonth(nextMonthExpected.getMonth() + 1);
    const nextPayStr = nextMonthExpected.toISOString().split('T')[0];

    if (!confirm(`¿Registrar pago mensual de "${name}"?
- Plan: ${plan}
- Nueva fecha de cobro: ${nextPayStr}
- Se ingresará el cobro automáticamente en el Módulo de Finanzas.`)) return;

    setBillingRows(prev => ({ ...prev, [rowIndex]: true }));
    try {
      const res = await fetch('/api/clientes/cobrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex,
          name,
          plan,
          payDate
        })
      });
      const resData = await res.json();
      if (resData.success) {
        alert(`¡Pago registrado con éxito!
- Nueva fecha de cobro: ${resData.nextPayDate}
- Ingreso registrado: $${resData.amountRecorded}`);
        await loadClients();
      } else {
        alert("Error al procesar el cobro: " + resData.error);
      }
    } catch (e) {
      console.error("Error processing quick billing:", e);
    }
    setBillingRows(prev => ({ ...prev, [rowIndex]: false }));
  };

  // Open WhatsApp template selection modal
  const handleWhatsAppSend = (e: React.MouseEvent, phone: string, contactName: string, clientName: string, testMonths: string) => {
    e.stopPropagation(); // Avoid whole-row click trigger
    setWhatsappActiveContact({
      phone,
      contactName,
      clientName,
      testMonths
    });
    if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
    setShowWhatsAppModal(true);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('activo') || s.includes('cerrado')) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s.includes('cita') || s.includes('interesado')) return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    if (s.includes('pendiente')) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (s.includes('no interesado')) return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const getInterestColor = (interest: string) => {
    const i = interest.toLowerCase();
    if (i === 'alto') return "text-red-400 bg-red-500/10 border-red-500/20";
    if (i === 'medio') return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  };

  const getPlanBadge = (plan: string) => {
    const p = (plan || 'Ninguno').toLowerCase();
    if (p.includes('pro')) return "bg-violet-500/20 text-violet-400 border-violet-500/30 font-bold";
    if (p.includes('plus')) return "bg-blue-500/20 text-blue-400 border-blue-500/30 font-bold";
    if (p.includes('custom') || p.includes('personalizado')) return "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 font-bold";
    return "bg-slate-800/60 text-slate-400 border-slate-700/50";
  };

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return null;
    let testDate = new Date(dateStr);
    
    if (isNaN(testDate.getTime())) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        testDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }

    if (isNaN(testDate.getTime())) {
      return dateStr;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    testDate.setHours(0, 0, 0, 0);

    const diffTime = testDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Venció hace ${Math.abs(diffDays)} días`;
    if (diffDays === 0) return 'Vence hoy';
    return `Quedan ${diffDays} días`;
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  };

  const parseContactsForTable = (contactName: string, phone: string) => {
    const names = (contactName || '').split('/').map((s: string) => s.trim());
    const phones = (phone || '').split('/').map((s: string) => s.trim());
    const maxLength = Math.max(names.length, phones.length, 1);
    
    const list: Contact[] = [];
    for (let i = 0; i < maxLength; i++) {
      if (names[i] || phones[i]) {
        list.push({
          name: names[i] || 'Contacto',
          phone: phones[i] || ''
        });
      }
    }
    return list;
  };

  // Filter logic
  const filteredClientes = clientes.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.zone.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === "Todos" || c.status === statusFilter;
    const matchesInterest = interestFilter === "Todos" || c.interest === interestFilter;
    
    let matchesPlan = true;
    if (planFilter !== "Todos") {
      const currentPlan = c.plan || 'Ninguno';
      if (planFilter === "Ninguno") {
        matchesPlan = currentPlan === '' || currentPlan === 'Ninguno';
      } else {
        matchesPlan = currentPlan.toLowerCase().includes(planFilter.toLowerCase());
      }
    }
    
    return matchesSearch && matchesStatus && matchesInterest && matchesPlan;
  }).sort((a, b) => {
    const statusPriority: { [key: string]: number } = {
      'cliente activo': 1,
      'cita / interesado': 2,
      'pendiente': 3,
      'no interesado': 4,
      'sin visitar': 5
    };
    const aPriority = statusPriority[(a.status || '').toLowerCase()] || 99;
    const bPriority = statusPriority[(b.status || '').toLowerCase()] || 99;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // Stable sort fallback by rowIndex to maintain sheet order
    return (a.rowIndex || 0) - (b.rowIndex || 0);
  });

  return (
    <div className="w-full relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Base de Clientes
          </h1>
          <p className="text-slate-400 mt-1">Gestión bidireccional en tiempo real con Google Sheets</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-900/30 active:scale-95"
        >
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </header>

      {/* Filters Area */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="relative glass rounded-xl px-4 py-2 flex items-center md:col-span-2">
          <Search size={18} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Buscar por lugar, contacto, zona o celular..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-slate-200 placeholder:text-slate-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full glass border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50"
          >
            <option value="Todos">Todos los Estados</option>
            <option value="Cliente activo">Cliente activo</option>
            <option value="Cita / Interesado">Cita / Interesado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="No interesado">No interesado</option>
            <option value="Sin visitar">Sin visitar</option>
          </select>
        </div>

        <div>
          <select 
            value={planFilter} 
            onChange={e => setPlanFilter(e.target.value)}
            className="w-full glass border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 font-semibold animate-pulse-none"
          >
            <option value="Todos">Todos los Planes</option>
            {planes.map(p => (
              <option key={p.id} value={`Plan ${p.name}`}>Plan {p.name}</option>
            ))}
            <option value="Custom">Plan Custom</option>
            <option value="Ninguno">Sin Plan / Prueba</option>
          </select>
        </div>

        <div>
          <select 
            value={interestFilter} 
            onChange={e => setInterestFilter(e.target.value)}
            className="w-full glass border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50"
          >
            <option value="Todos">Cualquier Interés</option>
            <option value="Alto">Alto</option>
            <option value="Medio">Medio</option>
            <option value="Bajo">Bajo</option>
          </select>
        </div>
      </div>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} className="shrink-0" />
          <span>Sin conexión a internet. Mostrando los datos de la última sincronización local.</span>
        </div>
      )}

      {/* Table Card */}
      <div className="glass-card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          {loading && clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-blue-500 h-8 w-8" />
              <span className="text-slate-400 text-sm">Obteniendo datos de Google Sheets...</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[1150px]">
              <thead className="text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="pb-3 font-medium">Lugar / Negocio</th>
                  <th className="pb-3 font-medium">Contactos</th>
                  <th className="pb-3 font-medium">Estado / Interés</th>
                  <th className="pb-3 font-medium">Plan contratado</th>
                  <th className="pb-3 font-medium">Próximo Pago</th>
                  <th className="pb-3 font-medium">Acción & Prueba</th>
                  <th className="pb-3 font-medium">Notas</th>
                  <th className="pb-3 font-medium text-right">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredClientes.map((c) => {
                  const tableContacts = parseContactsForTable(c.contactName, c.phone);
                  const isPayingPlan = c.plan && c.plan !== 'Ninguno';
                  const isRowBilling = billingRows[c.rowIndex] || false;
                  
                  return (
                    <tr 
                      key={c.rowIndex} 
                      onClick={() => openEditModal(c)}
                      className="hover:bg-slate-800/20 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 pr-3">
                        <div className="font-bold text-slate-100 text-base">{c.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin size={12} className="text-blue-400" /> {c.zone} {c.type ? `• ${c.type}` : ''}
                        </div>
                      </td>
                      <td className="py-4 pr-3">
                        <div className="space-y-2">
                          {tableContacts.map((contact, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <div className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                                <User size={11} className="text-slate-400" />
                                {contact.name}
                              </div>
                              {contact.phone && (
                                <button 
                                  onClick={(e) => handleWhatsAppSend(e, contact.phone, contact.name, c.name, c.testMonths)}
                                  className="text-[10px] flex items-center gap-1 bg-slate-800/40 border border-slate-700/50 px-2 py-0.5 rounded w-max text-slate-400 hover:border-emerald-500/50 hover:text-slate-200 transition-all cursor-pointer"
                                  title="Enviar WhatsApp con plantilla automática"
                                >
                                  <Phone size={9} className="text-emerald-400 shrink-0" />
                                  <span>{contact.phone}</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-3">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(c.status)}`}>
                            {c.status || 'Sin visitar'}
                          </span>
                          {c.interest && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getInterestColor(c.interest)}`}>
                              Interés: {c.interest}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border inline-flex items-center gap-1 ${getPlanBadge(c.plan)}`}>
                          <Award size={12} />
                          {c.plan || 'Ninguno'}
                        </span>
                      </td>
                      <td className="py-4 pr-3">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="text-slate-200 font-medium text-xs">
                            {formatDateForDisplay(c.payDate)}
                          </span>
                          {isPayingPlan && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickBilling(c);
                              }}
                              disabled={isRowBilling}
                              className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Registrar cobro de mensualidad y avanzar 1 mes"
                            >
                              {isRowBilling ? (
                                <Loader2 size={10} className="animate-spin text-emerald-400" />
                              ) : (
                                <CheckCircle size={10} />
                              )}
                              {isRowBilling ? 'Cobrando...' : 'Cobrar Mes'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-3">
                        <div className="text-xs space-y-1 text-slate-200">
                          {c.nextAction && (
                            <div className="font-medium max-w-[150px] truncate" title={c.nextAction}>
                              ⚡ {c.nextAction}
                            </div>
                          )}
                          {c.testMonths && (
                            <div className="text-amber-400 font-medium flex items-center gap-1">
                              <Calendar size={12} />
                              {getDaysRemaining(c.testMonths)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-3">
                        <div className="text-xs text-slate-400 max-w-[100px] line-clamp-2" title={c.notes}>
                          {c.notes || '-'}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(c);
                          }}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors inline-flex"
                          title="Editar Cliente"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredClientes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No se encontraron clientes que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Advanced Modal Form (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                {editingClient ? <Edit2 size={22} className="text-blue-400" /> : <Plus size={22} className="text-blue-400" />}
                {editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección 1: Datos Generales */}
              <div>
                <h3 className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">1. Datos Generales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Nombre del Lugar / Restaurante *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="Ej: Burger Bistro"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo de Negocio</label>
                    <input 
                      type="text" 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value})} 
                      placeholder="Ej: Pizzería, Café..." 
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">Zona / Barrio</label>
                    <input 
                      type="text" 
                      value={formData.zone} 
                      onChange={e => setFormData({...formData, zone: e.target.value})} 
                      placeholder="Ej: Belalcazar, Centro..."
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Contactos Múltiples */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">2. Contactos del Restaurante</h3>
                  <button 
                    type="button" 
                    onClick={addContactField}
                    className="text-xs bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus size={12} />
                    Añadir Contacto
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="flex gap-4 items-end bg-slate-800/20 border border-slate-800/50 p-4 rounded-xl relative group">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Nombre Persona</label>
                        <input 
                          type="text" 
                          value={contact.name} 
                          onChange={e => handleContactChange(index, 'name', e.target.value)} 
                          placeholder="Ej: Fernando Gallego"
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Teléfono / WhatsApp</label>
                        <input 
                          type="text" 
                          value={contact.phone} 
                          onChange={e => handleContactChange(index, 'phone', e.target.value)} 
                          placeholder="Ej: 315 457 1076"
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                        />
                      </div>
                      {formData.contacts.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeContactField(index)}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 p-2.5 rounded-lg transition-colors inline-flex"
                          title="Eliminar este contacto"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección 3: Gestión Comercial */}
              <div>
                <h3 className="text-xs font-semibold text-violet-400 mb-3 uppercase tracking-wider">3. Gestión Comercial, Planes, Pago & Prueba</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Estado del Cliente</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                    >
                      <option value="Cliente activo">Cliente activo</option>
                      <option value="Cita / Interesado">Cita / Interesado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="No interesado">No interesado</option>
                      <option value="Sin visitar">Sin visitar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nivel de Interés</label>
                    <select 
                      value={formData.interest} 
                      onChange={e => setFormData({...formData, interest: e.target.value})} 
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                    >
                      <option value="Alto">Alto</option>
                      <option value="Medio">Medio</option>
                      <option value="Bajo">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Plan Contratado</label>
                    <select 
                      value={formData.plan} 
                      onChange={e => setFormData({...formData, plan: e.target.value})} 
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                    >
                      <option value="Ninguno">Ninguno / Prueba</option>
                      {planes.map(p => (
                        <option key={p.id} value={`Plan ${p.name}`}>Plan {p.name} (${p.price})</option>
                      ))}
                      <option value="Custom">Custom / Personalizado</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha Próximo Pago (Calendario)</label>
                    <input 
                      type="date" 
                      value={formData.payDate} 
                      onChange={e => setFormData({...formData, payDate: e.target.value})} 
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fin de Prueba Gratis (Calendario)</label>
                    <input 
                      type="date" 
                      value={formData.testMonths} 
                      onChange={e => setFormData({...formData, testMonths: e.target.value})} 
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Próxima Acción (Comercial)</label>
                    <input 
                      type="text" 
                      value={formData.nextAction} 
                      onChange={e => setFormData({...formData, nextAction: e.target.value})} 
                      placeholder="Ej: Enviar propuesta"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors" 
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notas Internas</label>
                <textarea 
                  rows={3} 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Detalles sobre la negociación, credenciales, etc."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none outline-none focus:border-blue-500/50 transition-colors"
                ></textarea>
              </div>

              {/* Acciones */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <div>
                  {editingClient && (
                    <button 
                      type="button" 
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="bg-red-950/40 text-red-400 hover:bg-red-950/80 border border-red-900/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Eliminar Cliente
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving || deleting} 
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? 'Guardando...' : editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Template Selector Modal */}
      {showWhatsAppModal && whatsappActiveContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card w-full max-w-lg p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare size={20} className="text-emerald-450" />
                <span>Enviar WhatsApp</span>
              </h2>
              <button 
                onClick={() => setShowWhatsAppModal(false)} 
                className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Restaurante</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{whatsappActiveContact.clientName}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contacto</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">
                  {whatsappActiveContact.contactName} ({whatsappActiveContact.phone})
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Seleccionar Plantilla
                </label>
                <select
                  value={selectedTemplateId || ""}
                  onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500/50 transition-colors font-semibold"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                      {t.name}
                    </option>
                  ))}
                  {templates.length === 0 && (
                    <option value="" className="bg-slate-900 text-slate-400" disabled>
                      Sin plantillas configuradas
                    </option>
                  )}
                </select>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Vista Previa del Mensaje
                </div>
                <div className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {(() => {
                    const activeT = templates.find(t => t.id === selectedTemplateId) || 
                      (templates.length > 0 ? templates[0] : null);
                    if (!activeT) {
                      return "Cargando plantilla...";
                    }
                    return activeT.text
                      .replace(/\[NOMBRE\]/g, whatsappActiveContact.contactName)
                      .replace(/\[LUGAR\]/g, whatsappActiveContact.clientName)
                      .replace(/\[MESES\]/g, whatsappActiveContact.testMonths || "2");
                  })()}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const activeT = templates.find(t => t.id === selectedTemplateId) || 
                    (templates.length > 0 ? templates[0] : null);
                  const defaultText = `¡Hola [NOMBRE]! 👋\nTe saludamos desde Ñami.\n\nMuchas gracias por el interés en nuestro sistema para restaurantes 🍽️\n\nQuedo atento 😊`;
                  const text = activeT ? activeT.text : defaultText;
                  
                  const processed = text
                    .replace(/\[NOMBRE\]/g, whatsappActiveContact.contactName)
                    .replace(/\[LUGAR\]/g, whatsappActiveContact.clientName)
                    .replace(/\[MESES\]/g, whatsappActiveContact.testMonths || "2");
                  
                  const cleanPhone = whatsappActiveContact.phone.replace(/[^0-9]/g, '');
                  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(processed)}`, "_blank");
                  setShowWhatsAppModal(false);
                }}
                className="bg-green-600 hover:bg-green-500 flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white shadow-lg shadow-green-900/20 transition-all active:scale-95"
              >
                <MessageSquare size={16} />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
