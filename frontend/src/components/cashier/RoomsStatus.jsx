import React, { useState, useEffect } from 'react';
import { Hotel, RefreshCw } from 'lucide-react';
import { getCashierRooms } from '../../services/api';

const OCCUPIED_STATUSES = ['occupied', 'checked_in'];
const RoomsStatus = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, available, occupied

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await getCashierRooms();
      setRooms(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
        available: 'bg-green-500',
        occupied: 'bg-red-500',
        checked_in: 'bg-red-500', 
        maintenance: 'bg-yellow-500',
        reserved: 'bg-blue-500'
    };
    return colors[status] || 'bg-gray-500';
};

    const getStatusLabel = (status) => {
    const labels = {
        available: 'Disponible',
        occupied: 'Ocupada',
        checked_in: 'Ocupada', 
        maintenance: 'Mantenimiento',
        reserved: 'Reservada'
    };
    return labels[status] || status;
};

  const filteredRooms = rooms.filter(room => {
  if (filter === 'all') return true;
  if (filter === 'available') return room.status === 'available';
  if (filter === 'occupied') return OCCUPIED_STATUSES.includes(room.status);
  return true;
});

  const stats = {
  total: rooms.length,
  available: rooms.filter(r => r.status === 'available').length,
  occupied: rooms.filter(r => OCCUPIED_STATUSES.includes(r.status)).length, 
  maintenance: rooms.filter(r => r.status === 'maintenance').length
}

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Hotel className="w-6 h-6" />
          Estado de Habitaciones
        </h2>
        <button
          onClick={loadRooms}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-gray-500 to-gray-600 text-white">
          <p className="text-gray-100 text-sm">Total</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-green-100 text-sm">Disponibles</p>
          <p className="text-3xl font-bold">{stats.available}</p>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <p className="text-red-100 text-sm">Ocupadas</p>
          <p className="text-3xl font-bold">{stats.occupied}</p>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <p className="text-yellow-100 text-sm">Mantenimiento</p>
          <p className="text-3xl font-bold">{stats.maintenance}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todas ({rooms.length})
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'available'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Disponibles ({stats.available})
        </button>
        <button
          onClick={() => setFilter('occupied')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'occupied'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Ocupadas ({stats.occupied})
        </button>
      </div>

      {/* Lista de Habitaciones */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className={`card relative ${
              room.status === 'available' ? 'border-2 border-green-500' : ''
            }`}
          >
            {/* Indicador de estado */}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(room.status)}`} />

            {/* Número de habitación */}
            <p className="text-2xl font-bold text-center mb-2">{room.room_number}</p>

            {/* Tipo */}
            <p className="text-xs text-center text-gray-600 capitalize mb-2">
              {room.room_type}
            </p>

            {/* Estado */}
            <div className={`text-xs text-center px-2 py-1 rounded-full ${
  room.status === 'available' ? 'bg-green-100 text-green-800' :
  OCCUPIED_STATUSES.includes(room.status) ? 'bg-red-100 text-red-800' :
  room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
  'bg-blue-100 text-blue-800'
}`}>
              {getStatusLabel(room.status)}
            </div>

            {/* Precio */}
            <p className="text-sm font-semibold text-center text-green-600 mt-2">
              Bs. {parseFloat(room.base_price).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="card text-center py-12">
          <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay habitaciones en esta categoría</p>
        </div>
      )}
    </div>
  );
};

export default RoomsStatus;