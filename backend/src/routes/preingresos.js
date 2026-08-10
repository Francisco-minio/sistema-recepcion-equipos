const express = require('express');
const router = express.Router();
const preingresosController = require('../controllers/preingresosController');
const { requiereAutenticacion, requiereRol } = require('../middleware/auth');

router.get('/public/:token', preingresosController.obtenerPublico);
router.post('/public/:token', preingresosController.enviarPublico);

router.use(requiereAutenticacion);

router.get('/', requiereRol('admin', 'recepcion', 'tecnico'), preingresosController.listar);
router.post('/', requiereRol('admin', 'recepcion', 'tecnico'), preingresosController.crear);
router.get('/codigo/:codigo', requiereRol('admin', 'recepcion', 'tecnico'), preingresosController.obtenerPorCodigo);
router.post('/:id/reenviar-correo', requiereRol('admin', 'recepcion', 'tecnico'), preingresosController.reenviarCorreo);

module.exports = router;
