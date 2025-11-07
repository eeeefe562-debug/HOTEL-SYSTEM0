const express = require('express');
const router = express.Router();

// Placeholder básico: implementa DB queries reales si las tienes
router.get('/', async (req, res) => {
  try {
    res.json([]);
  } catch (err) {
    console.error('blacklist get error', err);
    res.status(500).json({ error: 'Error al obtener lista negra' });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = req.body;
    // TODO: insertar en tabla blacklist
    res.status(201).json({ message: 'Agregado a lista negra (placeholder)', item });
  } catch (err) {
    console.error('blacklist post error', err);
    res.status(500).json({ error: 'Error al agregar' });
  }
});

module.exports = router;
