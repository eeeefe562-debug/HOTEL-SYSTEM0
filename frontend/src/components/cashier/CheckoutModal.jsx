import React, { useState } from 'react';
import { X, DollarSign, Send } from 'lucide-react';
import { createPayment, checkout } from '../../services/api';

const CheckoutModal = ({ guest, finalBalance, onClose, onCompleted }) => {  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Cobrar, 2: Confirmar salida

const balance = parseFloat(finalBalance || guest?.balance || 0);

  const handlePayment = async () => {
    if (balance <= 0) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      await createPayment({
        booking_id: guest.id,
        amount: balance,
        payment_method: paymentMethod
      });
      
      alert('Pago registrado exitosamente');
      setStep(2);
    } catch (error) {
      alert(error.response?.data?.error || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await checkout(guest.id);
      alert('✅ Salida registrada exitosamente.\n📱 WhatsApp enviado al administrador.');
      onCompleted();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al registrar salida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            Registrar Salida - Hab. {guest.room_number}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Información del huésped */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="font-bold text-lg">{guest.full_name}</p>
          <p className="text-sm text-gray-600">CI: {guest.document_number}</p>
          <p className="text-xs text-gray-500 mt-2">
            Check-in: {new Date(guest.check_in).toLocaleString('es-BO')}
          </p>
        </div>

        {step === 1 && (
          <>
            {/* Resumen de cuenta */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total a Pagar:</span>
                <span className="font-bold text-xl text-green-600">
                  Bs. {parseFloat(guest.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ya Pagado:</span>
                <span className="text-green-600">
                  Bs. {parseFloat(guest.amount_paid).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600 font-bold">Saldo Pendiente:</span>
                <span className={`font-bold text-2xl ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Bs. {balance.toFixed(2)}
                </span>
              </div>
            </div>

            {balance > 0 && (
              <div className="mb-6">
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
            )}

            <div className="flex gap-2">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                {balance > 0 ? 'Cobrar y Continuar' : 'Continuar'}
              </button>
              <button onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg mb-6">
              <p className="text-green-800 font-semibold text-center mb-2">
                ✅ Pago completado
              </p>
              <p className="text-sm text-gray-600 text-center">
                ¿Confirmar salida del huésped?
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Se enviará notificación por WhatsApp al administrador con el resumen del cobro
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Procesando...' : 'Confirmar Salida'}
              </button>
              <button onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;