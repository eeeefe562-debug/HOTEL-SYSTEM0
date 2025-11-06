import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { searchBookings } from '../../services/api';
import BookingCard from './BookingCard';

const BookingsManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      loadBookings();
    }
  }, [searchTerm]);

  const loadBookings = async () => {
    try {
      const data = await searchBookings({ q: searchTerm, status: 'checked_in' });
      setBookings(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Reservas</h2>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Buscar por nombre, habitación o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onUpdate={loadBookings} />
          ))}
        </div>
      ) : (
        <div className="card text-center text-gray-500">
          {searchTerm.length >= 3 ? 'No se encontraron reservas' : 'Busca reservas activas'}
        </div>
      )}
    </div>
  );
};

export default BookingsManagement;