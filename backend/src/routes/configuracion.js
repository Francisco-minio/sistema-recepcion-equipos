const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const { requiereAutenticacion, requiereRol } = require('../middleware/auth');

router.use(requiereAutenticacion);
router.use(requiereRol('admin'));

router.get('/notificaciones', configuracionController.obtenerNotificaciones);
router.put('/notificaciones', configuracionController.guardarNotificaciones);

module.exports = router;
