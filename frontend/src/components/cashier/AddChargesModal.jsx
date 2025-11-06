import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, ShoppingCart, Package } from 'lucide-react';
import api, { addCharges, getProducts } from '../../services/api';

const AddChargesModal = ({ guest, onClose, onAdded }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showProductSelector, setShowProductSelector] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter]);

  const loadProducts = async () => {
    try {
      const data = await api.get('/cashier/products', { params: { is_active: true } }).then(r => r.data);
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      alert('Error al cargar productos');
    } finally {
      setLoadingProducts(false);
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

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: parseFloat(product.price),
        tax_rate: parseFloat(product.tax_rate) || 0,
        category: product.category
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product_id === productId ? { ...item, quantity: parseInt(quantity) } : item
      ));
    }
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.unit_price * item.quantity;
    const tax = subtotal * (item.tax_rate / 100);
    return subtotal + tax;
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const calculateTotalTax = () => {
    return cart.reduce((sum, item) => {
      const subtotal = item.unit_price * item.quantity;
      return sum + (subtotal * (item.tax_rate / 100));
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Agregue productos al carrito');
      return;
    }

    setLoading(true);
    try {
      await addCharges(guest.id, cart);
      alert('Cargos agregados exitosamente');
      onAdded();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al agregar cargos');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-bold">
              Agregar Cargos Extras - Hab. {guest.room_number}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {guest.full_name} | Total actual: Bs. {parseFloat(guest.total_amount).toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selector de Productos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Productos Disponibles
                </h4>
                <button
                  onClick={() => setShowProductSelector(!showProductSelector)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showProductSelector ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showProductSelector && (
                <>
                  {/* Filtros */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        className="input pl-10"
                        placeholder="Buscar productos..."
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

                  {/* Lista de Productos */}
                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2">
                    {loadingProducts ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => addToCart(product)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold">{product.name}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {product.description}
                              </p>
                              <span className={`badge text-xs mt-1 ${getCategoryColor(product.category)}`}>
                                {getCategoryLabel(product.category)}
                              </span>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-green-600">
                                Bs. {parseFloat(product.price).toFixed(2)}
                              </p>
                              {product.tax_rate > 0 && (
                                <p className="text-xs text-gray-500">
                                  +{product.tax_rate}% imp.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No se encontraron productos</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Carrito */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrito ({cart.length})
              </h4>

              {cart.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Carrito vacío</p>
                  <p className="text-sm">Selecciona productos para agregar</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product_id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{item.description}</p>
                            <span className={`badge text-xs ${getCategoryColor(item.category)}`}>
                              {getCategoryLabel(item.category)}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product_id, e.target.value)}
                              className="w-16 text-center border rounded py-1"
                            />
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              Bs. {item.unit_price.toFixed(2)} x {item.quantity}
                            </p>
                            <p className="font-bold text-green-600">
                              Bs. {calculateItemTotal(item).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">Bs. {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {calculateTotalTax() > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Impuestos:</span>
                        <span className="font-semibold">Bs. {calculateTotalTax().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total Cargos:</span>
                      <span className="text-green-600">Bs. {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Nuevo total de la cuenta:</strong> Bs. {(parseFloat(guest.total_amount) + calculateTotal()).toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading || cart.length === 0}
              className="btn-success flex-1"
            >
              {loading ? 'Procesando...' : `Confirmar Cargos (Bs. ${calculateTotal().toFixed(2)})`}
            </button>
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddChargesModal;