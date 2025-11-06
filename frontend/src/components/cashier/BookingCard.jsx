import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, DollarSign, User, Calendar } from 'lucide-react';
import { getLateCheckoutPreview } from '../../services/api';
import CheckoutModal from './CheckoutModal';

const BookingCard = ({ booking, onUpdate }) => {
  const [lateCheckoutInfo, setLateCheckoutInfo] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    loadLateCheckoutPreview();
    const interval = setInterval(loadLateCheckoutPreview, 30000); // Cada 30 seg
    return () => clearInterval(interval);
  }, [booking.id]);

  const loadLateCheckoutPreview = async () => {
    try {
      const preview = await getLateCheckoutPreview(booking.id);
      setLateCheckoutInfo(preview);
    } catch (error) {
      console.error('Error al cargar preview:', error);
      setLateCheckoutInfo(null);
    }
  };

  const calculateTimeStatus = () => {
    if (!booking.expected_checkout) return null;

    const now = new Date();
    const expected = new Date(booking.expected_checkout);
    const diffMs = now - expected;
    const diffMins = Math.floor(diffMs / 60000);

    // grace period fallback (si preview no lo trae usamos 30min)
    const grace = lateCheckoutInfo?.grace_period_minutes ?? 30;

    if (diffMins < -grace) {
      const minsRemaining = Math.abs(diffMins);
      const hours = Math.floor(minsRemaining / 60);
      const mins = minsRemaining % 60;
      return { status: 'ok', text: `${hours}h ${mins}m restantes`, color: 'text-green-600' };
    } else if (diffMins < 0) {
      return { status: 'grace', text: 'En período de gracia', color: 'text-yellow-600' };
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return { status: 'late', text: `${hours}h ${mins}m de retraso`, color: 'text-red-600' };
    }
  };

  const timeStatus = calculateTimeStatus();
  const currentLateCharge = parseFloat(lateCheckoutInfo?.late_checkout_charge || 0);
  const currentBalance = parseFloat(booking.balance || booking.current_balance || 0) + currentLateCharge;
  const hasDebt = currentBalance > 0.01;

  return (
    <>
      <div className="card hover:shadow-lg transition-all">
        {lateCheckoutInfo?.is_late && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-bold text-red-800">🚨 SALIDA TARDÍA</p>
                <p className="text-sm text-red-700">
                  {timeStatus?.text} • Cargo extra: Bs. {lateCheckoutInfo.late_checkout_charge.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800">{booking.full_name}</h3>
              <p className="text-sm text-gray-600">Tel: {booking.phone || 'N/A'}</p>
              <p className="text-xs text-gray-500 font-mono">{booking.booking_code}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="badge badge-info text-lg px-3 py-1">HAB {booking.room_number}</span>
            <p className="text-xs text-gray-500 mt-1 capitalize">{booking.room_type}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Check-in</span>
            </div>
            <p className="text-sm font-semibold">
              {new Date(booking.check_in).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className={`rounded-lg p-3 ${timeStatus?.status === 'late' ? 'bg-red-50' : timeStatus?.status === 'grace' ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${timeStatus?.status === 'late' ? 'text-red-600' : timeStatus?.status === 'grace' ? 'text-yellow-600' : 'text-green-600'}`} />
              <span className="text-xs text-gray-600">Check-out</span>
            </div>
            <p className="text-sm font-semibold">
              {new Date(booking.expected_checkout).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className={`text-xs font-bold mt-1 ${timeStatus?.color}`}>{timeStatus?.text}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-700">Resumen de Cuenta</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Habitación:</span>
              <span className="font-semibold">Bs. {parseFloat(booking.base_price).toFixed(2)}</span>
            </div>

            {parseFloat(booking.additional_charges || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cargos extras:</span>
                <span className="font-semibold">Bs. {parseFloat(booking.additional_charges).toFixed(2)}</span>
              </div>
            )}

            {lateCheckoutInfo?.late_checkout_charge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-orange-600">Late checkout:</span>
                <span className="font-semibold text-orange-600">
                  Bs. {lateCheckoutInfo.late_checkout_charge.toFixed(2)}
                </span>
              </div>
            )}

            {parseFloat(booking.discounts || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Descuentos:</span>
                <span className="font-semibold text-green-600">-Bs. {parseFloat(booking.discounts).toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between">
              <span className="text-gray-700 font-semibold">Total:</span>
              <span className="font-bold text-lg">Bs. {(lateCheckoutInfo?.new_total || booking.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-green-600">Pagado:</span>
              <span className="font-semibold text-green-600">Bs. {parseFloat(booking.amount_paid).toFixed(2)}</span>
            </div>

            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold text-gray-800">SALDO:</span>
              <span className={`font-bold text-2xl ${hasDebt ? 'text-red-600' : 'text-green-600'}`}>
                Bs. {currentBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCheckoutModal(true)}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${hasDebt ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            {hasDebt ? 'Cobrar & Checkout' : 'Realizar Checkout'}
          </button>
        </div>

        {hasDebt && (
          <p className="text-xs text-center text-red-600 mt-2 font-medium">
            ⚠️ Debe cobrar Bs. {currentBalance.toFixed(2)} antes del checkout
          </p>
        )}
      </div>

      {showCheckoutModal && (
        <CheckoutModal
          guest={booking}
          finalBalance={lateCheckoutInfo?.new_total ? (lateCheckoutInfo.new_total - (booking.amount_paid || 0)) : currentBalance}
          onClose={() => setShowCheckoutModal(false)}
          onCompleted={() => {
            setShowCheckoutModal(false);
            if (typeof onUpdate === 'function') onUpdate();
          }}
        />
      )}
    </>
  );
};

export default BookingCard;