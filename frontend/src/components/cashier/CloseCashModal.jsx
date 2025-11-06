import React, { useState } from 'react';
import { closeCashRegister } from '../../services/api';

const CloseCashModal = ({ cashRegister, onClose, onClosed }) => {
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const expectedCash = parseFloat(cashRegister.expected_cash || 0);
  const difference = actualCash ? parseFloat(actualCash) - expectedCash : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.confirm('¿Confirmar cierre de caja?')) {
      setLoading(true);
      try {
        await closeCashRegister(parseFloat(actualCash), notes);
        alert('Caja cerrada exitosamente. Pendiente de aprobación.');
        onClosed();
      } catch (error) {
        alert(error.response?.data?.error || 'Error al cerrar caja');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Cerrar Caja</h3>

        <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between">
            <span className="text-gray-600">Efectivo Esperado:</span>
            <span className="font-bold text-green-600">Bs. {expectedCash.toFixed(2)}</span>
          </div>
          {actualCash && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Efectivo Real:</span>
                <span className="font-bold">Bs. {parseFloat(actualCash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Diferencia:</span>
                <span className={`font-bold ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Bs. {difference.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Efectivo Real Contado (Bs.)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label">Notas / Observaciones</label>
            <textarea
              className="input"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios adicionales..."
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-danger flex-1">
              {loading ? 'Cerrando...' : 'Cerrar Caja'}
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

export default CloseCashModal;