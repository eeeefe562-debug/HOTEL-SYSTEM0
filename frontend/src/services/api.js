import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTENTICACIÓN
// ============================================

export const loginAdmin = async (email, password) => {
  const response = await api.post('/auth/admin/login', { email, password });
  return response.data;
};

export const loginCashier = async (username, password, admin_id) => {
  const response = await api.post('/auth/cashier/login', { username, password, admin_id });
  return response.data;
};

// ============================================
// DASHBOARD
// ============================================

export const getDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

// ============================================
// HABITACIONES
// ============================================

export const getRooms = async () => {
  const response = await api.get('/admin/rooms');
  return response.data;
};

export const createRoom = async (roomData) => {
  const response = await api.post('/admin/rooms', roomData);
  return response.data;
};

export const updateRoom = async (id, roomData) => {
  const response = await api.put(`/admin/rooms/${id}`, roomData);
  return response.data;
};

export const toggleRoomMaintenance = async (id) => {
  const response = await api.patch(`/admin/rooms/${id}/toggle-maintenance`);
  return response.data;
};

export const deleteRoom = async (id) => {
  const response = await api.delete(`/admin/rooms/${id}`);
  return response.data;
};

export const getAvailableRooms = async (params) => {
  const response = await api.get('/cashier/rooms/available', { params });
  return response.data;
};

// ============================================
// CAJEROS
// ============================================

export const getCashiers = async () => {
  const response = await api.get('/admin/users/cashiers');
  return response.data;
};

export const createCashier = async (cashierData) => {
  const response = await api.post('/admin/users/cashiers', cashierData);
  return response.data;
};

export const updateCashier = async (id, cashierData) => {
  const response = await api.put(`/admin/users/cashiers/${id}`, cashierData);
  return response.data;
};

export const toggleCashierStatus = async (id) => {
  const response = await api.patch(`/admin/users/cashiers/${id}/toggle-status`);
  return response.data;
};

export const deleteCashier = async (id) => {
  const response = await api.delete(`/admin/users/cashiers/${id}`);
  return response.data;
};

// ============================================
// PRODUCTOS
// ============================================

export const getProducts = async (params) => {
  const response = await api.get('/admin/products', { params });
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post('/admin/products', productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await api.put(`/admin/products/${id}`, productData);
  return response.data;
};

export const toggleProductStatus = async (id) => {
  const response = await api.patch(`/admin/products/${id}/toggle-status`);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/admin/products/${id}`);
  return response.data;
};

// ============================================
// CAJA REGISTRADORA
// ============================================

export const openCashRegister = async (initial_cash) => {
  const response = await api.post('/cashier/cash-register/open', { initial_cash });
  return response.data;
};

export const getCashRegisterCurrent = async () => {
  const response = await api.get('/cashier/cash-register/current');
  return response.data;
};

export const closeCashRegister = async (actual_cash, notes) => {
  const response = await api.post('/cashier/cash-register/close', { actual_cash, notes });
  return response.data;
};

// ============================================
// CLIENTES
// ============================================

export const searchCustomers = async (query) => {
  const response = await api.get('/cashier/customers/search', { params: { q: query } });
  return response.data;
};

export const createCustomer = async (customerData) => {
  const response = await api.post('/cashier/customers', customerData);
  return response.data;
};

// ============================================
// RESERVAS
// ============================================

export const searchBookings = async (params) => {
  const response = await api.get('/cashier/bookings/search', { params });
  return response.data;
};

export const getBookingDetail = async (id) => {
  const response = await api.get(`/cashier/bookings/${id}`);
  return response.data;
};

export const getActiveBookings = async () => {
  const response = await api.get('/cashier/bookings/active');
  return response.data;
};
export const createBooking = async (bookingData) => {
  const response = await api.post('/cashier/bookings', bookingData);
  return response.data;
};

export const addCharges = async (bookingId, items) => {
  const response = await api.post(`/cashier/bookings/${bookingId}/charges`, { items });
  return response.data;
};

export const checkout = async (bookingId) => {
  const response = await api.post(`/cashier/bookings/${bookingId}/checkout`);
  return response.data;
};

export const applyDiscount = async (bookingId, discountData) => {
  const response = await api.post(`/cashier/bookings/${bookingId}/discounts`, discountData);
  return response.data;
};

// ============================================
// PAGOS
// ============================================

export const createPayment = async (paymentData) => {
  const response = await api.post('/cashier/payments', paymentData);
  return response.data;
};

export const processPayment = async (paymentData) => {
  const response = await api.post('/cashier/payments', paymentData);
  return response.data;
};

export const createRefund = async (refundData) => {
  const response = await api.post('/cashier/refunds', refundData);
  return response.data;
};

// ============================================
// REPORTES
// ============================================

export const getRevenueReport = async (params) => {
  const response = await api.get('/reports/revenue', { params });
  return response.data;
};

export const getDiscountsReport = async (params) => {
  const response = await api.get('/reports/discounts', { params });
  return response.data;
};

export const getCashRegistersReport = async (params) => {
  const response = await api.get('/reports/cash-registers', { params });
  return response.data;
};

export const reviewCashRegister = async (id, action, notes) => {
  const response = await api.put(`/reports/cash-registers/${id}/review`, { action, notes });
  return response.data;
};

export const getPendingInvoices = async () => {
  const response = await api.get('/reports/pending-invoices');
  return response.data;
};

export const getFrequentCustomers = async () => {
  const response = await api.get('/reports/frequent-customers');
  return response.data;
};
// ============================================
// RUTAS ESPECÍFICAS PARA CAJERO
// ============================================

export const getCashierRooms = async () => {
  const response = await api.get('/cashier/rooms/all');
  return response.data;
};

export const createGuestBooking = async (bookingData) => {
  const response = await api.post('/cashier/guests/register', bookingData);
  return response.data;
};
// ============================================
// CATEGORÍAS DE PRODUCTOS
// ============================================

export const getProductCategories = async () => {
  const response = await api.get('/admin/product-categories');
  return response.data;
};

export const createProductCategory = async (categoryData) => {
  const response = await api.post('/admin/product-categories', categoryData);
  return response.data;
};

export const updateProductCategory = async (id, categoryData) => {
  const response = await api.put(`/admin/product-categories/${id}`, categoryData);
  return response.data;
};

export const deleteProductCategory = async (id) => {
  const response = await api.delete(`/admin/product-categories/${id}`);
  return response.data;
};
// En la sección de PRODUCTOS (línea ~100)

export const getProductsForCashier = async (params) => {
  const response = await api.get('/cashier/products', { params });
  return response.data;
};

export default api;
// ============================================
// CONFIGURACIONES DEL HOTEL
// ============================================

export const getHotelSettings = async () => {
  const response = await api.get('/admin/hotel-settings');
  return response.data;
};

export const updateHotelSettings = async (settingsData) => {
  const response = await api.put('/admin/hotel-settings', settingsData);
  return response.data;
};

// ============================================
// DESCUENTOS PREDEFINIDOS
// ============================================

export const getDiscountPresets = async () => {
  const response = await api.get('/admin/discount-presets');
  return response.data;
};

export const createDiscountPreset = async (discountData) => {
  const response = await api.post('/admin/discount-presets', discountData);
  return response.data;
};

export const updateDiscountPreset = async (id, discountData) => {
  const response = await api.put(`/admin/discount-presets/${id}`, discountData);
  return response.data;
};

export const toggleDiscountPreset = async (id) => {
  const response = await api.patch(`/admin/discount-presets/${id}/toggle`);
  return response.data;
};

export const deleteDiscountPreset = async (id) => {
  const response = await api.delete(`/admin/discount-presets/${id}`);
  return response.data;
};




// ---------- BLACKLIST ----------
export const getBlacklist = async () => {
  const response = await api.get('/blacklist');
  return response.data;
};

export const addToBlacklist = async (data) => {
  const response = await api.post('/blacklist', data);
  return response.data;
};

export const removeFromBlacklist = async (id) => {
  const response = await api.delete(`/blacklist/${id}`);
  return response.data;
};

export const checkBlacklist = async (document) => {
  const response = await api.get(`/blacklist/check/${document}`);
  return response.data;
};

// ---------- ROOMS ----------
export const markRoomClean = async (roomId) => {
  const response = await api.patch(`/cashier/rooms/${roomId}/mark-clean`);
  return response.data;
};
export const getLateCheckoutPreview = async (bookingId) => {
    try {
        // Llama al nuevo endpoint que acabas de crear en cashier.js
        const response = await api.get(`/cashier/bookings/${bookingId}/late-checkout-preview`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener preview de late checkout:", error);
        // Devolvemos un objeto seguro en caso de error
        return { late_checkout_charge: 0, new_balance: 0 }; 
    }
};