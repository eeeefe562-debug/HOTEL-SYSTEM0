import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Hotel, Users, Package, FileText, 
  DollarSign, LogOut, Menu, X, Settings, Bell, Tag,
  Edit2, Trash2
} from 'lucide-react';
import CategoriesManagement from '../components/CategoriesManagement';
import { getDashboard } from '../services/api';
import CashiersManagement from '../components/CashiersManagement';
import Reports from '../components/Reports';
import ProductsManagement from '../components/ProductsManagement';
import HotelSettingsManagement from '../components/HotelSettingsManagement';
import DiscountsManagement from '../components/DiscountsManagement';
import { createRoom, updateRoom } from '../services/api';

// Componente de Dashboard Principal
const getPaymentMethodLabel = (method) => {
  const labels = {
    cash: 'Efectivo',
    card: 'Tarjeta/QR',
    transfer: 'Transferencia',
    check: 'Cheque',
    other: 'Otro'
  };
  return labels[method] || method;
};
const DashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard General</h2>
      
      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ocupación */}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Ocupación Actual</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.occupancy?.occupancy_percentage || 0}%
              </p>
              <p className="text-blue-100 text-xs mt-1">
                {stats?.occupancy?.occupied_rooms || 0} / {stats?.occupancy?.total_rooms || 0} habitaciones
              </p>
            </div>
            <Hotel className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        {/* Ingresos del día */}
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ingresos del Día</p>
              <p className="text-3xl font-bold mt-2">
  Bs. {parseFloat(stats?.revenue?.total_revenue || 0).toFixed(2)}
</p>
              <p className="text-green-100 text-xs mt-1">
                {stats?.revenue?.total_transactions || 0} transacciones
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-200" />
          </div>
        </div>

        {/* ADR */}
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">ADR</p>
              <p className="text-3xl font-bold mt-2">
                Bs. {parseFloat(stats?.revenue?.adr || 0).toFixed(2)}
              </p>
              <p className="text-purple-100 text-xs mt-1">
                Ingreso promedio/habitación
              </p>
            </div>
            <FileText className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        {/* RevPAR */}
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">RevPAR</p>
              <p className="text-3xl font-bold mt-2">
                Bs. {parseFloat(stats?.revenue?.revpar || 0).toFixed(2)}
              </p>
              <p className="text-orange-100 text-xs mt-1">
                Revenue por hab. disponible
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Reservas activas y pendientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Reservas Activas</h3>
          <div className="text-4xl font-bold text-blue-600">
            {stats?.bookings?.active || 0}
          </div>
          <p className="text-gray-600 mt-2">Check-ins en curso</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Pagos Pendientes</h3>
          <div className="text-4xl font-bold text-orange-600">
            Bs. {parseFloat(stats?.bookings?.pending_payments?.pending_amount || 0).toFixed(2)}
          </div>
          <p className="text-gray-600 mt-2">
            {stats?.bookings?.pending_payments?.pending_count || 0} reservas pendientes
          </p>
        </div>
      </div>
    </div>
  );
};

// Componente de Habitaciones
// Componente de Habitaciones (RoomsManagement)
const RoomsManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    room_number: '',
    room_type: 'simple',
    base_price: '',
    short_stay_3h_price: '',
    short_stay_6h_price: '',
    floor: '',
    max_occupancy: 2
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { getRooms } = await import('../services/api');
      const data = await getRooms();
      setRooms(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // 1. FUNCIÓN AÑADIDA: Manejar la entrada de datos del formulario (Mejora: Usamos un solo manejador)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      base_price: room.base_price,
      short_stay_3h_price: room.short_stay_3h_price || '',
      short_stay_6h_price: room.short_stay_6h_price || '',
      floor: room.floor || '',
      max_occupancy: room.max_occupancy || 2
    });
    setShowModal(true);
  }; // ⬅️ Llave de cierre CORRECTA de handleEdit

  const handleToggleMaintenance = async (id, roomNumber, currentStatus) => {
  if (currentStatus === 'occupied' || currentStatus === 'reserved') {
    alert('No se puede cambiar el estado de una habitación ocupada o reservada');
    return;
  }

  const action = currentStatus === 'maintenance' ? 'poner disponible' : 'poner en mantenimiento';
  
  if (window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la habitación ${roomNumber}?`)) {
    try {
      const { toggleRoomMaintenance } = await import('../services/api');
      await toggleRoomMaintenance(id);
      alert(`Habitación ${currentStatus === 'maintenance' ? 'disponible' : 'en mantenimiento'} exitosamente`);
      loadRooms();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert(error.response?.data?.error || 'Error al cambiar estado de la habitación');
    }
  }
};
  // 2. FUNCIÓN AÑADIDA: Manejar el envío del formulario (SOLUCIÓN: handleSubmit existe y limpia datos)
  // Dentro de tu handleSubmit, usando la corrección de datos anterior:
// La declaración de tu función, alrededor de las líneas 250-260

const handleSubmit = async (e) => {
  e.preventDefault();

  // LIMPIEZA DE DATOS
  const dataToSend = {
    ...formData,
    short_stay_3h_price: formData.short_stay_3h_price === '' ? null : parseFloat(formData.short_stay_3h_price),
    short_stay_6h_price: formData.short_stay_6h_price === '' ? null : parseFloat(formData.short_stay_6h_price),
    floor: formData.floor === '' ? null : formData.floor,
    base_price: parseFloat(formData.base_price),
    max_occupancy: parseInt(formData.max_occupancy),
  };

  try {
    if (editingRoom) {
      await updateRoom(editingRoom.id, dataToSend);
      alert('Habitación actualizada con éxito.');
    } else {
      await createRoom(dataToSend);
      alert('Habitación creada con éxito.');
    }
    
    loadRooms();
    closeModal();
  } catch (error) {
    console.error('Error al guardar la habitación:', error);
    alert('Error al guardar la habitación. Revise la consola para detalles.');
  }
};
    // ------------------------------------------------------------------
    // ✅ CORRECCIÓN DE DATOS: Asegura que los campos vacíos sean NULL para MySQL
    // ------------------------------------------------------------------
    const dataToSend = { ...formData };
    
    // Campos opcionales que deben ser NULL si están vacíos
    const nullableFields = ['short_stay_3h_price', 'short_stay_6h_price', 'floor'];

    nullableFields.forEach(field => {
        // Convierte cadena vacía, 0 (si es opcional y se puede omitir) o undefined a null
        if (dataToSend[field] === '' || dataToSend[field] === undefined) {
            dataToSend[field] = null;
        } 
    });
    // ------------------------------------------------------------------

    try {
      
      if (editingRoom) {
        // ACTUALIZAR usando los datos limpios
        await updateRoom(editingRoom.id, dataToSend);
        alert('Habitación actualizada con éxito.');
      } else {
        // CREAR usando los datos limpios
        await createRoom(dataToSend);
        alert('Habitación creada con éxito.');
      }
      
      setShowModal(false);
      setEditingRoom(null);
      loadRooms(); // Recargar datos
    } catch (error) {
      console.error('Error al guardar habitación:', error);
      alert('Hubo un error al guardar la habitación. Verifique los datos.');
    }
  };


  const handleDelete = async (id, roomNumber) => {
  if (window.confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE la habitación ${roomNumber}? Esta acción no se puede deshacer.`)) {
    try {
      const { deleteRoom } = await import('../services/api'); 
      await deleteRoom(id);
      alert('Habitación eliminada permanentemente');
      loadRooms();
    } catch (error) {
      console.error('Error al eliminar habitación:', error);
      alert(error.response?.data?.error || 'Error al eliminar habitación');
    }
  }
};

  const getStatusBadge = (status) => {
    const badges = {
      available: 'badge-success',
      occupied: 'badge-danger',
      maintenance: 'badge-warning',
      reserved: 'badge-info'
    };
    const labels = {
      available: 'Disponible',
      occupied: 'Ocupada',
      maintenance: 'Mantenimiento',
      reserved: 'Reservada'
    };
    return <span className={`badge ${badges[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Habitaciones</h2>
        <button onClick={() => { setEditingRoom(null); setFormData({}); setShowModal(true); }} className="btn-primary">
          + Nueva Habitación
        </button>
      </div>

      {/* Lista de habitaciones */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Precio Base</th>
              <th>3 Horas</th>
              <th>Late Checkout</th>
              <th>Estado</th>
              <th>Reservas</th>
              <th>Ingresos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className="font-semibold">{room.room_number}</td>
                <td className="capitalize">{room.room_type}</td>
                <td>Bs. {parseFloat(room.base_price).toFixed(2)}</td>
                <td>Bs. {room.short_stay_3h_price ? parseFloat(room.short_stay_3h_price).toFixed(2) : '-'}</td>
                <td>Bs. {room.short_stay_6h_price ? parseFloat(room.short_stay_6h_price).toFixed(2)  + '/h'  : '-'}</td>
                <td>{getStatusBadge(room.status)}</td>
                <td>{room.total_bookings || 0}</td>
                <td>Bs. {parseFloat(room.total_revenue || 0).toFixed(2)}</td>
                <td>
  <div className="flex gap-2">
    <button
      onClick={() => handleEdit(room)}
      className="text-blue-600 hover:text-blue-800"
      title="Editar"
    >
      <Edit2 className="w-4 h-4" />
    </button>
    <button
      onClick={() => handleToggleMaintenance(room.id, room.room_number, room.status)}
      className={`${
        room.status === 'maintenance' 
          ? 'text-green-600 hover:text-green-800' 
          : 'text-orange-600 hover:text-orange-800'
      }`}
      title={room.status === 'maintenance' ? 'Poner disponible' : 'Poner en mantenimiento'}
      disabled={room.status === 'occupied' || room.status === 'reserved'}
    >
      {room.status === 'maintenance' ? '🟢' : '🔧'}
    </button>
    <button
      onClick={() => handleDelete(room.id, room.room_number)}
      className="text-red-600 hover:text-red-800"
      title="Eliminar permanentemente"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de crear/editar habitación */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{editingRoom ? 'Editar Habitación' : 'Nueva Habitación'}</h3>
              
            <form onSubmit={handleSubmit} className="space-y-4"> 
              <div>
                <label className="label">Número de Habitación</label>
                <input
                  type="text"
                  name="room_number" 
                  className="input"
                  value={formData.room_number}
                  onChange={handleInputChange} // ⬅️ Usando el manejador limpio
                  required
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  name="room_type" 
                  className="input"
                  value={formData.room_type}
                  onChange={handleInputChange} // ⬅️ Usando el manejador limpio
                >
                  <option value="simple">Simple</option>
                  <option value="doble">Doble</option>
                  <option value="suite">Suite</option>
                  <option value="ejecutiva">Ejecutiva</option>
                </select>
              </div>
              <div>
                <label className="label">Precio Base (por noche)</label>
                <input
                  type="number"
                  step="0.01"
                  name="base_price" 
                  className="input"
                  value={formData.base_price}
                  onChange={handleInputChange} // ⬅️ Usando el manejador limpio
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Precio 3h</label>
                  <input
                    type="number"
                    step="0.01"
                    name="short_stay_3h_price" 
                    className="input"
                    value={formData.short_stay_3h_price}
                    onChange={handleInputChange} // ⬅️ Usando el manejador limpio
                  />
                </div>
                <div>
                  <label className="label">⏰ Late Checkout (por hora)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="short_stay_6h_price" 
                    className="input"
                    value={formData.short_stay_6h_price}
                    onChange={handleInputChange} // ⬅️ Usando el manejador limpio
                  />
                </div>
              </div>
              {/* Ocupación y Piso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ocupación Máx.</label>
                  <input
                    type="number"
                    name="max_occupancy"
                    className="input"
                    value={formData.max_occupancy}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="label">Piso</label>
                  <input
                    type="text"
                    name="floor"
                    className="input"
                    value={formData.floor}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingRoom ? 'Guardar Cambios' : 'Crear Habitación'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; // ⬅️ Llave de cierre CORRECTA del componente RoomsManagement
// Componente Principal con Sidebar
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/rooms', icon: Hotel, label: 'Habitaciones' },
    { path: '/admin/cashiers', icon: Users, label: 'Cajeros' },
    { path: '/admin/products', icon: Package, label: 'Productos' },
    { path: '/admin/categories', icon: Tag, label: 'Categorías' },
    { path: '/admin/discounts', icon: Tag, label: 'Descuentos' }, 
    { path: '/admin/settings', icon: Settings, label: 'Configuraciones' }, 
    { path: '/admin/reports', icon: FileText, label: 'Reportes' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`bg-gray-900 text-white w-64 fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Hotel className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="font-bold text-lg">Hotel Admin</h1>
              <p className="text-xs text-gray-400">Sistema de Gestión</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="font-semibold">{user?.full_name?.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.full_name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
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

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-600"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex-1 md:flex-none">
              <h2 className="text-xl font-semibold text-gray-800">
                Panel de Administración
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative text-gray-600 hover:text-gray-800">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/rooms" element={<RoomsManagement />} />
            <Route path="/cashiers" element={<CashiersManagement />} />
            <Route path="/products" element={<ProductsManagement />} />
            <Route path="/categories" element={<CategoriesManagement />} />
            <Route path="/discounts" element={<DiscountsManagement />} />  
            <Route path="/settings" element={<HotelSettingsManagement />} />  
            <Route path="/reports" element={<Reports/>} />
          </Routes>
        </main>
      </div>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;