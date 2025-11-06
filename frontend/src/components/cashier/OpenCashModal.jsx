import React, { useState } from 'react';
import { openCashRegister } from '../../services/api';

const OpenCashModal = ({ onOpened }) => {
  const [initialCash, setInitialCash] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await openCashRegister(parseFloat(initialCash));
      alert('Caja abierta exitosamente');
      onOpened();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-center">Abrir Caja</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Saldo Inicial en Efectivo (Bs.)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OpenCashModal;