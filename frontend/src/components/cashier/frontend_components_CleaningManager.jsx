import React, { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import api from '../../services/api';

const CleaningManager = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    try {
      const response = await api.get('/rooms');
      const cleaningRooms = response.data.filter(r => r.status === 'cleaning');
      setRooms(cleaningRooms);
    } catch (error) {
      console.error('Error al cargar habitaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsClean = async (roomId, roomNumber) => {
    if (!window.confirm(`¿Confirmar que habitación ${roomNumber} está limpia?`)) {
      return;
    }

    try {
      await api.patch(`/rooms/${roomId}`, { status: 'available' });
      alert(`✅ Habitación ${roomNumber} disponible nuevamente`);
      loadRooms();
    } catch (error) {
      console.error('Error al actualizar habitación:', error);
      alert('❌ Error al actualizar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-orange-500" />
        Habitaciones por Limpiar ({rooms.length})
      </h2>

      {rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="card border-l-4 border-orange-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">Hab. {room.room_number}</h3>
                  <p className="text-sm text-gray-600">{room.room_type}</p>
                </div>
                <span className="badge" style={{backgroundColor: '#FF8C00', color: 'white'}}>
                  🧹 LIMPIEZA
                </span>
              </div>

              <button
                onClick={() => handleMarkAsClean(room.id, room.room_number)}
                className="btn-success w-full flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Marcar como Limpia
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            ✅ Todas las habitaciones están limpias
          </p>
        </div>
      )}
    </div>
  );
};

export default CleaningManager;