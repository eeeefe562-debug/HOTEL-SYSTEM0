import React, { useState, useEffect } from 'react';
import { Users, Plus, DollarSign, LogOut as CheckOutIcon } from 'lucide-react';
import GuestRegistrationForm from './GuestRegistrationForm';
import CheckoutModal from './CheckoutModal';
import AddChargesModal from './AddChargesModal';
import { searchBookings, getLateCheckoutPreview } from '../../services/api';

const ActiveGuestsList = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAddCharges, setShowAddCharges] = useState(false);

  // Nuevo estado para late checkout previews por guest id
  const [lateCheckoutInfo, setLateCheckoutInfo] = useState({});

  useEffect(() => {
    loadGuests();
    const interval = setInterval(loadGuests, 300000); // 5 minutos
    return () => clearInterval(interval);
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      // searchBookings ahora devuelve array directamente
      const data = await searchBookings({ status: 'checked_in' });
      const fetchedGuests = Array.isArray(data) ? data : [];

      setGuests(fetchedGuests);

      // Cargar previews de late-checkout en paralelo
      const previewPromises = fetchedGuests.map(guest =>
        getLateCheckoutPreview(guest.id)
          .then(p => ({ id: guest.id, ...p }))
          .catch(() => ({ id: guest.id, late_checkout_charge: 0, new_total: guest.total_amount || 0 }))
      );

      const results = await Promise.all(previewPromises);
      const dict = results.reduce((acc, cur) => {
        acc[cur.id] = cur;
        return acc;
      }, {});
      setLateCheckoutInfo(dict);
    } catch (error) {
      console.error('Error cargando huéspedes:', error);
      setGuests([]);
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
          {guests.map((guest) => {
            const preview = lateCheckoutInfo[guest.id] || {};
            const total = parseFloat(guest.total_amount || 0);
            const paid = parseFloat(guest.amount_paid || 0);
            const lateCharge = parseFloat(preview.late_checkout_charge || 0);
            // Si backend devuelve new_total lo usamos; sino calculamos
            const newBalance = typeof preview.new_total !== 'undefined'
              ? parseFloat(preview.new_total) - paid
              : total + lateCharge - paid;

            const balance = Number.isFinite(newBalance) ? newBalance : (parseFloat(guest.balance || guest.current_balance || 0));
            const isLate = !!preview.is_late && lateCharge > 0;

            return (
              <div key={guest.id} className="card hover:shadow-lg transition-shadow">
                {isLate && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded">
                    <p className="text-xs font-bold text-red-800">
                      🚨 SALIDA TARDÍA: {preview.hours_late || guest.late_checkout_hours || 0}h
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{guest.full_name}</h3>
                    <p className="text-sm text-gray-600">CI: {guest.document_number || guest.customer_document_number}</p>
                  </div>
                  <span className={`badge ${isLate ? 'badge-danger' : 'badge-success'}`}>
                    Hab. {guest.room_number}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in:</span>
                    <span className="font-semibold">
                      {new Date(guest.check_in).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salida esperada:</span>
                    <span className={`font-semibold ${isLate ? 'text-red-600' : ''}`}>
                      {new Date(guest.expected_checkout).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total habitación:</span>
                    <span className="font-semibold">Bs. {total.toFixed(2)}</span>
                  </div>

                  {lateCharge > 0 && (
                    <div className="flex justify-between text-sm bg-orange-50 p-2 rounded">
                      <span className="text-orange-600 font-medium">
                        ⏰ Late Checkout ({preview.hours_late || guest.late_checkout_hours || 0}h):
                      </span>
                      <span className="text-orange-600 font-semibold">
                        + Bs. {lateCharge.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pagado:</span>
                    <span className="text-green-600 font-semibold">Bs. {paid.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-800 font-bold">SALDO:</span>
                    <span className={`font-bold text-lg ${balance > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      Bs. {balance.toFixed(2)}
                    </span>
                  </div>

                  {lateCharge > 0 && (
                    <div className="bg-blue-50 p-2 rounded text-xs text-gray-700">
                      <p className="font-medium">
                        💡 {total.toFixed(2)} + {lateCharge.toFixed(2)} - {paid.toFixed(2)} = {balance.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

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
                    className={`text-sm flex items-center justify-center gap-1 ${balance > 0.01 ? 'btn-warning' : 'btn-primary'}`}
                  >
                    <CheckOutIcon className="w-4 h-4" />
                    {balance > 0.01 ? 'Cobrar' : 'Salida'}
                  </button>
                </div>

                {balance > 0.01 && (
                  <p className="text-xs text-center text-red-600 mt-2 font-medium">
                    ⚠️ Debe cobrar Bs. {balance.toFixed(2)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No hay huéspedes registrados</p>
          <button onClick={() => setShowRegistration(true)} className="btn-success mx-auto">
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
          finalBalance={lateCheckoutInfo[selectedGuest.id]?.new_total ? (lateCheckoutInfo[selectedGuest.id].new_total - (selectedGuest.amount_paid || 0)) : selectedGuest.balance}
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