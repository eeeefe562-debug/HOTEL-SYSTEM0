import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory
} from '../services/api';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'package',
    color: 'blue',
    display_order: 0,
    is_active: true
  });

  const colorOptions = [
    { value: 'blue', label: 'Azul', class: 'bg-blue-100 text-blue-800' },
    { value: 'green', label: 'Verde', class: 'bg-green-100 text-green-800' },
    { value: 'purple', label: 'Morado', class: 'bg-purple-100 text-purple-800' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-100 text-pink-800' },
    { value: 'orange', label: 'Naranja', class: 'bg-orange-100 text-orange-800' },
    { value: 'red', label: 'Rojo', class: 'bg-red-100 text-red-800' },
    { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'gray', label: 'Gris', class: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCategory) {
        await updateProductCategory(editingCategory.id, formData);
      } else {
        await createProductCategory(formData);
      }

      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      loadCategories();
      alert(editingCategory ? 'Categoría actualizada' : 'Categoría creada exitosamente');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'package',
      color: category.color || 'blue',
      display_order: category.display_order || 0,
      is_active: category.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Solo se puede eliminar si no tiene productos.')) return;

    try {
      await deleteProductCategory(id);
      loadCategories();
      alert('Categoría eliminada');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar categoría');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'package',
      color: 'blue',
      display_order: 0,
      is_active: true
    });
  };

  const getCategoryColor = (color) => {
    const option = colorOptions.find(c => c.value === color);
    return option ? option.class : 'bg-gray-100 text-gray-800';
  };

  if (loading && categories.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-800">Categorías de Productos</h2>
          <p className="text-sm text-gray-600">Gestiona las categorías para organizar tus productos</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Nueva Categoría
        </button>
      </div>

      {/* Grid de categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${getCategoryColor(category.color)} flex items-center justify-center`}>
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-xs text-gray-500">
                    {category.products_count} producto(s)
                  </p>
                </div>
              </div>
              <span className={`badge ${category.is_active ? 'badge-success' : 'badge-danger'}`}>
                {category.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            {category.description && (
              <p className="text-sm text-gray-600 mb-3">{category.description}</p>
            )}

            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => handleEdit(category)}
                className="flex-1 text-sm text-blue-600 hover:bg-blue-50 py-2 rounded transition-colors"
              >
                <Edit2 className="w-4 h-4 inline mr-1" />
                Editar
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="flex-1 text-sm text-red-600 hover:bg-red-50 py-2 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="card text-center py-12">
          <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No hay categorías creadas</p>
          <p className="text-sm text-gray-400 mt-2">Crea tu primera categoría para organizar los productos</p>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre de la Categoría *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional..."
                />
              </div>

              <div>
                <label className="label">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-3 rounded-lg text-xs font-medium transition-all ${
                        formData.color === color.value
                          ? `${color.class} ring-2 ring-offset-2 ring-gray-400`
                          : `${color.class} opacity-50 hover:opacity-100`
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Orden de visualización</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Mayor número aparece primero</p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Categoría activa</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
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

export default CategoriesManagement;