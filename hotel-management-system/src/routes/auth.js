const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Login de administrador
router.post('/admin/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar administrador
    const users = await query(
      'SELECT * FROM users WHERE email = ? AND role = "admin" AND is_active = TRUE',
      [email]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    const user = users[0];
// Justo ANTES de verificar la contraseña, agrega esto:
console.log('🔍 DEBUG LOGIN:');
console.log('Email buscado:', email);
console.log('Usuario encontrado:', user);
console.log('Password ingresado:', password);
console.log('Hash en BD:', user.password);

const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Error en login admin:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Login de cajero (sin ID, solo username + password + admin_id)
router.post('/cashier/login', [
  body('username').notEmpty().withMessage('Usuario requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  body('admin_id').isInt().withMessage('ID de administrador requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, admin_id } = req.body;

    // Buscar cajero
    const users = await query(
      'SELECT * FROM users WHERE username = ? AND role = "cashier" AND admin_id = ?',
      [username, admin_id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    const user = users[0];

    // VALIDAR SI EL CAJERO ESTÁ ACTIVO
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'El cajero está desactivado. Contacte al administrador.' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        admin_id: user.admin_id
      }
    });
  } catch (error) {
    console.error('Error en login cajero:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registro de administrador
router.post('/admin/register', [
  body('username').isLength({ min: 3 }).withMessage('Usuario debe tener al menos 3 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('full_name').notEmpty().withMessage('Nombre completo requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, full_name, phone } = req.body;

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar administrador
    const result = await query(
      `INSERT INTO users (username, email, password, role, full_name, phone, is_active) 
       VALUES (?, ?, ?, 'admin', ?, ?, TRUE)`,
      [username, email, hashedPassword, full_name, phone || null]
    );

    res.status(201).json({
      message: 'Administrador registrado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Usuario o email ya existe' 
      });
    }
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;