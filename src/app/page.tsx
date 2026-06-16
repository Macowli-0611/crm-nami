"use client";
import { useEffect, useState } from "react";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  BellRing,
  Search,
  Plus,
  MessageSquare,
  Loader2,
  MapPin,
  Calendar,
  AlertCircle,
  TrendingDown,
  Activity,
  DollarSign,
  Briefcase,
  Award
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePlus, setPricePlus] = useState(120);
  const [pricePro, setPricePro] = useState(250);
  const [planes, setPlanes] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Load local storage cached items if any
    const cachedClients = localStorage.getItem("nami_cached_clients");
    const cachedTransactions = localStorage.getItem("nami_cached_transactions");
    const cachedConfig = localStorage.getItem("nami_cached_config");

    if (cachedClients) {
      try {
        setClientes(JSON.parse(cachedClients));
      } catch (e) {}
    }
    if (cachedTransactions) {
      try {
        setTransactions(JSON.parse(cachedTransactions));
      } catch (e) {}
    }
    if (cachedConfig) {
      try {
        const conf = JSON.parse(cachedConfig);
        setPricePlus(conf.pricePlus || 120);
        setPricePro(conf.pricePro || 250);
        setPlanes(conf.plans || []);
      } catch (e) {}
    }

    if (cachedClients || cachedTransactions) {
      setLoading(false);
    }

    async function loadData() {
      try {
        const [clientsRes, finRes, configRes] = await Promise.all([
          fetch('/api/clientes'),
          fetch('/api/finanzas'),
          fetch('/api/configuracion')
        ]);
        const clientsData = await clientsRes.json();
        const finData = await finRes.json();
        const configData = await configRes.json();
        
        if (clientsData.success) {
          setClientes(clientsData.data);
          localStorage.setItem("nami_cached_clients", JSON.stringify(clientsData.data));
        }
        if (finData.success) {
          setTransactions(finData.data);
          localStorage.setItem("nami_cached_transactions", JSON.stringify(finData.data));
        }
        if (configData.success) {
          setPricePlus(configData.data.pricePlus || 120);
          setPricePro(configData.data.pricePro || 250);
          setPlanes(configData.data.plans || []);
          localStorage.setItem("nami_cached_config", JSON.stringify(configData.data));
        }
        setIsOffline(false);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
        setIsOffline(true);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Helper date parsing and calculation
  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return null;
    let testDate = new Date(dateStr);
    if (isNaN(testDate.getTime())) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        testDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    if (isNaN(testDate.getTime())) return null;

    const today = new Date();
    today.setHours(0,0,0,0);
    testDate.setHours(0,0,0,0);
    
    const diffTime = testDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTransactionMonthAndYear = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return { month: parseInt(parts[1]) - 1, year: parseInt(parts[2]) };
    }
    const tDate = new Date(dateStr);
    if (!isNaN(tDate.getTime())) {
      return { month: tDate.getMonth(), year: tDate.getFullYear() };
    }
    return null;
  };

  // 1. Calculations: CLIENTS
  const totalClients = clientes.length;
  
  const activeClients = clientes.filter(c => {
    const status = (c.status || '').toLowerCase();
    return status.includes('activo') || status.includes('cerrado');
  });

  const trialsActive = clientes.filter(c => {
    const status = (c.status || '').toLowerCase();
    const daysLeft = getDaysRemaining(c.testMonths);
    return status.includes('pendiente') || (daysLeft !== null && daysLeft >= 0);
  });

  const statusFunnel = clientes.reduce((acc: any, c: any) => {
    const status = c.status || 'Sin visitar';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // 2. Calculations: FINANCES (Current Month vs Overall)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const dateInfo = getTransactionMonthAndYear(t.date);
    if (dateInfo) {
      return dateInfo.month === currentMonth && dateInfo.year === currentYear;
    }
    return false;
  });

  const monthlyIncome = monthlyTransactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyExpense = monthlyTransactions.filter(t => t.amount < 0).reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyNet = monthlyIncome + monthlyExpense;

  const totalIncomeAllTime = transactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);

  // MRR Estimation based on Active Clients Plans
  const estimatedMRR = activeClients.reduce((acc, curr) => {
    const clientPlan = (curr.plan || '').toLowerCase();
    
    // First, look for a matching plan in our dynamic plans list
    const matchedPlan = planes.find(p => p.name.toLowerCase() === clientPlan);
    if (matchedPlan) {
      return acc + matchedPlan.price;
    }
    
    // Fallbacks for legacy/safety
    if (clientPlan.includes('pro')) return acc + pricePro;
    if (clientPlan.includes('plus')) return acc + pricePlus;
    return acc;
  }, 0);

  // 3. Consolidated Alerts (Trial Expirations & Payments Due)
  const paymentAlerts = clientes
    .map(c => {
      const isPayingPlan = c.plan && c.plan !== 'Ninguno';
      const daysLeft = isPayingPlan ? getDaysRemaining(c.payDate) : getDaysRemaining(c.testMonths);
      
      if (daysLeft !== null && daysLeft >= -10 && daysLeft <= 10) {
        return {
          name: c.name,
          type: isPayingPlan ? `Cobro ${c.plan}` : 'Fin Prueba Gratis',
          daysLeft,
          urgent: daysLeft <= 3
        };
      }
      return null;
    })
    .filter(Boolean) as any[];

  paymentAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

  // 4. Commercial Actions Pending
  const pendingActions = clientes
    .filter(c => c.nextAction && c.status !== 'Cliente activo')
    .slice(0, 4);

  // 5. Recent Finance Activity (last 4 items)
  const recentFinances = [...transactions].slice(-4).reverse();

  // 6. Recents (last 5 clients in Google Sheets)
  const recentClients = [...clientes].slice(-5).reverse();

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
    return dateStr;
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400">
            Resumen General (Ñami)
          </h1>
          <p className="text-slate-400 mt-1">Monitoreo cruzado de clientes y salud financiera en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {isOffline ? (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2 animate-pulse">
              <AlertCircle size={14} className="shrink-0" />
              <span>Modo sin conexión</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 glass rounded-lg text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Conectado a Google Drive
            </div>
          )}
        </div>
      </header>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} className="shrink-0" />
          <span>Sin conexión a internet. Mostrando los datos de la última sincronización local.</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
          <span className="text-slate-400 text-sm">Analizando métricas del CRM...</span>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Clientes Activos" 
              value={activeClients.length.toString()} 
              subValue={`${totalClients} en embudo`}
              icon={<CheckCircle2 size={22} className="text-emerald-400" />} 
              trend="Negocios exitosos"
            />
            <StatCard 
              title="Ingresos del Mes" 
              value={`$${monthlyIncome.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`} 
              subValue={`MRR Estimado: $${estimatedMRR.toLocaleString('es-ES', { maximumFractionDigits: 0 })}/mes`}
              icon={<TrendingUp size={22} className="text-blue-400" />} 
              trend={`Total histórico: $${totalIncomeAllTime.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
            />
            <StatCard 
              title="Gastos del Mes" 
              value={`$${Math.abs(monthlyExpense).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`} 
              subValue="Gastos operativos"
              icon={<TrendingDown size={22} className="text-red-400" />} 
              trend="Registrado en Finanzas"
            />
            <StatCard 
              title="Balance Neto Mensual" 
              value={`${monthlyNet >= 0 ? '+' : '-'}$${Math.abs(monthlyNet).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`} 
              subValue="Beneficio real"
              icon={<DollarSign size={22} className="text-violet-400" />} 
              trend="Ingresos - Gastos del mes"
              isProfit={monthlyNet >= 0}
            />
          </div>

          {/* Core Telemetry Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Financial Feed */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-blue-400" />
                  Actividad Financiera Reciente
                </h2>
                <p className="text-xs text-slate-400 mb-6">Últimos movimientos cargados en la hoja de finanzas</p>
                
                <div className="space-y-4">
                  {recentFinances.map((rf, idx) => {
                    const isIncome = rf.amount > 0;
                    return (
                      <div key={idx} className="flex justify-between items-center bg-slate-800/20 border border-slate-700/30 p-3 rounded-lg hover:bg-slate-800/40 transition-colors">
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-sm font-semibold text-slate-200 truncate">{rf.concept}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span>{rf.date}</span>
                            <span>•</span>
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{rf.category}</span>
                          </div>
                        </div>
                        <div className={`text-sm font-bold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isIncome ? '+' : '-'}${Math.abs(rf.amount).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    );
                  })}
                  {recentFinances.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-xs">No hay transacciones registradas.</div>
                  )}
                </div>
              </div>
              
              <Link href="/finanzas" className="mt-6 w-full text-center py-2 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700/50 rounded-lg transition-colors block">
                Ver Todas las Finanzas
              </Link>
            </div>

            {/* Column 2: Commercial Actions & Deadlines */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BellRing size={18} className="text-amber-400" />
                  Cobros y Pruebas por Vencer
                </h2>
                <p className="text-xs text-slate-400 mb-6">Alertas del embudo de ventas y cobros del mes</p>
                
                <div className="space-y-4">
                  {/* Consolidated alerts */}
                  {paymentAlerts.slice(0, 3).map((alert, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${
                      alert.urgent ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-800/40 border-slate-700/50'
                    }`}>
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{alert.type}</div>
                        <div className="text-sm font-semibold text-slate-200 mt-0.5 truncate">{alert.name}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        alert.daysLeft < 0 ? 'bg-red-950 text-red-500 border border-red-900/50' :
                        alert.daysLeft === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                        alert.urgent ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {alert.daysLeft < 0 ? `Vencido ${Math.abs(alert.daysLeft)}d` :
                         alert.daysLeft === 0 ? 'Hoy' : `${alert.daysLeft} d`}
                      </span>
                    </div>
                  ))}

                  {/* Commercial next actions list */}
                  {pendingActions.slice(0, 2).map((c, idx) => (
                    <div key={idx} className="bg-slate-800/10 border border-slate-800 p-3 rounded-lg flex items-start gap-2">
                      <Briefcase size={16} className="text-violet-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-violet-400 font-bold uppercase">Tarea: {c.name}</div>
                        <div className="text-xs text-slate-300 mt-1 line-clamp-2" title={c.nextAction}>{c.nextAction}</div>
                      </div>
                    </div>
                  ))}

                  {paymentAlerts.length === 0 && pendingActions.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-xs">No hay alertas ni pendientes.</div>
                  )}
                </div>
              </div>

              <Link href="/clientes" className="mt-6 w-full text-center py-2 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700/50 rounded-lg transition-colors block">
                Gestionar Clientes
              </Link>
            </div>

            {/* Column 3: Funnel & Active Trials */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users size={18} className="text-emerald-400" />
                  Embudo de Ventas
                </h2>
                <p className="text-xs text-slate-400 mb-6">Distribución de prospectos según el estado comercial</p>

                <div className="space-y-4">
                  {Object.keys(statusFunnel).map((status, idx) => {
                    const count = statusFunnel[status];
                    const percent = Math.round((count / totalClients) * 100);
                    
                    let barColor = "bg-blue-500";
                    if (status.toLowerCase().includes('activo')) barColor = "bg-emerald-500";
                    else if (status.toLowerCase().includes('cita') || status.toLowerCase().includes('interesado')) barColor = "bg-violet-500";
                    else if (status.toLowerCase().includes('pendiente')) barColor = "bg-amber-500";
                    else if (status.toLowerCase().includes('no interesado')) barColor = "bg-red-500";

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300">{status}</span>
                          <span className="text-slate-400">{count} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {totalClients === 0 && (
                    <div className="text-center py-12 text-slate-500 text-xs">No hay clientes agregados.</div>
                  )}
                </div>
              </div>

              <div className="mt-6 p-3 bg-slate-800/20 border border-slate-700/20 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total en Prueba</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{trialsActive.length} Restaurantes</div>
                </div>
                <Clock className="text-amber-500/80" size={24} />
              </div>
            </div>

          </div>

          {/* Row 3: Recent Contacts Log in Dashboard */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award size={18} className="text-blue-400" />
              Contactos Recientes & Planes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[750px]">
                <thead className="text-slate-400 border-b border-slate-700/50">
                  <tr>
                    <th className="pb-3 font-medium">Restaurante</th>
                    <th className="pb-3 font-medium">Zona</th>
                    <th className="pb-3 font-medium">Estado Comercial</th>
                    <th className="pb-3 font-medium">Plan Contratado</th>
                    <th className="pb-3 font-medium">Próximo Pago</th>
                    <th className="pb-3 font-medium text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentClients.map((c) => (
                    <tr key={c.rowIndex} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-4 font-semibold text-slate-200">{c.name}</td>
                      <td className="py-4 text-slate-400">{c.zone}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.status.toLowerCase().includes('activo') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          c.status.toLowerCase().includes('cita') || c.status.toLowerCase().includes('interesado') ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
                          c.status.toLowerCase().includes('pendiente') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          c.status.toLowerCase().includes('no interesado') ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {c.status || 'Sin visitar'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-300">
                        <span className={`px-2 py-0.5 rounded text-xs border ${
                          (c.plan || 'Ninguno').toLowerCase().includes('pro') ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 font-bold' :
                          (c.plan || 'Ninguno').toLowerCase().includes('plus') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 font-bold' :
                          'bg-slate-800 text-slate-400 border-slate-700/50'
                        }`}>
                          {c.plan || 'Ninguno'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-300 text-xs font-semibold">
                        {formatDateForDisplay(c.payDate)}
                      </td>
                      <td className="py-4 text-right">
                        {c.phone ? (
                          <a 
                            href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors inline-flex"
                          >
                            <MessageSquare size={13} />
                          </a>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Stats Subcomponent

function StatCard({ title, value, subValue, icon, trend, isProfit }: { title: string, value: string, subValue: string, icon: React.ReactNode, trend: string, isProfit?: boolean }) {
  return (
    <div className="glass-card p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
      {isProfit !== undefined && (
        <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full blur-xl opacity-30 ${
          isProfit ? 'bg-emerald-500' : 'bg-red-500'
        }`}></div>
      )}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div>
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</h3>
          <div className="text-2xl font-bold text-slate-50 mt-1">{value}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{subValue}</div>
        </div>
        <div className="p-2 bg-slate-800/80 border border-slate-700/50 rounded-lg shrink-0">{icon}</div>
      </div>
      <div className="text-[10px] text-slate-400 pt-3 border-t border-slate-800/80 relative z-10 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        {trend}
      </div>
    </div>
  );
}
