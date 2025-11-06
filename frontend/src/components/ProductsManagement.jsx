import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { getProducts, createProduct, updateProduct, toggleProductStatus, deleteProduct } from '../services/api';

const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'minibar',
    price: '',
    cost: '',
    tax_rate: '0',
    stock_quantity: '0',
    track_inventory: false,
    is_active: true
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter]);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
      alert(editingProduct ? 'Producto actualizado' : 'Producto creado exitosamente');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      cost: product.cost || '',
      tax_rate: product.tax_rate || '0',
      stock_quantity: product.stock_quantity || '0',
      track_inventory: product.track_inventory || false,
      is_active: product.is_active
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (id, currentStatus) => {
  if (!window.confirm(`¿${currentStatus ? 'Desactivar' : 'Activar'} este producto?`)) return;

  try {
    await toggleProductStatus(id);
    loadProducts();
    alert(`Producto ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
  } catch (error) {
    alert(error.response?.data?.error || 'Error al cambiar estado del producto');
  }
};

  const handleDelete = async (id) => {
  if (!window.confirm('¿Eliminar este producto permanentemente?')) return;

  try {
    await deleteProduct(id);
    loadProducts();
    alert('Producto eliminado exitosamente');
  } catch (error) {
    alert(error.response?.data?.error || 'Error al eliminar producto');
  }
};

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'minibar',
      price: '',
      cost: '',
      tax_rate: '0',
      stock_quantity: '0',
      track_inventory: false,
      is_active: true
    });
  };

  const getCategoryLabel = (category) => {
    const labels = {
      minibar: 'Minibar',
      restaurant: 'Restaurant',
      laundry: 'Lavandería',
      spa: 'Spa',
      other: 'Otros'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      minibar: 'bg-blue-100 text-blue-800',
      restaurant: 'bg-green-100 text-green-800',
      laundry: 'bg-purple-100 text-purple-800',
      spa: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  if (loading && products.length === 0) {
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
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Productos</h2>
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            <option value="minibar">Minibar</option>
            <option value="restaurant">Restaurant</option>
            <option value="laundry">Lavandería</option>
            <option value="spa">Spa</option>
            <option value="other">Otros</option>
          </select>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-blue-100 text-sm">Total Productos</p>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-green-100 text-sm">Activos</p>
          <p className="text-3xl font-bold">
            {products.filter(p => p.is_active).length}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-purple-100 text-sm">Categorías</p>
          <p className="text-3xl font-bold">
            {new Set(products.map(p => p.category)).size}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <p className="text-orange-100 text-sm">Inactivos</p>
          <p className="text-3xl font-bold">
            {products.filter(p => !p.is_active).length}
          </p>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="font-semibold">{product.name}</td>
                <td>
                  <span className={`badge ${getCategoryColor(product.category)}`}>
                    {getCategoryLabel(product.category)}
                  </span>
                </td>
                <td className="text-sm text-gray-600 max-w-xs truncate">
                  {product.description || '-'}
                </td>
                <td className="font-semibold text-green-600">
                  Bs. {parseFloat(product.price).toFixed(2)}
                </td>
                <td>
                  {product.track_inventory ? (
                    <span className={`badge ${product.stock_quantity > 10 ? 'badge-success' : 'badge-warning'}`}>
                      {product.stock_quantity}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${product.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
               <td>
  <div className="flex gap-2">
    <button
      onClick={() => handleEdit(product)}
      className="text-blue-600 hover:text-blue-800"
      title="Editar"
    >
      <Edit2 className="w-4 h-4" />
    </button>
    <button
      onClick={() => handleToggleStatus(product.id, product.is_active)}
      className={`${product.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
      title={product.is_active ? 'Desactivar' : 'Activar'}
    >
      {product.is_active ? '🔴' : '🟢'}
    </button>
    <button
      onClick={() => handleDelete(product.id)}
      className="text-red-600 hover:text-red-800"
      title="Eliminar permanentemente"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</td> 
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre del Producto *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">Categoría *</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  >
                    <option value="minibar">Minibar</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="laundry">Lavandería</option>
                    <option value="spa">Spa</option>
                    <option value="other">Otros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descripción opcional del producto..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Precio Unitario (Bs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">Costo (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  />
                </div>

                <div>
                  <label className="label">Impuesto (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({...formData, tax_rate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  />
                </div>

                <div className="space-y-3 pt-7">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.track_inventory}
                      onChange={(e) => setFormData({...formData, track_inventory: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Controlar inventario</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Producto activo</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
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

export default ProductsManagement;