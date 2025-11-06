const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { authenticateToken, requireCashier, checkPermission } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { sendWhatsApp } = require('../services/whatsappService');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);
router.use(requireCashier);

// ============================================
// APERTURA Y CIERRE DE CAJA
// ============================================

// Abrir caja
router.post('/cash-register/open', [
  body('initial_cash').isFloat({ min: 0 }).withMessage('Monto inicial inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { initial_cash } = req.body;
    const cashierId = req.user.id;

    // Verificar que no haya una caja abierta
    const openRegister = await query(
      'SELECT id FROM cash_registers WHERE cashier_id = ? AND status = "open"',
      [cashierId]
    );

    if (openRegister && openRegister.length > 0) {
      return res.status(400).json({ 
        error: 'Ya tiene una caja abierta' 
      });
    }

    const result = await query(
      `INSERT INTO cash_registers (cashier_id, opening_time, initial_cash, status)
       VALUES (?, NOW(), ?, 'open')`,
      [cashierId, initial_cash]
    );

    res.status(201).json({
      message: 'Caja abierta exitosamente',
      registerId: result.insertId,
      opening_time: new Date(),
      initial_cash
    });
  } catch (error) {
    console.error('Error al abrir caja:', error);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// Obtener resumen de caja actual
router.get('/cash-register/current', async (req, res) => {
  try {
    const cashierId = req.user.id;

    const register = await query(`
  SELECT cr.*,
         COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as total_cash_payments,
         COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END), 0) as total_card_payments,
         COALESCE(SUM(CASE WHEN p.payment_method = 'transfer' THEN p.amount ELSE 0 END), 0) as total_transfer_payments,
         COALESCE(SUM(CASE WHEN p.payment_method = 'check' THEN p.amount ELSE 0 END), 0) as total_check_payments,
         COUNT(DISTINCT p.booking_id) as total_transactions
  FROM cash_registers cr
  LEFT JOIN payments p ON p.cashier_id = cr.cashier_id 
    AND p.payment_date >= cr.opening_time 
    AND (cr.closing_time IS NULL OR p.payment_date <= cr.closing_time)
  WHERE cr.cashier_id = ? AND cr.status = 'open'
  GROUP BY cr.id
`, [cashierId]);

    if (!register || register.length === 0) {
  return res.status(404).json({ 
    error: 'No hay caja abierta' 
  });
}

const currentRegister = register[0];
const expectedCash = parseFloat(currentRegister.initial_cash || 0) + 
                    parseFloat(currentRegister.total_cash_payments || 0);
const totalCollected = parseFloat(currentRegister.total_cash_payments || 0) +
                      parseFloat(currentRegister.total_card_payments || 0) +
                      parseFloat(currentRegister.total_transfer_payments || 0) +
                      parseFloat(currentRegister.total_check_payments || 0);

res.json({
  ...currentRegister,
  expected_cash: parseFloat(expectedCash.toFixed(2)),
  total_collected: parseFloat(totalCollected.toFixed(2)),
  total_transactions: parseInt(currentRegister.total_transactions || 0)
});
  } catch (error) {
    console.error('Error al obtener caja actual:', error);
    res.status(500).json({ error: 'Error al obtener caja actual' });
  }
});

// Cerrar caja
router.post('/cash-register/close', [
  body('actual_cash').isFloat({ min: 0 }).withMessage('Monto real inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { actual_cash, notes } = req.body;
    const cashierId = req.user.id;

    await transaction(async (conn) => {
      // Obtener caja abierta
      const [register] = await conn.execute(
        'SELECT * FROM cash_registers WHERE cashier_id = ? AND status = "open"',
        [cashierId]
      );

      if (!register || register.length === 0) {
        throw new Error('No hay caja abierta');
      }

      const registerId = register[0].id;

      // Calcular totales por método de pago
      const [payments] = await conn.execute(`
        SELECT 
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as total_cash,
          COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) as total_card,
          COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END), 0) as total_transfer,
          COALESCE(SUM(CASE WHEN payment_method = 'check' THEN amount ELSE 0 END), 0) as total_check
        FROM payments
        WHERE cashier_id = ? AND payment_date >= ?
      `, [cashierId, register[0].opening_time]);

      const totals = payments[0];
      const expectedCash = parseFloat(register[0].initial_cash) + parseFloat(totals.total_cash);

      // Actualizar caja
      await conn.execute(
        `UPDATE cash_registers SET 
         closing_time = NOW(),
         actual_cash = ?,
         expected_cash = ?,
         total_cash_payments = ?,
         total_card_payments = ?,
         total_transfer_payments = ?,
         total_check_payments = ?,
         status = 'pending_approval',
         notes = ?
         WHERE id = ?`,
        [
          actual_cash, expectedCash,
          totals.total_cash, totals.total_card,
          totals.total_transfer, totals.total_check,
          notes || null, registerId
        ]
      );

      return {
        registerId,
        expected_cash: expectedCash,
        actual_cash,
        difference: actual_cash - expectedCash,
        totals
      };
    });

    res.json({
      message: 'Caja cerrada exitosamente. Pendiente de aprobación',
      status: 'pending_approval'
    });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({ error: error.message || 'Error al cerrar caja' });
  }
});

// ============================================
// GESTIÓN DE CLIENTES
// ============================================

// Buscar cliente
router.get('/customers/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 3) {
      return res.status(400).json({ 
        error: 'Ingrese al menos 3 caracteres para buscar' 
      });
    }

    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const customers = await query(`
      SELECT c.*, 
             COUNT(DISTINCT b.id) as total_bookings,
             MAX(b.check_out) as last_visit
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'checked_out'
      WHERE c.admin_id = ? AND (
        c.full_name LIKE ? OR 
        c.document_number LIKE ? OR 
        c.phone LIKE ? OR
        c.email LIKE ?
      )
      GROUP BY c.id
      ORDER BY c.total_spent DESC
      LIMIT 20
    `, [adminId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

    res.json(customers);
  } catch (error) {
    console.error('Error al buscar cliente:', error);
    res.status(500).json({ error: 'Error al buscar cliente' });
  }
});

// Crear cliente
router.post('/customers', [
  body('full_name').notEmpty().withMessage('Nombre completo requerido'),
  body('phone').optional().matches(/^\+591\d{8}$/).withMessage('Teléfono debe ser formato boliviano +591XXXXXXXX')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
  full_name, document_type, document_number, phone, whatsapp,
  email, address, city, country, age, nationality, origin
} = req.body;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await query(
  `INSERT INTO customers (admin_id, full_name, document_type, document_number,
   phone, whatsapp, email, address, city, country, age, nationality, origin)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    adminId, full_name, document_type || 'CI', document_number || null,
    phone || null, whatsapp || phone || null, email || null,
    address || null, city || null, country || 'Bolivia',
    age || null, nationality || 'Bolivia', origin || null
  ]
);

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      customerId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// ============================================
// REGISTRO DE HOSPEDAJES (CHECK-IN)
// ============================================

// Obtener habitaciones disponibles
router.get('/rooms/available', async (req, res) => {
  try {
    const { check_in, check_out, room_type } = req.query;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    let sql = `
      SELECT r.* 
      FROM rooms r
      WHERE r.admin_id = ? AND r.status = 'available'
    `;
    const params = [adminId];

    if (room_type) {
      sql += ' AND r.room_type = ?';
      params.push(room_type);
    }

    // Si se proporcionan fechas, excluir habitaciones con reservas en ese periodo
    if (check_in && check_out) {
      sql += ` AND r.id NOT IN (
        SELECT room_id FROM bookings
        WHERE status IN ('reserved', 'checked_in')
        AND ((check_in <= ? AND expected_checkout >= ?) OR
             (check_in >= ? AND check_in < ?))
      )`;
      params.push(check_out, check_in, check_in, check_out);
    }

    sql += ' ORDER BY r.room_number';

    const rooms = await query(sql, params);
    res.json(rooms);
  } catch (error) {
    console.error('Error al obtener habitaciones disponibles:', error);
    res.status(500).json({ error: 'Error al obtener habitaciones disponibles' });
  }
});

// Crear hospedaje (Check-in)
router.post('/bookings', [
  checkPermission('can_create_bookings'),
  body('customer_id').isInt().withMessage('Cliente inválido'),
  body('room_id').isInt().withMessage('Habitación inválida'),
  body('stay_type').isIn(['daily', '3_hours', '6_hours']).withMessage('Tipo de estadía inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
  customer_id, room_id, check_in, expected_checkout, stay_type,
  number_of_nights, number_of_guests, notes,
  guest_age, guest_nationality, guest_origin, additional_income
} = req.body;

    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await transaction(async (conn) => {
      // Verificar disponibilidad de habitación
      const [room] = await conn.execute(
        'SELECT * FROM rooms WHERE id = ? AND admin_id = ? AND status = "available"',
        [room_id, adminId]
      );

      if (!room || room.length === 0) {
        throw new Error('Habitación no disponible');
      }

      // Calcular precio
      let basePrice = parseFloat(room[0].base_price);
      let nights = number_of_nights || 1;

      if (stay_type === '3_hours') {
        basePrice = parseFloat(room[0].short_stay_3h_price);
        nights = 1;
      } else if (stay_type === '6_hours') {
        basePrice = parseFloat(room[0].short_stay_6h_price);
        nights = 1;
      }

      const totalAmount = (basePrice * nights) + parseFloat(additional_income || 0);

      // Generar código de reserva
      const bookingCode = `BK${Date.now()}`;

      // Crear reserva CON NUEVOS CAMPOS
      const [booking] = await conn.execute(
  `INSERT INTO bookings (booking_code, admin_id, cashier_id, customer_id, room_id,
   check_in, expected_checkout, stay_type, number_of_nights, number_of_guests,
   base_price, total_amount, status, notes, guest_age, guest_nationality, 
   guest_origin, additional_income)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'checked_in', ?, ?, ?, ?, ?)`,
  [
    bookingCode, adminId, cashierId, customer_id, room_id,
    check_in || new Date(), expected_checkout, stay_type, nights,
    number_of_guests || 1, basePrice, totalAmount, notes || null,
    guest_age || null, guest_nationality || null, 
    guest_origin || null, additional_income || 0
  ]
);

      // Actualizar estado de habitación
      await conn.execute(
        'UPDATE rooms SET status = "occupied" WHERE id = ?',
        [room_id]
      );

      return {
        bookingId: booking.insertId,
        bookingCode,
        totalAmount
      };
    });

    res.status(201).json({
      message: 'Check-in registrado exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error al crear hospedaje:', error);
    res.status(500).json({ error: error.message || 'Error al crear hospedaje' });
  }
});

// ============================================
// BÚSQUEDA DE RESERVAS
// ============================================

// Buscar reservas
// En backend/src/routes/cashier.js

router.get('/bookings/search', async (req, res) => {
    try {
        const { room_number, document_number, status } = req.query;
        let sql = `
            SELECT 
                b.*, r.room_number, r.base_price, r.room_type, r.max_occupancy,
                (b.total_amount - b.amount_paid) as current_balance
            FROM 
                bookings b
            JOIN 
                rooms r ON b.room_id = r.id
            WHERE 1=1
        `; // <-- 1=1 asegura que siempre haya un WHERE y facilita agregar ANDs

        const params = [];

        if (room_number) {
            sql += ' AND r.room_number = ?';
            params.push(room_number);
        }

        if (document_number) {
            sql += ' AND b.document_number = ?';
            params.push(document_number);
        }

        // ✅ CORRECCIÓN CLAVE: Aplicar el filtro status directamente
        if (status) { 
            sql += ' AND b.status = ?';
            params.push(status); // 'checked_in'
        }
        
        // Opcional: ordenar para mejor UX
        sql += ' ORDER BY b.check_in DESC';

        const bookings = await query(sql, params);
        
        return res.json({ data: bookings });
    } catch (error) {
        console.error('Error al buscar reservas:', error);
        return res.status(500).json({ message: 'Error interno del servidor al buscar reservas' });
    }
});

// Obtener detalle de reserva
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
      const hourlyRate = parseFloat(bookingData.late_checkout_hourly_rate || 0);
      lateCheckoutCharge = hoursLate * hourlyRate;
    const bookings = await query(`
      SELECT b.*, c.*, r.room_number, r.room_type,
             r.short_stay_6h_price as late_checkout_hourly_rate,
             u.full_name as cashier_name,
             (b.total_amount - b.amount_paid) as balance
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON b.cashier_id = u.id
      WHERE b.id = ? AND b.admin_id = ?
    `, [id, adminId]);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookings[0];

    // Obtener cargos adicionales
    const charges = await query(`
      SELECT bc.*, p.name as product_name
      FROM booking_charges bc
      LEFT JOIN products p ON bc.product_id = p.id
      WHERE bc.booking_id = ?
      ORDER BY bc.created_at DESC
    `, [id]);

    // Obtener pagos
    const payments = await query(`
      SELECT p.*, u.full_name as cashier_name
      FROM payments p
      JOIN users u ON p.cashier_id = u.id
      WHERE p.booking_id = ?
      ORDER BY p.payment_date DESC
    `, [id]);

    // Obtener descuentos
    const discounts = await query(`
      SELECT d.*, u.full_name as cashier_name, 
             u2.full_name as authorized_by_name
      FROM discounts d
      JOIN users u ON d.cashier_id = u.id
      LEFT JOIN users u2 ON d.authorized_by = u2.id
      WHERE d.booking_id = ?
      ORDER BY d.created_at DESC
    `, [id]);

    res.json({
      booking,
      charges,
      payments,
      discounts
    });
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({ error: 'Error al obtener reserva' });
  }
});

// ============================================
// REGISTRO DE CARGOS ADICIONALES (POS)
// ============================================

// Añadir cargo adicional
router.post('/bookings/:id/charges', [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { items } = req.body;
    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await transaction(async (conn) => {
      // Verificar que la reserva existe y está activa
      const [booking] = await conn.execute(
        'SELECT * FROM bookings WHERE id = ? AND admin_id = ? AND status IN ("checked_in", "reserved")',
        [id, adminId]
      );

      if (!booking || booking.length === 0) {
        throw new Error('Reserva no encontrada o no está activa');
      }

      let totalCharges = 0;
      const chargeIds = [];

      // Insertar cada cargo
      for (const item of items) {
        const { product_id, description, quantity, unit_price } = item;

        // Si es producto, obtener info y actualizar inventario
        let tax = 0;
        if (product_id) {
          const [product] = await conn.execute(
            'SELECT * FROM products WHERE id = ? AND admin_id = ?',
            [product_id, adminId]
          );

          if (product && product.length > 0) {
            tax = parseFloat(product[0].tax_rate) * parseFloat(unit_price) * quantity / 100;

            // Actualizar inventario si aplica
            if (product[0].track_inventory) {
              await conn.execute(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [quantity, product_id]
              );
            }
          }
        }

        const totalAmount = (parseFloat(unit_price) * quantity) + tax;
        totalCharges += totalAmount;

        const [charge] = await conn.execute(
          `INSERT INTO booking_charges (booking_id, product_id, cashier_id, 
           charge_type, description, quantity, unit_price, tax_amount, total_amount)
           VALUES (?, ?, ?, 'product', ?, ?, ?, ?, ?)`,
          [id, product_id || null, cashierId, description, quantity, unit_price, tax, totalAmount]
        );

        chargeIds.push(charge.insertId);
      }

      // Actualizar total de la reserva
      await conn.execute(
        'UPDATE bookings SET additional_charges = additional_charges + ?, total_amount = total_amount + ? WHERE id = ?',
        [totalCharges, totalCharges, id]
      );

      // Obtener datos del cliente para WhatsApp
      const [customer] = await conn.execute(`
        SELECT c.whatsapp, c.full_name, b.booking_code, b.total_amount
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        WHERE b.id = ?
      `, [id]);

      return {
        chargeIds,
        totalCharges,
        customer: customer[0]
      };
    });

    // Enviar WhatsApp si el cliente tiene número
    if (result.customer.whatsapp) {
      await sendWhatsApp({
        phone: result.customer.whatsapp,
        booking_id: id,
        type: 'charge_added',
        data: {
          name: result.customer.full_name,
          booking_code: result.customer.booking_code,
          charge_amount: result.totalCharges,
          total_amount: result.customer.total_amount
        }
      });
    }

    res.status(201).json({
      message: 'Cargos añadidos exitosamente',
      total_charges: result.totalCharges
    });
  } catch (error) {
    console.error('Error al añadir cargos:', error);
    res.status(500).json({ error: error.message || 'Error al añadir cargos' });
  }
});
// ============================================
// OBTENER PRODUCTOS PARA POS
// ============================================

router.get('/products', async (req, res) => {
  try {
    const { is_active, category } = req.query;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    let sql = 'SELECT * FROM products WHERE admin_id = ?';
    const params = [adminId];

    if (is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(is_active === 'true');
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, name';

    const products = await query(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});
// ============================================
// REGISTRO DE PAGOS
// ============================================

// Registrar pago
router.post('/payments', [
  body('booking_id').isInt().withMessage('ID de reserva inválido'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  body('payment_method').isIn(['cash', 'card', 'transfer', 'check', 'other'])
    .withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      booking_id, amount, payment_method, payment_splits,
      card_last_digits, transaction_reference, notes
    } = req.body;

    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await transaction(async (conn) => {
      // Verificar reserva
      const [booking] = await conn.execute(
        'SELECT * FROM bookings WHERE id = ? AND admin_id = ?',
        [booking_id, adminId]
      );

      if (!booking || booking.length === 0) {
        throw new Error('Reserva no encontrada');
      }

      const balance = parseFloat(booking[0].total_amount) - parseFloat(booking[0].amount_paid);

      if (parseFloat(amount) > balance) {
        throw new Error('El monto excede el saldo pendiente');
      }

      // Registrar pago principal
      const [payment] = await conn.execute(
        `INSERT INTO payments (booking_id, cashier_id, amount, payment_method,
         card_last_digits, transaction_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          booking_id, cashierId, amount, payment_method,
          card_last_digits || null, transaction_reference || null, notes || null
        ]
      );

      const paymentId = payment.insertId;

      // Si es pago mixto, registrar splits
      if (payment_splits && payment_splits.length > 0) {
        for (const split of payment_splits) {
          await conn.execute(
            `INSERT INTO payment_splits (payment_id, payment_method, amount,
             card_last_digits, transaction_reference)
             VALUES (?, ?, ?, ?, ?)`,
            [
              paymentId, split.payment_method, split.amount,
              split.card_last_digits || null, split.transaction_reference || null
            ]
          );
        }
      }

      // Actualizar monto pagado en la reserva
      await conn.execute(
        'UPDATE bookings SET amount_paid = amount_paid + ? WHERE id = ?',
        [amount, booking_id]
      );

      // Obtener datos del cliente para WhatsApp
      const [customer] = await conn.execute(`
        SELECT c.whatsapp, c.full_name, b.booking_code, 
               b.amount_paid, b.total_amount, r.room_number
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.id = ?
      `, [booking_id]);

      return {
        paymentId,
        customer: customer[0],
        new_balance: balance - parseFloat(amount)
      };
    });

    // Enviar WhatsApp
    if (result.customer.whatsapp) {
      await sendWhatsApp({
        phone: result.customer.whatsapp,
        booking_id,
        payment_id: result.paymentId,
        type: 'payment_confirmation',
        data: {
          name: result.customer.full_name,
          booking_code: result.customer.booking_code,
          room_number: result.customer.room_number,
          amount_paid: amount,
          total_paid: result.customer.amount_paid,
          total_amount: result.customer.total_amount,
          balance: result.new_balance
        }
      });
    }

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      paymentId: result.paymentId,
      new_balance: result.new_balance.toFixed(2)
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: error.message || 'Error al registrar pago' });
  }
});

// ============================================
// CHECK-OUT
// ============================================

// Realizar check-out
// ============================================
// CHECKOUT CON WHATSAPP OBLIGATORIO
// ============================================
// BUSCAR esta función en tu archivo backend/routes/cashier.js
// Y REEMPLAZARLA COMPLETA

router.post('/bookings/:id/checkout', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method = 'Completado' } = req.body;
    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await transaction(async (conn) => {
      // Obtener datos completos de la reserva CON PRECIO DE LATE CHECKOUT
      const [booking] = await conn.execute(`
        SELECT b.*, 
               c.full_name, c.document_number, c.phone, c.whatsapp, 
               c.age, c.nationality, c.origin,
               r.room_number, r.room_type,
               r.short_stay_6h_price as late_checkout_hourly_rate
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.id = ? AND b.admin_id = ? AND b.status = 'checked_in'
      `, [id, adminId]);

      if (!booking || booking.length === 0) {
        throw new Error('Reserva no encontrada o ya procesada');
      }

      const bookingData = booking[0];

      // ✅ CALCULAR LATE CHECKOUT SI APLICA
      let lateCheckoutCharge = 0;
      const now = new Date();
      const expectedCheckout = new Date(bookingData.expected_checkout);

      if (now > expectedCheckout) {
        const hoursLate = Math.ceil((now - expectedCheckout) / (1000 * 60 * 60));
        const hourlyRate = parseFloat(bookingData.late_checkout_hourly_rate || 0);
        
        if (hourlyRate > 0) {
          lateCheckoutCharge = hoursLate * hourlyRate;
          
          // Actualizar el total de la reserva con el cargo de late checkout
          await conn.execute(
            `UPDATE bookings 
             SET late_checkout_charge = ?, 
                 total_amount = total_amount + ? 
             WHERE id = ?`,
            [lateCheckoutCharge, lateCheckoutCharge, id]
          );
        }
      }

      // Verificar saldo (con late checkout incluido si aplica)
      const totalAmount = parseFloat(bookingData.total_amount) + lateCheckoutCharge;
      const amountPaid = parseFloat(bookingData.amount_paid);
      const balance = totalAmount - amountPaid;

      if (balance > 0.01) {
        throw new Error(`Saldo pendiente: Bs. ${balance.toFixed(2)}. Complete el pago antes del checkout.`);
      }

      // Obtener cargos extras si los hay
      const [charges] = await conn.execute(`
        SELECT description, quantity, unit_price, total_amount
        FROM booking_charges
        WHERE booking_id = ?
      `, [id]);

      let chargesDetail = '';
      if (charges && charges.length > 0) {
        chargesDetail = charges.map(c => 
          `  - ${c.description} (x${c.quantity}): Bs. ${parseFloat(c.total_amount).toFixed(2)}`
        ).join('\n');
      }

      // Completar checkout
      await conn.execute(
        'UPDATE bookings SET status = "checked_out", check_out = NOW() WHERE id = ?',
        [id]
      );

      // Liberar habitación
      await conn.execute(
       'UPDATE rooms SET status = "cleaning" WHERE id = ?',
        [bookingData.room_id]
      );

      // Actualizar estadísticas del cliente
      await conn.execute(`
        UPDATE customers SET 
          total_stays = total_stays + 1,
          total_spent = total_spent + ?,
          last_stay_date = CURDATE(),
          is_frequent = (total_stays + 1 >= 3)
        WHERE id = ?
      `, [totalAmount, bookingData.customer_id]);

      return {
        bookingData,
        chargesDetail,
        totalAmount,
        lateCheckoutCharge,
        paymentMethod: payment_method
      };
    });

    // WhatsApp al administrador
    console.log('📱 Enviando notificación de checkout al administrador...');
    
    const { sendAdminNotification } = require('../services/whatsapp');
    
    const whatsappSent = await sendAdminNotification({
      booking_id: id,
      customer_name: result.bookingData.full_name,
      document_number: result.bookingData.document_number,
      room_number: result.bookingData.room_number,
      total_amount: result.totalAmount,
      payment_method: result.paymentMethod,
      age: result.bookingData.age,
      nationality: result.bookingData.nationality,
      origin: result.bookingData.origin,
      check_in: result.bookingData.check_in,
      check_out: new Date(),
      charges_detail: result.chargesDetail
    });

    if (whatsappSent) {
      console.log('✅ WhatsApp enviado exitosamente al administrador');
    } else {
      console.warn('⚠️ No se pudo enviar WhatsApp al administrador');
    }

    res.json({
      message: 'Check-out completado exitosamente',
      booking_id: id,
      late_checkout_charge: result.lateCheckoutCharge,
      whatsapp_sent: whatsappSent
    });

  } catch (error) {
    console.error('❌ Error en checkout:', error);
    res.status(500).json({ error: error.message || 'Error al procesar checkout' });
  }
});

// Calcular cargo de late checkout (preview antes de checkout)
router.get('/bookings/:id/late-checkout-preview', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    // Obtener reserva CON PRECIO DE LATE CHECKOUT DE LA HABITACIÓN
    const bookings = await query(`
      SELECT b.*, r.short_stay_6h_price as late_checkout_hourly_rate
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ? AND b.admin_id = ?
    `, [id, adminId]);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookings[0];

    let lateCheckoutCharge = 0;
    let hoursLate = 0;
    let isLate = false;

    const now = new Date();
    const expectedCheckout = new Date(booking.expected_checkout);

    if (now > expectedCheckout) {
      isLate = true;
      hoursLate = Math.ceil((now - expectedCheckout) / (1000 * 60 * 60));
      const hourlyRate = parseFloat(booking.late_checkout_hourly_rate || 0);
      
      if (hourlyRate > 0) {
        lateCheckoutCharge = hoursLate * hourlyRate;
      }
    }

    res.json({
      is_late: isLate,
      hours_late: hoursLate,
      late_checkout_charge: lateCheckoutCharge,
      hourly_rate: parseFloat(booking.late_checkout_hourly_rate || 0),
      new_total: parseFloat(booking.total_amount) + lateCheckoutCharge
    });
  } catch (error) {
    console.error('Error al calcular late checkout:', error);
    res.status(500).json({ error: 'Error al calcular late checkout' });
  }
});

// ============================================
// DESCUENTOS
// ============================================

// ============================================
// APLICAR DESCUENTO
// ============================================

router.post('/bookings/:id/discount', [
  body('discount_preset_id').optional().isInt(),
  body('discount_type').isIn(['percentage', 'fixed']).withMessage('Tipo de descuento inválido'),
  body('discount_value').isFloat({ min: 0 }).withMessage('Valor de descuento inválido'),
  body('reason').notEmpty().withMessage('Razón requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { discount_preset_id, discount_type, discount_value, reason } = req.body;
    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await transaction(async (conn) => {
      // Obtener reserva
      const [booking] = await conn.execute(
        'SELECT * FROM bookings WHERE id = ? AND admin_id = ? AND status = "checked_in"',
        [id, adminId]
      );

      if (!booking || booking.length === 0) {
        throw new Error('Reserva no encontrada');
      }

      const bookingData = booking[0];
      const currentTotal = parseFloat(bookingData.total_amount);

      // Calcular monto del descuento
      let discountAmount = 0;
      if (discount_type === 'percentage') {
        discountAmount = (currentTotal * parseFloat(discount_value)) / 100;
      } else {
        discountAmount = parseFloat(discount_value);
      }

      // Validar que el descuento no sea mayor al total
      if (discountAmount > currentTotal) {
        throw new Error('El descuento no puede ser mayor al total');
      }

      // Registrar descuento en tabla discounts
      const [discount] = await conn.execute(
        `INSERT INTO discounts 
         (booking_id, cashier_id, discount_type, discount_value, 
          discount_amount, reason, authorized_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id, cashierId, discount_type, discount_value, 
          discountAmount, reason, 
          discount_preset_id ? adminId : null
        ]
      );

      // Actualizar total de la reserva
      const newTotal = currentTotal - discountAmount;
      await conn.execute(
        `UPDATE bookings 
         SET discounts = discounts + ?, total_amount = ?
         WHERE id = ?`,
        [discountAmount, newTotal, id]
      );

      return {
        discountId: discount.insertId,
        discountAmount,
        newTotal
      };
    });

    res.json({
      message: 'Descuento aplicado exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error al aplicar descuento:', error);
    res.status(500).json({ error: error.message || 'Error al aplicar descuento' });
  }
});

// ============================================
// DEVOLUCIONES (REFUNDS)
// ============================================

// Solicitar devolución
router.post('/refunds', [
  checkPermission('can_process_refunds'),
  body('booking_id').isInt().withMessage('ID de reserva inválido'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  body('reason').notEmpty().withMessage('Razón requerida'),
  body('admin_password').notEmpty().withMessage('Contraseña de administrador requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { booking_id, payment_id, amount, reason, notes, admin_password } = req.body;
    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    await transaction(async (conn) => {
      // Verificar contraseña de administrador
      const bcrypt = require('bcryptjs');
      const [admin] = await conn.execute(
        'SELECT id, password FROM users WHERE id = ? AND role = "admin"',
        [adminId]
      );

      if (!admin || admin.length === 0) {
        throw new Error('Administrador no encontrado');
      }

      const isValid = await bcrypt.compare(admin_password, admin[0].password);
      if (!isValid) {
        throw new Error('Contraseña de administrador incorrecta');
      }

      // Verificar que no exceda el monto pagado
      const [booking] = await conn.execute(
        'SELECT amount_paid FROM bookings WHERE id = ? AND admin_id = ?',
        [booking_id, adminId]
      );

      if (!booking || booking.length === 0) {
        throw new Error('Reserva no encontrada');
      }

      if (parseFloat(amount) > parseFloat(booking[0].amount_paid)) {
        throw new Error('El monto excede lo pagado');
      }

      // Crear devolución
      const [refund] = await conn.execute(
        `INSERT INTO refunds (booking_id, payment_id, cashier_id, authorized_by,
         amount, reason, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [booking_id, payment_id || null, cashierId, admin[0].id, 
         amount, reason, notes || null]
      );

      // Actualizar monto pagado
      await conn.execute(
        'UPDATE bookings SET amount_paid = amount_paid - ? WHERE id = ?',
        [amount, booking_id]
      );

      return refund.insertId;
    });

    res.status(201).json({
      message: 'Devolución procesada exitosamente'
    });
  } catch (error) {
    console.error('Error al procesar devolución:', error);
    res.status(500).json({ error: error.message || 'Error al procesar devolución' });
  }
});
// ============================================
// VER TODAS LAS HABITACIONES (PARA CAJERO)
// ============================================

router.get('/rooms/all', async (req, res) => {
  try {
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const rooms = await query(`
      SELECT r.*
      FROM rooms r
      WHERE r.admin_id = ?
      ORDER BY r.room_number
    `, [adminId]);

    res.json(rooms);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener habitaciones' });
  }
});

// ============================================
// REGISTRAR HUÉSPED COMPLETO
// ============================================

router.post('/guests/register', async (req, res) => {
  try {
    const {
      full_name, document_number, phone, age, nationality, origin,
      room_id, check_in, expected_checkout, stay_type, number_of_hours,
      base_price, additional_income
    } = req.body;

    const cashierId = req.user.id;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await transaction(async (conn) => {
      // ✅ 1. VERIFICAR LISTA NEGRA DENTRO DEL TRANSACTION
      const [blacklisted] = await conn.execute(
        'SELECT * FROM blacklist WHERE admin_id = ? AND document_number = ?',
        [adminId, document_number]
      );

      if (blacklisted && blacklisted.length > 0) {
        throw new Error(
          `⛔ CLIENTE EN LISTA NEGRA - Razón: ${blacklisted[0].reason}`
        );
      }

      // ✅ 2. Crear cliente
      const [customer] = await conn.execute(
        `INSERT INTO customers (admin_id, full_name, document_number, phone, age, nationality, origin)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [adminId, full_name, document_number, phone || null, age, nationality, origin]
      );

      const customerId = customer.insertId;

      // ✅ 3. Verificar que la habitación esté disponible
      const [room] = await conn.execute(
        'SELECT * FROM rooms WHERE id = ? AND admin_id = ? AND status = "available"',
        [room_id, adminId]
      );

      if (!room || room.length === 0) {
        throw new Error('Habitación no disponible');
      }

      // ✅ 4. Determinar stay_type correcto según lo que envíe el frontend
      let finalStayType = 'daily';
      let numberOfNights = 1;
      
      if (stay_type === 'hourly') {
        // Si es por horas, determinar si es 3h o 6h
        if (number_of_hours <= 3) {
          finalStayType = '3_hours';
        } else {
          finalStayType = '6_hours';
        }
        numberOfNights = 1;
      } else {
        finalStayType = 'daily';
        numberOfNights = 1;
      }

      // ✅ 5. Calcular total
      const roomPrice = parseFloat(base_price);
      const extras = parseFloat(additional_income) || 0;
      const totalAmount = roomPrice + extras;

      // ✅ 6. Generar código de reserva
      const bookingCode = `BK${Date.now()}`;

      // ✅ 7. Crear reserva CON stay_type CORRECTO
      const [booking] = await conn.execute(
        `INSERT INTO bookings (
          booking_code, admin_id, cashier_id, customer_id, room_id,
          check_in, expected_checkout, stay_type, number_of_nights, number_of_guests,
          guest_age, guest_nationality, guest_origin,
          base_price, additional_income, total_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingCode, adminId, cashierId, customerId, room_id,
          check_in, expected_checkout, finalStayType, numberOfNights, 1,
          age, nationality, origin,
          roomPrice, extras, totalAmount, 'checked_in'
        ]
      );

      // ✅ 8. Actualizar estado de habitación
      await conn.execute(
        'UPDATE rooms SET status = "occupied" WHERE id = ?',
        [room_id]
      );

      return {
        bookingId: booking.insertId,
        bookingCode,
        customerId
      };
    });

    res.status(201).json({
      message: 'Huésped registrado exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error al registrar huésped:', error);
    res.status(500).json({ error: error.message || 'Error al registrar huésped' });
  }
});

// Obtener reservas activas
router.get('/bookings/active', async (req, res) => {
  try {
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const bookings = await query(`
      SELECT 
        b.*, 
        c.full_name as customer_name, 
        c.phone, 
        c.document_number,
        r.room_number, 
        r.room_type,
        r.short_stay_6h_price as late_checkout_hourly_rate
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.admin_id = ? AND b.status IN ('checked_in', 'reserved')
      ORDER BY b.check_in DESC
    `, [adminId]);

    // Calcular late checkout para cada reserva
    const now = new Date();
    const bookingsWithLateCheckout = bookings.map(booking => {
      let lateCheckoutCharge = 0;
      let hoursLate = 0;
      let isLate = false;

      const expectedCheckout = new Date(booking.expected_checkout);
      if (now > expectedCheckout) {
        isLate = true;
        hoursLate = Math.ceil((now - expectedCheckout) / (1000 * 60 * 60));
        const hourlyRate = parseFloat(booking.late_checkout_hourly_rate || 0);
        
        if (hourlyRate > 0) {
          lateCheckoutCharge = hoursLate * hourlyRate;
        }
      }

      // Calcular nuevo balance incluyendo late checkout
      const totalAmount = parseFloat(booking.total_amount);
      const amountPaid = parseFloat(booking.amount_paid);
      const currentBalance = totalAmount + lateCheckoutCharge - amountPaid;

      return {
        ...booking,
        late_checkout_charge: lateCheckoutCharge,
        late_checkout_hours: hoursLate,
        is_late: isLate,
        current_balance: currentBalance,
        balance: currentBalance 
      };
    });

    res.json(bookingsWithLateCheckout);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener reservas activas' });
  }
});

// Listar todas las habitaciones
router.get('/rooms/all', async (req, res) => {
  try {
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
    
    const rooms = await query(
      'SELECT * FROM rooms WHERE admin_id = ? ORDER BY room_number',
      [adminId]
    );
    
    res.json(rooms);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al listar habitaciones' });
  }
});

// ✅ Marcar habitación como limpia
router.patch('/rooms/:id/mark-clean', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
    
    await query(
      'UPDATE rooms SET status = "available" WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );
    
    res.json({ success: true, message: 'Habitación disponible' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar habitación' });
  }
});

router.get('/bookings/:id/late-checkout-preview', async (req, res) => {
    const bookingId = req.params.id;

    try {
        // 1. Obtener los detalles actuales de la reserva desde la BD
        const booking = await getBookingDetails(bookingId); 

        if (!booking) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        // 2. Calcular el cargo dinámico (usando la hora actual)
        const lateCheckoutCharge = calculateLateCheckoutCharge(booking);

        // 3. Calcular el balance TOTAL Correcto: 
        const totalAmount = parseFloat(booking.total_amount || 0);
        const amountPaid = parseFloat(booking.amount_paid || 0);

        const newBalance = totalAmount + lateCheckoutCharge - amountPaid;

        // 4. Enviar el resultado al frontend
        res.json({
            late_checkout_charge: lateCheckoutCharge,
            new_balance: newBalance,
            current_time: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error en endpoint de preview:", error);
        res.status(500).json({ error: 'Error interno del servidor al calcular preview' });
    }
});

module.exports = router;