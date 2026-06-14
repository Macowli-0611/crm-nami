"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, DollarSign, Settings, LogOut, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // If we are on the login page, do not render the sidebar at all
  if (pathname === "/login") {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Clientes', href: '/clientes', icon: <Users size={20} /> },
    { name: 'Finanzas', href: '/finanzas', icon: <DollarSign size={20} /> },
    { name: 'Configuración', href: '/configuracion', icon: <Settings size={20} /> },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleLogout = () => {
    // Clear cookie
    document.cookie = "nami_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict";
    // Clear localStorage
    localStorage.removeItem("nami_session");
    // Redirect to login
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-[60] md:hidden bg-slate-800/80 border border-slate-700/50 p-2.5 rounded-xl text-slate-200 hover:text-white transition-all backdrop-blur-sm shadow-lg active:scale-95"
        title={isOpen ? "Cerrar Menú" : "Abrir Menú"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          onClick={closeSidebar}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`fixed top-0 bottom-0 left-0 z-50 w-64 glass border-r border-slate-700/50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 pt-20 md:pt-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Ñami CRM
          </h2>
          <p className="text-xs text-slate-500 mt-1">v2.0 PRO</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
