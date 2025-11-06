const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar rutas
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const cashierRoutes = require('./routes/cashier');
const reportRoutes = require('./routes/reports');
const blacklistRoutes = require('./routes/blacklist'); // ✅ NUEVO

// Importar middleware
const errorHandler = require('./middleware/errorHandler');

// Crear aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blacklist', blacklistRoutes); // ✅ NUEVO

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🏨 Sistema de Gestión Hotelera - API v1.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      cashier: '/api/cashier',
      reports: '/api/reports',
      blacklist: '/api/blacklist' // ✅ NUEVO
    }
  });
});

// Manejo de errores
app.use(errorHandler);

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🏨 Sistema de Gestión Hotelera iniciado correctamente`);
});