import React, { useState, useEffect } from 'react';
import { 
  Calendar, Download, DollarSign, CreditCard, 
  TrendingUp, Filter, FileText, Users
} from 'lucide-react';
import { getRevenueReport } from '../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    payment_method: '',
    cashier_id: ''
  });

  // Establecer fechas por defecto (últimos 7 días)
  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    setFilters({
      start_date: lastWeek.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      payment_method: '',
      cashier_id: ''
    });
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getRevenueReport(filters);
      setReportData(data);
    } catch (error) {
      alert('Error al cargar reporte: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const data = await getRevenueReport({ ...filters, format: 'csv' });
      
      // Crear blob y descargar
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_ingresos_${filters.start_date}_${filters.end_date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error al exportar: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Reportes de Ingresos</h2>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Fecha inicial */}
          <div>
            <label className="label">
              <Calendar className="w-4 h-4 inline mr-2" />
              Fecha Inicial
            </label>
            <input
              type="date"
              name="start_date"
              className="input"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </div>

          {/* Fecha final */}
          <div>
            <label className="label">
              <Calendar className="w-4 h-4 inline mr-2" />
              Fecha Final
            </label>
            <input
              type="date"
              name="end_date"
              className="input"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="label">
              <CreditCard className="w-4 h-4 inline mr-2" />
              Método de Pago
            </label>
            <select
              name="payment_method"
              className="input"
              value={filters.payment_method}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="check">Cheque</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex items-end gap-2">
            <button
              onClick={loadReport}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Cargando...' : 'Generar Reporte'}
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de ingresos */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total de transacciones */}
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Transacciones</p>
                  <p className="text-3xl font-bold mt-2">
                    {reportData.summary.total_payments}
                  </p>
                </div>
                <FileText className="w-12 h-12 text-blue-200" />
              </div>
            </div>

            {/* Total ingresos */}
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Ingresos</p>
                  <p className="text-3xl font-bold mt-2">
                    Bs. {reportData.summary.total_amount.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-green-200" />
              </div>
            </div>

            {/* Efectivo */}
            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Efectivo</p>
                  <p className="text-2xl font-bold mt-2">
                    Bs. {reportData.summary.by_method.cash?.amount.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-purple-100 text-xs mt-1">
                    {reportData.summary.by_method.cash?.count || 0} pagos
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-purple-200" />
              </div>
            </div>

            {/* Tarjeta */}
            <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Tarjeta</p>
                  <p className="text-2xl font-bold mt-2">
                    Bs. {reportData.summary.by_method.card?.amount.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-orange-100 text-xs mt-1">
                    {reportData.summary.by_method.card?.count || 0} pagos
                  </p>
                </div>
                <CreditCard className="w-12 h-12 text-orange-200" />
              </div>
            </div>
          </div>

          {/* Desglose por método de pago */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Desglose por Método de Pago</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Cantidad</th>
                    <th>Monto Total</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.summary.by_method).map(([method, data]) => {
                    const percentage = (data.amount / reportData.summary.total_amount) * 100;
                    const methodNames = {
                      cash: 'Efectivo',
                      card: 'Tarjeta',
                      transfer: 'Transferencia',
                      check: 'Cheque'
                    };

                    return (
                      <tr key={method}>
                        <td className="font-semibold capitalize">{methodNames[method]}</td>
                        <td>{data.count}</td>
                        <td className="text-green-600 font-semibold">
                          Bs. {data.amount.toFixed(2)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de transacciones */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detalle de Transacciones</h3>
              <button onClick={exportToCSV} className="btn-success flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Código Reserva</th>
                    <th>Cliente</th>
                    <th>Habitación</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Cajero</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="text-sm">
                        {new Date(payment.payment_date).toLocaleString('es-BO', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="font-mono text-sm">{payment.booking_code}</td>
                      <td>{payment.customer_name}</td>
                      <td className="font-semibold">{payment.room_number}</td>
                      <td className="text-green-600 font-semibold">
                        Bs. {parseFloat(payment.amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${
                          payment.payment_method === 'cash' ? 'badge-success' :
                          payment.payment_method === 'card' ? 'badge-info' :
                          payment.payment_method === 'transfer' ? 'badge-warning' :
                          'badge-secondary'
                        }`}>
                          {payment.payment_method === 'cash' ? 'Efectivo' :
                           payment.payment_method === 'card' ? 'Tarjeta' :
                           payment.payment_method === 'transfer' ? 'Transferencia' :
                           payment.payment_method === 'check' ? 'Cheque' : payment.payment_method}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{payment.cashier_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {reportData.payments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay transacciones en el período seleccionado
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mensaje inicial */}
      {!reportData && !loading && (
        <div className="card text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Selecciona un rango de fechas
          </h3>
          <p className="text-gray-500">
            Configura los filtros y haz clic en "Generar Reporte" para ver los ingresos
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;