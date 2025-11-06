import React, { useState, useEffect } from 'react';
import { Users, Plus, DollarSign, LogOut as CheckOutIcon } from 'lucide-react';
import { searchBookings } from '../services/api';
import GuestRegistrationForm from '../components/cashier/GuestRegistrationForm';
import CheckoutModal from '../components/cashier/CheckoutModal';
import AddChargesModal from './cashier/AddChargesModal';

const ActiveGuestsList = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAddCharges, setShowAddCharges] = useState(false);

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const data = await searchBookings({ status: 'checked_in' });
      setGuests(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = (guest) => {
    setSelectedGuest(guest);
    setShowCheckout(true);
  };

  const handleAddCharges = (guest) => {
    setSelectedGuest(guest);
    setShowAddCharges(true);
  };

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
          <Users className="w-6 h-6" />
          Huéspedes Activos ({guests.length})
        </h2>
        <button
          onClick={() => setShowRegistration(true)}
          className="btn-success flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Registrar Huésped
        </button>
      </div>

      {guests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map((guest) => (
            <div key={guest.id} className="card hover:shadow-lg transition-shadow">
              {/* Cabecera */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{guest.full_name}</h3>
                  <p className="text-sm text-gray-600">CI: {guest.document_number}</p>
                </div>
                <span className="badge badge-success">
                  Hab. {guest.room_number}
                </span>
              </div>

              {/* Información */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="font-semibold">
                    {new Date(guest.check_in).toLocaleString('es-BO', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salida esperada:</span>
                  <span className="font-semibold">
                    {new Date(guest.expected_checkout).toLocaleString('es-BO', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Montos */}
              <div className="border-t pt-3 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold">Bs. {parseFloat(guest.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pagado:</span>
                  <span className="text-green-600 font-semibold">
                    Bs. {parseFloat(guest.amount_paid).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600 font-bold">Saldo:</span>
                  <span className={`font-bold text-lg ${
                    guest.balance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Bs. {parseFloat(guest.balance).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botones */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddCharges(guest)}
                  className="btn-secondary text-sm flex items-center justify-center gap-1"
                >
                  <DollarSign className="w-4 h-4" />
                  Cargos
                </button>
                <button
                  onClick={() => handleCheckout(guest)}
                  className="btn-primary text-sm flex items-center justify-center gap-1"
                >
                  <CheckOutIcon className="w-4 h-4" />
                  Salida
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No hay huéspedes registrados</p>
          <button
            onClick={() => setShowRegistration(true)}
            className="btn-success mx-auto"
          >
            Registrar Primer Huésped
          </button>
        </div>
      )}

      {/* Modales */}
      {showRegistration && (
        <GuestRegistrationForm
          onClose={() => setShowRegistration(false)}
          onCreated={() => {
            setShowRegistration(false);
            loadGuests();
          }}
        />
      )}

      {showCheckout && selectedGuest && (
        <CheckoutModal
          guest={selectedGuest}
          onClose={() => {
            setShowCheckout(false);
            setSelectedGuest(null);
          }}
          onCompleted={() => {
            setShowCheckout(false);
            setSelectedGuest(null);
            loadGuests();
          }}
        />
      )}

      {showAddCharges && selectedGuest && (
        <AddChargesModal
          guest={selectedGuest}
          onClose={() => {
            setShowAddCharges(false);
            setSelectedGuest(null);
          }}
          onAdded={() => {
            setShowAddCharges(false);
            setSelectedGuest(null);
            loadGuests();
          }}
        />
      )}
    </div>
  );
};

export default ActiveGuestsList;