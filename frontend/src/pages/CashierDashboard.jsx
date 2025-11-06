import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, DollarSign, LogOut, Menu, X, ShoppingCart, User, Users, Bed
} from 'lucide-react';

// Importar todos los componentes de la carpeta components/cashier
import CashierHome from '../components/cashier/CashierHome';
import ActiveGuestsList from '../components/cashier/ActiveGuestsList';
import RoomsStatus from '../components/cashier/RoomsStatus';

// ============================================
// COMPONENTE PRINCIPAL DEL CAJERO
// ============================================
const CashierDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/cashier', icon: Home, label: 'Inicio / Caja', exact: true },
    { path: '/cashier/bookings', icon: ShoppingCart, label: 'Reservas Activas' },
    { path: '/cashier/rooms', icon: Bed, label: 'Estado de Habitaciones' },
  ];

  const isActive = (path, exact) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-gray-900 text-white w-64 fixed inset-y-0 left-0 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-30`}
      >
        {/* Header del Sidebar */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="font-bold text-lg">Sistema Cajero</h1>
              <p className="text-xs text-gray-400">Punto de Venta</p>
            </div>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path, item.exact)
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer del Sidebar - Info del Usuario */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400">Cajero</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header Superior */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-600 hover:text-gray-800"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex-1 md:flex-none">
              <h2 className="text-xl font-semibold text-gray-800">
                Panel de Cajero
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{user?.username}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Área de Contenido con Rutas */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<CashierHome />} />
            <Route path="/bookings" element={<ActiveGuestsList />} />
            <Route path="/rooms" element={<RoomsStatus />} />
          </Routes>
        </main>
      </div>

      {/* Overlay para móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CashierDashboard;