const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ============================================
// LISTAR LISTA NEGRA
// ============================================
router.get('/', async (req, res) => {
  try {
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const blacklist = await query(`
      SELECT b.*, u.full_name as reported_by_name
      FROM blacklist b
      LEFT JOIN users u ON b.reported_by = u.id
      WHERE b.admin_id = ?
      ORDER BY b.reported_at DESC
    `, [adminId]);

    res.json(blacklist);
  } catch (error) {
    console.error('Error al obtener lista negra:', error);
    res.status(500).json({ error: 'Error al obtener lista negra' });
  }
});

// ============================================
// AGREGAR A LISTA NEGRA
// ============================================
router.post('/', [
  body('full_name').notEmpty().withMessage('Nombre completo requerido'),
  body('document_number').notEmpty().withMessage('Número de documento requerido'),
  body('reason').notEmpty().withMessage('Razón requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, document_number, reason, additional_notes } = req.body;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;
    const reportedBy = req.user.id;

    // Verificar si ya existe
    const existing = await query(
      'SELECT id FROM blacklist WHERE admin_id = ? AND document_number = ?',
      [adminId, document_number]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Esta persona ya está en la lista negra' });
    }

    const result = await query(
      `INSERT INTO blacklist (admin_id, full_name, document_number, reason, additional_notes, reported_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, full_name, document_number, reason, additional_notes || null, reportedBy]
    );

    res.status(201).json({
      message: 'Persona agregada a lista negra exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al agregar a lista negra:', error);
    res.status(500).json({ error: 'Error al agregar a lista negra' });
  }
});

// ============================================
// VERIFICAR SI ESTÁ EN LISTA NEGRA
// ============================================
router.get('/check/:document', async (req, res) => {
  try {
    const { document } = req.params;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const blacklisted = await query(
      `SELECT b.*, u.full_name as reported_by_name
       FROM blacklist b
       LEFT JOIN users u ON b.reported_by = u.id
       WHERE b.admin_id = ? AND b.document_number = ?`,
      [adminId, document]
    );

    if (blacklisted && blacklisted.length > 0) {
      res.json({
        blacklisted: true,
        info: blacklisted[0]
      });
    } else {
      res.json({
        blacklisted: false
      });
    }
  } catch (error) {
    console.error('Error al verificar lista negra:', error);
    res.status(500).json({ error: 'Error al verificar lista negra' });
  }
});

// ============================================
// REMOVER DE LISTA NEGRA
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.admin_id;

    const result = await query(
      'DELETE FROM blacklist WHERE id = ? AND admin_id = ?',
      [id, adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({ message: 'Persona removida de lista negra exitosamente' });
  } catch (error) {
    console.error('Error al remover de lista negra:', error);
    res.status(500).json({ error: 'Error al remover de lista negra' });
  }
});

module.exports = router;