const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Aplicar autenticación y verificar rol admin a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================
// DASHBOARD Y KPIS
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const adminId = req.user.id;

    // Ocupación actual
    const occupancy = await query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_rooms,
        COUNT(DISTINCT CASE WHEN r.status = 'occupied' THEN r.id END) as occupied_rooms,
        ROUND((COUNT(DISTINCT CASE WHEN r.status = 'occupied' THEN r.id END) / COUNT(DISTINCT r.id)) * 100, 2) as occupancy_percentage
      FROM rooms r
      WHERE r.admin_id = ? AND r.status != 'maintenance'
    `, [adminId]);

    // Ingresos del día
    const todayRevenue = await query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_transactions,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END), 0) as card_revenue
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE b.admin_id = ? AND DATE(p.payment_date) = CURDATE()
    `, [adminId]);

    // ADR (Average Daily Rate) - Ingreso promedio por habitación
    const adr = await query(`
  SELECT 
    COALESCE(AVG(b.total_amount / NULLIF(b.number_of_nights, 0)), 0) as adr
  FROM bookings b
  WHERE b.admin_id = ? AND DATE(b.check_in) = CURDATE() AND b.status != 'cancelled'
`, [adminId]);
    // RevPAR (Revenue Per Available Room)
    const totalRooms = occupancy[0].total_rooms;
    const todayTotal = todayRevenue[0].total_revenue;
    const revpar = totalRooms > 0 ? (todayTotal / totalRooms) : 0;

    // Reservas activas
    const activeBookings = await query(`
      SELECT COUNT(*) as active_bookings
      FROM bookings
      WHERE admin_id = ? AND status IN ('checked_in', 'reserved')
    `, [adminId]);

    // Pendientes de cobro
    const pendingPayments = await query(`
      SELECT COUNT(*) as pending_count, COALESCE(SUM(balance), 0) as pending_amount
      FROM bookings
      WHERE admin_id = ? AND balance > 0 AND status != 'cancelled'
    `, [adminId]);

    res.json({
  occupancy: occupancy[0],
  revenue: {
    ...todayRevenue[0],
    adr: (adr && adr[0] && adr[0].adr) ? parseFloat(Number(adr[0].adr).toFixed(2)) : 0,
    revpar: parseFloat((revpar || 0).toFixed(2))
  },
  bookings: {
    active: activeBookings[0].active_bookings,
    pending_payments: pendingPayments[0]
  }
});
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// ============================================
// GESTIÓN DE USUARIOS (CAJEROS)
// ============================================

// Listar cajeros
router.get('/users/cashiers', async (req, res) => {
  try {
    const cashiers = await query(`
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active, u.created_at,
             p.can_create_bookings, p.can_apply_discounts, p.max_discount_percentage,
             p.can_process_refunds, p.can_view_reports
      FROM users u
      LEFT JOIN permissions p ON u.id = p.user_id
      WHERE u.admin_id = ? AND u.role = 'cashier'
      ORDER BY u.created_at DESC
    `, [req.user.id]);

    res.json(cashiers);
  } catch (error) {
    console.error('Error al listar cajeros:', error);
    res.status(500).json({ error: 'Error al listar cajeros' });
  }
});

// Crear cajero
router.post('/users/cashiers', [
  body('username').isLength({ min: 3 }).withMessage('Usuario debe tener al menos 3 caracteres'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('full_name').notEmpty().withMessage('Nombre completo requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, full_name, phone, email, permissions } = req.body;
    const adminId = req.user.id;

    await transaction(async (conn) => {
      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear cajero
      const [result] = await conn.execute(
        `INSERT INTO users (admin_id, username, email, password, role, full_name, phone, is_active) 
         VALUES (?, ?, ?, ?, 'cashier', ?, ?, TRUE)`,
        [adminId, username, email || null, hashedPassword, full_name, phone || null]
      );

      const cashierId = result.insertId;

      // Crear permisos (valores por defecto o personalizados)
      const defaultPermissions = {
        can_create_bookings: true,
        can_modify_bookings: false,
        can_cancel_bookings: false,
        can_apply_discounts: false,
        max_discount_percentage: 0,
        can_process_refunds: false,
        can_view_reports: false,
        can_manage_inventory: false,
        ...permissions
      };

      await conn.execute(
        `INSERT INTO permissions (user_id, can_create_bookings, can_modify_bookings, 
         can_cancel_bookings, can_apply_discounts, max_discount_percentage, 
         can_process_refunds, can_view_reports, can_manage_inventory) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cashierId,
          defaultPermissions.can_create_bookings,
          defaultPermissions.can_modify_bookings,
          defaultPermissions.can_cancel_bookings,
          defaultPermissions.can_apply_discounts,
          defaultPermissions.max_discount_percentage,
          defaultPermissions.can_process_refunds,
          defaultPermissions.can_view_reports,
          defaultPermissions.can_manage_inventory
        ]
      );

      return { cashierId };
    });

    res.status(201).json({
      message: 'Cajero creado exitosamente'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Usuario ya existe' });
    }
    console.error('Error al crear cajero:', error);
    res.status(500).json({ error: 'Error al crear cajero' });
  }
});

// Modificar cajero
router.put('/users/cashiers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, password, is_active, permissions } = req.body;

    await transaction(async (conn) => {
      // Verificar que el cajero pertenece al admin
      const [cashier] = await conn.execute(
        'SELECT id FROM users WHERE id = ? AND admin_id = ? AND role = "cashier"',
        [id, req.user.id]
      );

      if (!cashier || cashier.length === 0) {
        throw new Error('Cajero no encontrado');
      }

      // Actualizar datos básicos
      let updateQuery = 'UPDATE users SET full_name = ?, phone = ?, email = ?, is_active = ?';
      let params = [full_name, phone || null, email || null, is_active];

      // Si se proporciona nueva contraseña
      if (password && password.length > 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        updateQuery += ', password = ?';
        params.push(hashedPassword);
      }

      updateQuery += ' WHERE id = ?';
      params.push(id);

      await conn.execute(updateQuery, params);

      // Actualizar permisos si se proporcionan
      if (permissions) {
        await conn.execute(
          `UPDATE permissions SET 
           can_create_bookings = ?, 
           can_modify_bookings = ?, 
           can_cancel_bookings = ?,
           can_apply_discounts = ?, 
           max_discount_percentage = ?, 
           can_process_refunds = ?,
           can_view_reports = ?, 
           can_manage_inventory = ?
           WHERE user_id = ?`,
          [
            permissions.can_create_bookings || false,
            permissions.can_modify_bookings || false,
            permissions.can_cancel_bookings || false,
            permissions.can_apply_discounts || false,
            permissions.max_discount_percentage || 0,
            permissions.can_process_refunds || false,
            permissions.can_view_reports || false,
            permissions.can_manage_inventory || false,
            id
          ]
        );
      }
    });

    res.json({ message: 'Cajero actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar cajero:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar cajero' });
  }
});

// Activar/Desactivar cajero (Toggle)
router.patch('/users/cashiers/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener estado actual
    const users = await query(
      'SELECT is_active FROM users WHERE id = ? AND admin_id = ? AND role = "cashier"',
      [id, req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Cajero no encontrado' });
    }

    const newStatus = !users[0].is_active;

    // Cambiar estado
    const result = await query(
      'UPDATE users SET is_active = ? WHERE id = ? AND admin_id = ? AND role = "cashier"',
      [newStatus, id, req.user.id]
    );

    res.json({ 
      message: newStatus ? 'Cajero activado exitosamente' : 'Cajero desactivado exitosamente',
      is_active: newStatus
    });
  } catch (error) {
    console.error('Error al cambiar estado del cajero:', error);
    res.status(500).json({ error: 'Error al cambiar estado del cajero' });
  }
});

// Eliminar cajero permanentemente
router.delete('/users/cashiers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminar permanentemente sin validaciones
    const result = await query(
      'DELETE FROM users WHERE id = ? AND admin_id = ? AND role = "cashier"',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cajero no encontrado' });
    }

    res.json({ message: 'Cajero eliminado permanentemente' });
  } catch (error) {
    console.error('Error al eliminar cajero:', error);
    res.status(500).json({ error: 'Error al eliminar cajero' });
  }
});

// ============================================
// GESTIÓN DE HABITACIONES
// ============================================

// Listar habitaciones
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await query(`
      SELECT r.*, 
             COUNT(DISTINCT b.id) as total_bookings,
             COALESCE(SUM(CASE WHEN b.status = 'checked_out' THEN b.total_amount ELSE 0 END), 0) as total_revenue
      FROM rooms r
      LEFT JOIN bookings b ON r.id = b.room_id
      WHERE r.admin_id = ?
      GROUP BY r.id
      ORDER BY r.room_number
    `, [req.user.id]);

    res.json(rooms);
  } catch (error) {
    console.error('Error al listar habitaciones:', error);
    res.status(500).json({ error: 'Error al listar habitaciones' });
  }
});

// Crear habitación
router.post('/rooms', [
  body('room_number').notEmpty().withMessage('Número de habitación requerido'),
  body('room_type').isIn(['simple', 'doble', 'suite', 'ejecutiva']).withMessage('Tipo de habitación inválido'),
  body('base_price').isFloat({ min: 0 }).withMessage('Precio base inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      room_number, room_type, base_price, short_stay_3h_price,
      short_stay_6h_price, floor, max_occupancy, description, amenities
    } = req.body;

    // ✅ SANEAMIENTO: Convierte '' o undefined a NULL, manteniendo 0 y otros valores.
    const sanitizeNullableField = (value) => (value === '' || value === undefined) ? null : value;
    
    const cleaned_3h_price = sanitizeNullableField(short_stay_3h_price);
    const cleaned_6h_price = sanitizeNullableField(short_stay_6h_price);
    const cleaned_floor = sanitizeNullableField(floor);
    const cleaned_description = sanitizeNullableField(description);
    const cleaned_amenities = amenities ? JSON.stringify(amenities) : null;
    // ---------------------------------------------------------------------

    const result = await query(
      `INSERT INTO rooms (admin_id, room_number, room_type, base_price, 
       short_stay_3h_price, short_stay_6h_price, floor, max_occupancy, description, amenities)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, room_number, room_type, base_price,
        cleaned_3h_price, cleaned_6h_price, // Usamos los valores saneados
        cleaned_floor, max_occupancy || 2, cleaned_description,
        cleaned_amenities
      ]
    );

    res.status(201).json({
      message: 'Habitación creada exitosamente',
      roomId: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Número de habitación ya existe' });
    }
    console.error('Error al crear habitación:', error);
    res.status(500).json({ error: 'Error al crear habitación' });
  }
});

// Modificar habitación
router.put('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      room_number, room_type, base_price, short_stay_3h_price,
      short_stay_6h_price, status, floor, max_occupancy, description, amenities
    } = req.body;

    // ------------------------------------------------------------------
    // ✅ SANEAMIENTO: SOLUCIÓN AL ERROR DE UNDEFINED EN BIND PARAMETERS
    const sanitizeNullableField = (value) => (value === '' || value === undefined) ? null : value;
    
    // Saneamiento de campos opcionales
    const cleaned_3h_price = sanitizeNullableField(short_stay_3h_price);
    const cleaned_6h_price = sanitizeNullableField(short_stay_6h_price);
    const cleaned_floor = sanitizeNullableField(floor);
    const cleaned_description = sanitizeNullableField(description);
    const cleaned_amenities = amenities ? JSON.stringify(amenities) : null;
    
    // Solución directa para 'status': si es undefined o vacío, usa 'available' 
    // o el estado actual de la habitación (depende de la lógica del negocio).
    // Aquí asumimos 'available' como fallback seguro si no se envía.
    const cleaned_status = status || 'available'; 
    // ------------------------------------------------------------------

    const result = await query(
      `UPDATE rooms SET room_number = ?, room_type = ?, base_price = ?,
       short_stay_3h_price = ?, short_stay_6h_price = ?, status = ?,
       floor = ?, max_occupancy = ?, description = ?, amenities = ?
       WHERE id = ? AND admin_id = ?`,
      [
        room_number, room_type, base_price,
        cleaned_3h_price, cleaned_6h_price, cleaned_status, // Usamos los valores saneados
        cleaned_floor, max_occupancy || 2, cleaned_description,
        cleaned_amenities, 
        id, req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    res.json({ message: 'Habitación actualizada exitosamente' });
  } catch (error) {
    console.error('Error al modificar habitación:', error);
    res.status(500).json({ error: 'Error al modificar habitación' });
  }
});
// Cambiar estado de habitación (Disponible <-> Mantenimiento)
router.patch('/rooms/:id/toggle-maintenance', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener estado actual
    const rooms = await query(
      'SELECT status FROM rooms WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const currentStatus = rooms[0].status;

    // No se puede cambiar estado si está ocupada o reservada
    if (currentStatus === 'occupied' || currentStatus === 'reserved') {
      return res.status(400).json({ 
        error: 'No se puede cambiar el estado de una habitación ocupada o reservada' 
      });
    }

    // Toggle entre available y maintenance
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';

    const result = await query(
      'UPDATE rooms SET status = ? WHERE id = ? AND admin_id = ?',
      [newStatus, id, req.user.id]
    );

    res.json({ 
      message: newStatus === 'maintenance' 
        ? 'Habitación puesta en mantenimiento' 
        : 'Habitación disponible nuevamente',
      status: newStatus
    });
  } catch (error) {
    console.error('Error al cambiar estado de habitación:', error);
    res.status(500).json({ error: 'Error al cambiar estado de habitación' });
  }
});

// Eliminar habitación permanentemente
router.delete('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminar permanentemente sin validaciones
    const result = await query(
      'DELETE FROM rooms WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    res.json({ message: 'Habitación eliminada permanentemente' });
  } catch (error) {
    console.error('Error al eliminar habitación:', error);
    res.status(500).json({ error: 'Error al eliminar habitación' });
  }
});

// ============================================
// GESTIÓN DE TARIFAS DINÁMICAS
// ============================================

// Listar reglas de precios
router.get('/pricing-rules', async (req, res) => {
  try {
    const rules = await query(`
      SELECT pr.*, r.room_number
      FROM pricing_rules pr
      LEFT JOIN rooms r ON pr.room_id = r.id
      WHERE pr.admin_id = ?
      ORDER BY pr.priority DESC, pr.created_at DESC
    `, [req.user.id]);

    res.json(rules);
  } catch (error) {
    console.error('Error al listar tarifas:', error);
    res.status(500).json({ error: 'Error al listar tarifas' });
  }
});

// Crear regla de precio (temporada, día de semana, etc)
router.post('/pricing-rules', [
  body('rule_type').isIn(['season', 'weekday', 'early_checkin', 'late_checkout', 'promotion'])
    .withMessage('Tipo de regla inválido'),
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('price_modifier_type').isIn(['fixed', 'percentage']).withMessage('Tipo de modificador inválido'),
  body('price_modifier_value').isFloat().withMessage('Valor de modificador inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      room_id, rule_type, name, start_date, end_date, days_of_week,
      time_from, time_to, price_modifier_type, price_modifier_value, priority
    } = req.body;

    const result = await query(
      `INSERT INTO pricing_rules (admin_id, room_id, rule_type, name, 
       start_date, end_date, days_of_week, time_from, time_to,
       price_modifier_type, price_modifier_value, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, room_id || null, rule_type, name,
        start_date || null, end_date || null,
        days_of_week ? JSON.stringify(days_of_week) : null,
        time_from || null, time_to || null,
        price_modifier_type, price_modifier_value, priority || 0
      ]
    );

    res.status(201).json({
      message: 'Regla de precio creada exitosamente',
      ruleId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear regla de precio:', error);
    res.status(500).json({ error: 'Error al crear regla de precio' });
  }
});

// Modificar regla de precio
router.put('/pricing-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, start_date, end_date, days_of_week, time_from, time_to,
      price_modifier_type, price_modifier_value, priority, is_active
    } = req.body;

    const result = await query(
      `UPDATE pricing_rules SET name = ?, start_date = ?, end_date = ?,
       days_of_week = ?, time_from = ?, time_to = ?, price_modifier_type = ?,
       price_modifier_value = ?, priority = ?, is_active = ?
       WHERE id = ? AND admin_id = ?`,
      [
        name, start_date || null, end_date || null,
        days_of_week ? JSON.stringify(days_of_week) : null,
        time_from || null, time_to || null,
        price_modifier_type, price_modifier_value, priority || 0, is_active,
        id, req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Regla de precio no encontrada' });
    }

    res.json({ message: 'Regla de precio actualizada exitosamente' });
  } catch (error) {
    console.error('Error al modificar regla:', error);
    res.status(500).json({ error: 'Error al modificar regla' });
  }
});

// Eliminar regla de precio
router.delete('/pricing-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM pricing_rules WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }

    res.json({ message: 'Regla eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar regla:', error);
    res.status(500).json({ error: 'Error al eliminar regla' });
  }
});

// ============================================
// GESTIÓN DE PRODUCTOS/SERVICIOS (POS)
// ============================================

// Listar productos
router.get('/products', async (req, res) => {
  try {
    const { category, is_active } = req.query;
    
    let sql = 'SELECT * FROM products WHERE admin_id = ?';
    const params = [req.user.id];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(is_active === 'true');
    }

    sql += ' ORDER BY category, name';

    const products = await query(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

// Crear producto
router.post('/products', [
  body('category').isIn(['minibar', 'restaurant', 'laundry', 'spa', 'other'])
    .withMessage('Categoría inválida'),
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('price').isFloat({ min: 0 }).withMessage('Precio inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      category, name, description, price, cost, tax_rate,
      stock_quantity, track_inventory
    } = req.body;

    const result = await query(
      `INSERT INTO products (admin_id, category, name, description, price, 
       cost, tax_rate, stock_quantity, track_inventory)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, category, name, description || null, price,
        cost || 0, tax_rate || 0, stock_quantity || 0, track_inventory || false
      ]
    );

    res.status(201).json({
      message: 'Producto creado exitosamente',
      productId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Modificar producto
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category, name, description, price, cost, tax_rate,
      stock_quantity, track_inventory, is_active
    } = req.body;

    const result = await query(
      `UPDATE products SET category = ?, name = ?, description = ?,
       price = ?, cost = ?, tax_rate = ?, stock_quantity = ?,
       track_inventory = ?, is_active = ?
       WHERE id = ? AND admin_id = ?`,
      [
        category, name, description || null, price, cost || 0, tax_rate || 0,
        stock_quantity || 0, track_inventory || false, is_active,
        id, req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error al modificar producto:', error);
    res.status(500).json({ error: 'Error al modificar producto' });
  }
});

// Activar/Desactivar producto (Toggle)
router.patch('/products/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener estado actual
    const products = await query(
      'SELECT is_active FROM products WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (!products || products.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const newStatus = !products[0].is_active;

    // Cambiar estado
    const result = await query(
      'UPDATE products SET is_active = ? WHERE id = ? AND admin_id = ?',
      [newStatus, id, req.user.id]
    );

    res.json({ 
      message: newStatus ? 'Producto activado exitosamente' : 'Producto desactivado exitosamente',
      is_active: newStatus
    });
  } catch (error) {
    console.error('Error al cambiar estado del producto:', error);
    res.status(500).json({ error: 'Error al cambiar estado del producto' });
  }
});

// Eliminar producto permanentemente
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminar permanentemente sin validaciones
    const result = await query(
      'DELETE FROM products WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado permanentemente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ============================================
// CONFIGURACIONES DEL HOTEL
// ============================================

// Obtener configuraciones
router.get('/hotel-settings', async (req, res) => {
  try {
    const settings = await query(
      'SELECT * FROM hotel_settings WHERE admin_id = ?',
      [req.user.id]
    );

    if (!settings || settings.length === 0) {
      // Crear configuraciones por defecto
      await query(
        'INSERT INTO hotel_settings (admin_id) VALUES (?)',
        [req.user.id]
      );
      
      const newSettings = await query(
        'SELECT * FROM hotel_settings WHERE admin_id = ?',
        [req.user.id]
      );
      return res.json(newSettings[0]);
    }

    res.json(settings[0]);
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
});

// Actualizar configuraciones
router.put('/hotel-settings', async (req, res) => {
  try {
    const {
      standard_checkout_time,
      grace_period_minutes,
      late_checkout_charge_per_hour,
      late_checkout_enabled,
      standard_checkin_time,
      early_checkin_charge_percent,
      early_checkin_enabled,
      weekend_rate_enabled,
      weekend_rate_percent
    } = req.body;

    const result = await query(
      `UPDATE hotel_settings SET 
       standard_checkout_time = ?,
       grace_period_minutes = ?,
       late_checkout_charge_per_hour = ?,
       late_checkout_enabled = ?,
       standard_checkin_time = ?,
       early_checkin_charge_percent = ?,
       early_checkin_enabled = ?,
       weekend_rate_enabled = ?,
       weekend_rate_percent = ?
       WHERE admin_id = ?`,
      [
        standard_checkout_time,
        grace_period_minutes,
        late_checkout_charge_per_hour,
        late_checkout_enabled,
        standard_checkin_time,
        early_checkin_charge_percent,
        early_checkin_enabled,
        weekend_rate_enabled,
        weekend_rate_percent,
        req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Configuraciones no encontradas' });
    }

    res.json({ message: 'Configuraciones actualizadas exitosamente' });
  } catch (error) {
    console.error('Error al actualizar configuraciones:', error);
    res.status(500).json({ error: 'Error al actualizar configuraciones' });
  }
});

// ============================================
// GESTIÓN DE DESCUENTOS PREDEFINIDOS
// ============================================

// Listar descuentos
router.get('/discount-presets', async (req, res) => {
  try {
    const discounts = await query(
      `SELECT * FROM discount_presets 
       WHERE admin_id = ? 
       ORDER BY display_order, name`,
      [req.user.id]
    );

    res.json(discounts);
  } catch (error) {
    console.error('Error al listar descuentos:', error);
    res.status(500).json({ error: 'Error al listar descuentos' });
  }
});

// Crear descuento
router.post('/discount-presets', [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('discount_value').isFloat({ min: 0 }).withMessage('Valor inválido'),
  body('reason').notEmpty().withMessage('Razón requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, discount_type, discount_value, reason,
      requires_authorization, display_order
    } = req.body;

    const result = await query(
      `INSERT INTO discount_presets 
       (admin_id, name, discount_type, discount_value, reason, 
        requires_authorization, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, name, discount_type || 'percentage', discount_value,
        reason, requires_authorization || false, display_order || 0
      ]
    );

    res.status(201).json({
      message: 'Descuento creado exitosamente',
      discountId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear descuento:', error);
    res.status(500).json({ error: 'Error al crear descuento' });
  }
});

// Actualizar descuento
router.put('/discount-presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, discount_type, discount_value, reason,
      requires_authorization, is_active, display_order
    } = req.body;

    const result = await query(
      `UPDATE discount_presets SET 
       name = ?, discount_type = ?, discount_value = ?, reason = ?,
       requires_authorization = ?, is_active = ?, display_order = ?
       WHERE id = ? AND admin_id = ?`,
      [
        name, discount_type, discount_value, reason,
        requires_authorization, is_active, display_order,
        id, req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Descuento no encontrado' });
    }

    res.json({ message: 'Descuento actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar descuento:', error);
    res.status(500).json({ error: 'Error al actualizar descuento' });
  }
});

// Toggle estado de descuento
router.patch('/discount-presets/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const discounts = await query(
      'SELECT is_active FROM discount_presets WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (!discounts || discounts.length === 0) {
      return res.status(404).json({ error: 'Descuento no encontrado' });
    }

    const newStatus = !discounts[0].is_active;

    await query(
      'UPDATE discount_presets SET is_active = ? WHERE id = ? AND admin_id = ?',
      [newStatus, id, req.user.id]
    );

    res.json({
      message: newStatus ? 'Descuento activado' : 'Descuento desactivado',
      is_active: newStatus
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// Eliminar descuento
router.delete('/discount-presets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM discount_presets WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Descuento no encontrado' });
    }

    res.json({ message: 'Descuento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar descuento:', error);
    res.status(500).json({ error: 'Error al eliminar descuento' });
  }
});

// ============================================
// GESTIÓN DE CATEGORÍAS DE PRODUCTOS
// ============================================

router.get('/product-categories', async (req, res) => {
  try {
    const categories = await query(`
      SELECT pc.*, 
             COUNT(p.id) as products_count
      FROM product_categories pc
      LEFT JOIN products p ON pc.id = p.category_id AND p.is_active = TRUE
      WHERE pc.admin_id = ?
      GROUP BY pc.id
      ORDER BY pc.display_order, pc.name
    `, [req.user.id]);

    res.json(categories);
  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
});

router.post('/product-categories', [
  body('name').notEmpty().withMessage('Nombre requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, icon, color, display_order } = req.body;

    const result = await query(
      `INSERT INTO product_categories (admin_id, name, description, icon, color, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, description || null, icon || 'package', color || 'gray', display_order || 0]
    );

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      categoryId: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una categoría con este nombre' });
    }
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

router.put('/product-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, display_order, is_active } = req.body;

    const result = await query(
      `UPDATE product_categories 
       SET name = ?, description = ?, icon = ?, color = ?, display_order = ?, is_active = ?
       WHERE id = ? AND admin_id = ?`,
      [name, description || null, icon || 'package', color || 'gray', 
       display_order || 0, is_active, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría actualizada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una categoría con este nombre' });
    }
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

router.delete('/product-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const products = await query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene productos asociados.' 
      });
    }

    const result = await query(
      'DELETE FROM product_categories WHERE id = ? AND admin_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});
// Obtener productos para POS
router.get('/products', async (req, res) => {
  try {
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
    const products = await query(
      'SELECT * FROM products WHERE admin_id = ? AND is_active = TRUE ORDER BY category, name',
      [adminId]
    );
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar productos' });
  }
});
module.exports = router;