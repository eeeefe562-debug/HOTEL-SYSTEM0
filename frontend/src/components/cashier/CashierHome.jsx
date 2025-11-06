import React, { useState, useEffect } from 'react';
import { getCashRegisterCurrent } from '../../services/api';
import OpenCashModal from './OpenCashModal';
import CloseCashModal from './CloseCashModal';

const CashierHome = () => {
  const [cashRegister, setCashRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    loadCashRegister();
  }, []);

  const loadCashRegister = async () => {
    try {
      const data = await getCashRegisterCurrent();
      setCashRegister(data);
    } catch (error) {
      setCashRegister(null);
    } finally {
      setLoading(false);
    }
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
      {cashRegister ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Tu Turno Actual</h2>
            <button onClick={() => setShowCloseModal(true)} className="btn-danger">
              Cerrar Caja
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <p className="text-green-100 text-sm">Total Efectivo</p>
              <p className="text-3xl font-bold mt-2">
                Bs. {parseFloat(cashRegister.total_cash_payments || 0).toFixed(2)}
              </p>
            </div>

            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <p className="text-blue-100 text-sm">Total Tarjeta</p>
              <p className="text-3xl font-bold mt-2">
                Bs. {parseFloat(cashRegister.total_card_payments || 0).toFixed(2)}
              </p>
            </div>

            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <p className="text-purple-100 text-sm">Total Cobrado</p>
              <p className="text-3xl font-bold mt-2">
                Bs. {parseFloat(cashRegister.total_collected || 0).toFixed(2)}
              </p>
              <p className="text-purple-100 text-xs mt-1">
                {cashRegister.total_transactions || 0} transacciones
              </p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Detalle de Caja</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Saldo Inicial:</span>
                <span className="font-semibold">Bs. {parseFloat(cashRegister.initial_cash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Efectivo Esperado:</span>
                <span className="font-semibold text-green-600">
                  Bs. {parseFloat(cashRegister.expected_cash).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Hora de apertura:</span>
                <span>{new Date(cashRegister.opening_time).toLocaleString('es-BO')}</span>
              </div>
            </div>
          </div>

          {showCloseModal && (
            <CloseCashModal
              cashRegister={cashRegister}
              onClose={() => setShowCloseModal(false)}
              onClosed={() => {
                setShowCloseModal(false);
                loadCashRegister();
              }}
            />
          )}
        </>
      ) : (
        <OpenCashModal onOpened={loadCashRegister} />
      )}
    </div>
  );
};

export default CashierHome;