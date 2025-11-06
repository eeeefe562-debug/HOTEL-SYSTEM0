import React, { useState, useEffect } from 'react';
import { getCashiers, createCashier, updateCashier, toggleCashierStatus, deleteCashier } from '../services/api';
import { User, Edit, Trash2, Plus, X, Check, Shield, DollarSign } from 'lucide-react';

const CashiersManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    email: '',
    permissions: {
      can_create_bookings: true,
      can_modify_bookings: false,
      can_cancel_bookings: false,
      can_apply_discounts: false,
      max_discount_percentage: 0,
      can_process_refunds: false,
      can_view_reports: false,
      can_manage_inventory: false
    }
  });

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    try {
      setLoading(true);
      const data = await getCashiers();
      setCashiers(data);
    } catch (error) {
      alert('Error al cargar cajeros: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCashier) {
        // Editar cajero existente
        await updateCashier(editingCashier.id, formData);
        alert('Cajero actualizado exitosamente');
      } else {
        // Crear nuevo cajero
        await createCashier(formData);
        alert('Cajero creado exitosamente');
      }
      
      closeModal();
      loadCashiers();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };
const handleEdit = (cashier) => {
  setEditingCashier(cashier);
  setFormData({
    username: cashier.username,
    password: '', // Dejar vacío al editar
    full_name: cashier.full_name,
    phone: cashier.phone || '',
    email: cashier.email || '',
    permissions: {
      can_create_bookings: cashier.can_create_bookings || false,
      can_modify_bookings: cashier.can_modify_bookings || false,
      can_cancel_bookings: cashier.can_cancel_bookings || false,
      can_apply_discounts: cashier.can_apply_discounts || false,
      max_discount_percentage: cashier.max_discount_percentage || 0,
      can_process_refunds: cashier.can_process_refunds || false,
      can_view_reports: cashier.can_view_reports || false,
      can_manage_inventory: cashier.can_manage_inventory || false
    }
  });
  setShowModal(true);
};

  const handleToggleStatus = async (id, name, currentStatus) => {
  if (window.confirm(`¿${currentStatus ? 'Desactivar' : 'Activar'} al cajero ${name}?`)) {
    try {
      await toggleCashierStatus(id);
      alert(`Cajero ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
      loadCashiers();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  }
};

const handleDelete = async (id, name) => {
  if (window.confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE al cajero ${name}? Esta acción no se puede deshacer.`)) {
    try {
      await deleteCashier(id);
      alert('Cajero eliminado permanentemente');
      loadCashiers();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  }
};

  const closeModal = () => {
    setShowModal(false);
    setEditingCashier(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      phone: '',
      email: '',
      permissions: {
        can_create_bookings: true,
        can_modify_bookings: false,
        can_cancel_bookings: false,
        can_apply_discounts: false,
        max_discount_percentage: 0,
        can_process_refunds: false,
        can_view_reports: false,
        can_manage_inventory: false
      }
    });
  };

  const handlePermissionChange = (permission, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: value
      }
    });
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Cajeros</h2>
          <p className="text-gray-600 mt-1">Administra los cajeros y sus permisos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cajero
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8" />
            <div>
              <p className="text-blue-100 text-sm">Total Cajeros</p>
              <p className="text-2xl font-bold">{cashiers.length}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-3">
            <Check className="w-8 h-8" />
            <div>
              <p className="text-green-100 text-sm">Activos</p>
              <p className="text-2xl font-bold">
                {cashiers.filter(c => c.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <X className="w-8 h-8" />
            <div>
              <p className="text-orange-100 text-sm">Inactivos</p>
              <p className="text-2xl font-bold">
                {cashiers.filter(c => !c.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de cajeros */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Permisos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cashiers.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-gray-500 py-8">
                  No hay cajeros registrados
                </td>
              </tr>
            ) : (
              cashiers.map((cashier) => (
                <tr key={cashier.id}>
                  <td className="font-semibold">{cashier.username}</td>
                  <td>{cashier.full_name}</td>
                  <td>{cashier.email || '-'}</td>
                  <td>{cashier.phone || '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      {cashier.can_create_bookings && (
                        <span className="badge badge-success" title="Crear reservas">
                          Reservas
                        </span>
                      )}
                      {cashier.can_apply_discounts && (
                        <span className="badge badge-warning" title="Aplicar descuentos">
                          Desc. {cashier.max_discount_percentage}%
                        </span>
                      )}
                      {cashier.can_process_refunds && (
                        <span className="badge badge-danger" title="Procesar devoluciones">
                          Devoluciones
                        </span>
                      )}
                      {cashier.can_view_reports && (
                        <span className="badge badge-info" title="Ver reportes">
                          Reportes
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {cashier.is_active ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                 <td>
  <div className="flex gap-2">
    <button
      onClick={() => handleEdit(cashier)}
      className="text-blue-600 hover:text-blue-800"
      title="Editar"
    >
      <Edit className="w-5 h-5" />
    </button>
    <button
      onClick={() => handleToggleStatus(cashier.id, cashier.full_name, cashier.is_active)}
      className={`${cashier.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
      title={cashier.is_active ? 'Desactivar' : 'Activar'}
    >
      {cashier.is_active ? '🔴' : '🟢'}
    </button>
    <button
      onClick={() => handleDelete(cashier.id, cashier.full_name)}
      className="text-red-600 hover:text-red-800"
      title="Eliminar permanentemente"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  </div>
</td> 
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de crear/editar cajero */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">
                {editingCashier ? 'Editar Cajero' : 'Nuevo Cajero'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos básicos */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Datos Básicos
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Usuario *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                      disabled={editingCashier}
                    />
                  </div>

                  <div>
                    <label className="label">
                      Contraseña {editingCashier && '(dejar vacío para no cambiar)'}
                    </label>
                    <input
                      type="password"
                      className="input"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required={!editingCashier}
                      placeholder={editingCashier ? '********' : ''}
                    />
                  </div>

                  <div>
                    <label className="label">Nombre Completo *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Teléfono</label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+59171234567"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  {editingCashier && (
                    <div className="md:col-span-2">
                      <label className="label">Estado</label>
                      <select
                        className="input"
                        value={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                      >
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Permisos */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permisos
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.can_create_bookings}
                      onChange={(e) => handlePermissionChange('can_create_bookings', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Crear Reservas</p>
                      <p className="text-sm text-gray-600">Permite realizar check-ins</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.can_modify_bookings}
                      onChange={(e) => handlePermissionChange('can_modify_bookings', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Modificar Reservas</p>
                      <p className="text-sm text-gray-600">Puede editar reservas existentes</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.can_cancel_bookings}
                      onChange={(e) => handlePermissionChange('can_cancel_bookings', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Cancelar Reservas</p>
                      <p className="text-sm text-gray-600">Puede cancelar reservas</p>
                    </div>
                  </label>

                  <div className="p-3 border rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_apply_discounts}
                        onChange={(e) => handlePermissionChange('can_apply_discounts', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium">Aplicar Descuentos</p>
                        <p className="text-sm text-gray-600">Puede aplicar descuentos a reservas</p>
                      </div>
                    </label>
                    {formData.permissions.can_apply_discounts && (
                      <div className="ml-7">
                        <label className="label">Descuento máximo (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input"
                          value={formData.permissions.max_discount_percentage}
                          onChange={(e) => handlePermissionChange('max_discount_percentage', parseFloat(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.can_process_refunds}
                      onChange={(e) => handlePermissionChange('can_process_refunds', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Procesar Devoluciones</p>
                      <p className="text-sm text-gray-600">Puede procesar reembolsos</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.can_view_reports}
                      onChange={(e) => handlePermissionChange('can_view_reports', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Ver Reportes</p>
                      <p className="text-sm text-gray-600">Acceso a reportes de ventas</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.can_manage_inventory}
                      onChange={(e) => handlePermissionChange('can_manage_inventory', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Gestionar Inventario</p>
                      <p className="text-sm text-gray-600">Puede gestionar productos</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="btn-primary flex-1">
                  {editingCashier ? 'Actualizar Cajero' : 'Crear Cajero'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashiersManagement;