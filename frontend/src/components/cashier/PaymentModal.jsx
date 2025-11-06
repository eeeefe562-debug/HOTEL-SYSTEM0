import React, { useState } from 'react';
import { createPayment } from '../../services/api';

const PaymentModal = ({ booking, onClose, onPaid }) => {
  const [amount, setAmount] = useState(booking.balance.toString());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createPayment({
        booking_id: booking.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod
      });
      alert('Pago registrado exitosamente. WhatsApp enviado al cliente.');
      onPaid();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
        <p className="text-sm text-gray-600 mb-4">
          Cliente: {booking.full_name} - Habitación {booking.room_number}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Monto a Cobrar (Bs.)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={booking.balance}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Saldo pendiente: Bs. {parseFloat(booking.balance).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="label">Método de Pago</label>
            <select
              className="input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="check">Cheque</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={loading} className="btn-success flex-1">
              {loading ? 'Procesando...' : 'Registrar Pago'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;