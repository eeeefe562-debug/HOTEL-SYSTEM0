import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Power } from 'lucide-react';
import {
  getDiscountPresets,
  createDiscountPreset,
  updateDiscountPreset,
  toggleDiscountPreset,
  deleteDiscountPreset
} from '../services/api';

const DiscountsManagement = () => {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage',
    discount_value: '',
    reason: '',
    requires_authorization: false,
    display_order: 0
  });

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    try {
      const data = await getDiscountPresets();
      setDiscounts(data);
    } catch (error) {
      console.error('Error al cargar descuentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingDiscount) {
        await updateDiscountPreset(editingDiscount.id, formData);
        alert('Descuento actualizado exitosamente');
      } else {
        await createDiscountPreset(formData);
        alert('Descuento creado exitosamente');
      }

      setShowModal(false);
      setEditingDiscount(null);
      resetForm();
      loadDiscounts();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar descuento');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      reason: discount.reason,
      requires_authorization: discount.requires_authorization,
      display_order: discount.display_order
    });
    setShowModal(true);
  };

  const handleToggle = async (id) => {
    try {
      await toggleDiscountPreset(id);
      loadDiscounts();
    } catch (error) {
      alert('Error al cambiar estado del descuento');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar el descuento "${name}"?`)) return;

    try {
      await deleteDiscountPreset(id);
      alert('Descuento eliminado exitosamente');
      loadDiscounts();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar descuento');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      discount_type: 'percentage',
      discount_value: '',
      reason: '',
      requires_authorization: false,
      display_order: 0
    });
  };

  if (loading && discounts.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-800">Descuentos Predefinidos</h2>
          <p className="text-sm text-gray-600">Gestiona los descuentos disponibles para los cajeros</p>
        </div>
        <button
          onClick={() => {
            setEditingDiscount(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Nuevo Descuento
        </button>
      </div>

      {/* Lista de descuentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {discounts.map((discount) => (
          <div key={discount.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  discount.is_active ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Tag className={`w-5 h-5 ${discount.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{discount.name}</h3>
                  <p className="text-lg font-bold text-green-600">
                    {discount.discount_type === 'percentage' 
                      ? `${discount.discount_value}%` 
                      : `Bs. ${discount.discount_value}`}
                  </p>
                </div>
              </div>
              <span className={`badge ${discount.is_active ? 'badge-success' : 'badge-danger'}`}>
                {discount.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{discount.reason}</p>

            {discount.requires_authorization && (
              <div className="mb-3">
                <span className="badge badge-warning text-xs">
                  Requiere Autorización
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => handleEdit(discount)}
                className="flex-1 text-sm text-blue-600 hover:bg-blue-50 py-2 rounded transition-colors"
              >
                <Edit2 className="w-4 h-4 inline mr-1" />
                Editar
              </button>
              <button
                onClick={() => handleToggle(discount.id)}
                className={`flex-1 text-sm py-2 rounded transition-colors ${
                  discount.is_active 
                    ? 'text-orange-600 hover:bg-orange-50' 
                    : 'text-green-600 hover:bg-green-50'
                }`}
              >
                <Power className="w-4 h-4 inline mr-1" />
                {discount.is_active ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => handleDelete(discount.id, discount.name)}
                className="flex-1 text-sm text-red-600 hover:bg-red-50 py-2 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {discounts.length === 0 && (
        <div className="card text-center py-12">
          <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No hay descuentos creados</p>
          <p className="text-sm text-gray-400 mt-2">Crea descuentos predefinidos para facilitar el trabajo de los cajeros</p>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {editingDiscount ? 'Editar Descuento' : 'Nuevo Descuento'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre del Descuento *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Cliente Frecuente"
                />
              </div>

              <div>
                <label className="label">Tipo de Descuento</label>
                <select
                  className="input"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo (Bs.)</option>
                </select>
              </div>

              <div>
                <label className="label">
                  Valor del Descuento * {formData.discount_type === 'percentage' ? '(%)' : '(Bs.)'}
                </label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Razón/Motivo *</label>
                <textarea
                  className="input"
                  rows="2"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="Ej: Cliente con más de 3 estadías"
                />
              </div>

              <div>
                <label className="label">Orden de Visualización</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Menor número aparece primero</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_auth"
                  checked={formData.requires_authorization}
                  onChange={(e) => setFormData({ ...formData, requires_authorization: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="requires_auth" className="text-sm">
                  Requiere autorización del administrador
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="btn-primary flex-1">
                  {editingDiscount ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDiscount(null);
                    resetForm();
                  }}
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

export default DiscountsManagement;