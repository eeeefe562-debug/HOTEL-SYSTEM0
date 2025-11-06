const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generateCSV, generatePDF } = require('../services/exportService');

// Aplicar autenticación
router.use(authenticateToken);

// ============================================
// REPORTE DE INGRESOS
// ============================================

router.get('/revenue', async (req, res) => {
  try {
    const {
      start_date, end_date, payment_method, cashier_id, format
    } = req.query;

    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    let sql = `
      SELECT 
        p.id, p.payment_date, p.amount, p.payment_method,
        p.transaction_reference, p.card_last_digits,
        b.booking_code, r.room_number, c.full_name as customer_name,
        u.full_name as cashier_name,
        b.total_amount, b.amount_paid,
        DATE(p.payment_date) as payment_day
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON p.cashier_id = u.id
      WHERE b.admin_id = ?
    `;
    const params = [adminId];

    // Filtros
    if (start_date) {
      sql += ' AND DATE(p.payment_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(p.payment_date) <= ?';
      params.push(end_date);
    }

    if (payment_method) {
      sql += ' AND p.payment_method = ?';
      params.push(payment_method);
    }

    if (cashier_id) {
      sql += ' AND p.cashier_id = ?';
      params.push(cashier_id);
    }

    sql += ' ORDER BY p.payment_date DESC';

    const payments = await query(sql, params);

    // Calcular resumen
    const summary = {
      total_payments: payments.length,
      total_amount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      by_method: {}
    };

    // Agrupar por método de pago
    payments.forEach(p => {
      if (!summary.by_method[p.payment_method]) {
        summary.by_method[p.payment_method] = {
          count: 0,
          amount: 0
        };
      }
      summary.by_method[p.payment_method].count++;
      summary.by_method[p.payment_method].amount += parseFloat(p.amount);
    });

    // Exportar según formato solicitado
    if (format === 'csv') {
      const csv = generateCSV(payments, [
        'payment_date', 'booking_code', 'customer_name', 'room_number',
        'amount', 'payment_method', 'cashier_name', 'transaction_reference'
      ]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_ingresos_${Date.now()}.csv`);
      return res.send(csv);
    }

    if (format === 'pdf') {
      const pdf = await generatePDF('revenue', {
        payments,
        summary,
        filters: { start_date, end_date, payment_method, cashier_id }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_ingresos_${Date.now()}.pdf`);
      return res.send(pdf);
    }

    res.json({
      summary,
      payments
    });
  } catch (error) {
    console.error('Error en reporte de ingresos:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// ============================================
// REPORTE DE DESCUENTOS Y ANULACIONES
// ============================================

router.get('/discounts', requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, cashier_id } = req.query;
    const adminId = req.user.id;

    let sql = `
      SELECT 
        d.*, b.booking_code, r.room_number,
        c.full_name as customer_name,
        u.full_name as cashier_name,
        u2.full_name as authorized_by_name,
        d.created_at as discount_date
      FROM discounts d
      JOIN bookings b ON d.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON d.cashier_id = u.id
      LEFT JOIN users u2 ON d.authorized_by = u2.id
      WHERE b.admin_id = ?
    `;
    const params = [adminId];

    if (start_date) {
      sql += ' AND DATE(d.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(d.created_at) <= ?';
      params.push(end_date);
    }

    if (cashier_id) {
      sql += ' AND d.cashier_id = ?';
      params.push(cashier_id);
    }

    sql += ' ORDER BY d.created_at DESC';

    const discounts = await query(sql, params);

    // Obtener devoluciones
    let refundSql = `
      SELECT 
        r.*, b.booking_code, c.full_name as customer_name,
        u.full_name as cashier_name,
        u2.full_name as authorized_by_name
      FROM refunds r
      JOIN bookings b ON r.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON r.cashier_id = u.id
      LEFT JOIN users u2 ON r.authorized_by = u2.id
      WHERE b.admin_id = ?
    `;
    const refundParams = [adminId];

    if (start_date) {
      refundSql += ' AND DATE(r.created_at) >= ?';
      refundParams.push(start_date);
    }

    if (end_date) {
      refundSql += ' AND DATE(r.created_at) <= ?';
      refundParams.push(end_date);
    }

    refundSql += ' ORDER BY r.created_at DESC';

    const refunds = await query(refundSql, refundParams);

    const summary = {
      total_discounts: discounts.length,
      total_discount_amount: discounts.reduce((sum, d) => sum + parseFloat(d.discount_amount), 0),
      total_refunds: refunds.length,
      total_refund_amount: refunds.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    };

    res.json({
      summary,
      discounts,
      refunds
    });
  } catch (error) {
    console.error('Error en reporte de descuentos:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// ============================================
// AUDITORÍA DE CAJA
// ============================================

router.get('/cash-registers', requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, cashier_id, status } = req.query;
    const adminId = req.user.id;

    let sql = `
      SELECT 
        cr.*, u.full_name as cashier_name,
        u2.full_name as approved_by_name
      FROM cash_registers cr
      JOIN users u ON cr.cashier_id = u.id
      LEFT JOIN users u2 ON cr.approved_by = u2.id
      WHERE u.admin_id = ?
    `;
    const params = [adminId];

    if (start_date) {
      sql += ' AND DATE(cr.opening_time) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(cr.opening_time) <= ?';
      params.push(end_date);
    }

    if (cashier_id) {
      sql += ' AND cr.cashier_id = ?';
      params.push(cashier_id);
    }

    if (status) {
      sql += ' AND cr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY cr.opening_time DESC';

    const registers = await query(sql, params);

    res.json(registers);
  } catch (error) {
    console.error('Error en reporte de cajas:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// Aprobar/Rechazar cierre de caja
router.put('/cash-registers/:id/review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    const adminId = req.user.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Acción inválida' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    const result = await query(
      `UPDATE cash_registers cr
       JOIN users u ON cr.cashier_id = u.id
       SET cr.status = ?, cr.approved_by = ?, cr.approved_at = NOW(),
           cr.notes = CONCAT(COALESCE(cr.notes, ''), '\n', 'Revisión admin: ', ?)
       WHERE cr.id = ? AND u.admin_id = ?`,
      [status, adminId, notes || '', id, adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    res.json({
      message: `Caja ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`
    });
  } catch (error) {
    console.error('Error al revisar caja:', error);
    res.status(500).json({ error: 'Error al revisar caja' });
  }
});

// ============================================
// FACTURAS PENDIENTES
// ============================================

router.get('/pending-invoices', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;

    const pending = await query(`
      SELECT 
        b.id, b.booking_code, b.check_in, b.expected_checkout,
        b.total_amount, b.amount_paid, 
        (b.total_amount - b.amount_paid) as balance,
        c.full_name, c.phone, c.whatsapp,
        r.room_number, b.status,
        DATEDIFF(NOW(), b.check_in) as days_pending
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.admin_id = ? 
        AND (b.total_amount - b.amount_paid) > 0
        AND b.status != 'cancelled'
      ORDER BY days_pending DESC, balance DESC
    `, [adminId]);

    const summary = {
      total_pending: pending.length,
      total_amount: pending.reduce((sum, p) => sum + parseFloat(p.balance), 0)
    };

    res.json({
      summary,
      pending
    });
  } catch (error) {
    console.error('Error en facturas pendientes:', error);
    res.status(500).json({ error: 'Error al obtener facturas pendientes' });
  }
});

// Marcar factura como pagada manualmente
router.put('/pending-invoices/:id/mark-paid', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const adminId = req.user.id;

    await query(
      `UPDATE bookings SET amount_paid = amount_paid + ?, 
       notes = CONCAT(COALESCE(notes, ''), '\n', 'Pago manual: ', ?)
       WHERE id = ? AND admin_id = ?`,
      [amount, notes || '', id, adminId]
    );

    res.json({ message: 'Pago registrado exitosamente' });
  } catch (error) {
    console.error('Error al marcar como pagado:', error);
    res.status(500).json({ error: 'Error al marcar como pagado' });
  }
});

// ============================================
// CLIENTES FRECUENTES
// ============================================

router.get('/frequent-customers', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;

    const customers = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT b.id) as bookings_count,
        MAX(b.check_out) as last_visit,
        AVG(b.total_amount) as avg_spending
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'checked_out'
      WHERE c.admin_id = ? AND c.is_frequent = TRUE
      GROUP BY c.id
      ORDER BY c.total_spent DESC
      LIMIT 100
    `, [adminId]);

    res.json(customers);
  } catch (error) {
    console.error('Error en clientes frecuentes:', error);
    res.status(500).json({ error: 'Error al obtener clientes frecuentes' });
  }
});

// Marcar cliente con mal comportamiento
router.put('/customers/:id/flag-behavior', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bad_behavior_flag, behavior_notes } = req.body;
    const adminId = req.user.id;

    await query(
      `UPDATE customers SET bad_behavior_flag = ?, behavior_notes = ?
       WHERE id = ? AND admin_id = ?`,
      [bad_behavior_flag, behavior_notes, id, adminId]
    );

    res.json({ message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// ============================================
// AUDITORÍA DEL SISTEMA
// ============================================

router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, user_id, action_type } = req.query;
    const adminId = req.user.id;

    let sql = `
      SELECT 
        al.*, u.full_name as user_name, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE (u.admin_id = ? OR u.id = ?)
    `;
    const params = [adminId, adminId];

    if (start_date) {
      sql += ' AND DATE(al.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(al.created_at) <= ?';
      params.push(end_date);
    }

    if (user_id) {
      sql += ' AND al.user_id = ?';
      params.push(user_id);
    }

    if (action_type) {
      sql += ' AND al.action_type = ?';
      params.push(action_type);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT 500';

    const logs = await query(sql, params);

    res.json(logs);
  } catch (error) {
    console.error('Error en logs de auditoría:', error);
    res.status(500).json({ error: 'Error al obtener logs' });
  }
});

module.exports = router;