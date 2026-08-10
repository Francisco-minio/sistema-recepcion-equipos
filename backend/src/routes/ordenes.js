const express = require('express');
const router = express.Router();
const ordenesController = require('../controllers/ordenesController');
const { requiereAutenticacion, requiereRol } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(requiereAutenticacion);

router.get('/estadisticas', ordenesController.estadisticas);
router.get('/numero/:numero', ordenesController.obtenerPorNumero);

router.get('/', ordenesController.listar);
router.post('/', requiereRol('admin', 'recepcion', 'tecnico'), upload.array('fotos_ingreso', 3), ordenesController.crearIngreso);
router.get('/:id', ordenesController.obtener);
router.delete('/:id', requiereRol('admin'), ordenesController.eliminar);
router.post('/:id/reenviar-correo', requiereRol('admin', 'recepcion', 'tecnico'), ordenesController.reenviarCorreo);

router.patch('/:id/estado', requiereRol('admin', 'recepcion', 'tecnico'), ordenesController.actualizarEstado);
router.patch('/:id/diagnostico', requiereRol('admin', 'tecnico'), ordenesController.actualizarDiagnostico);
router.patch('/:id/presupuesto', requiereRol('admin', 'tecnico'), ordenesController.aprobarPresupuesto);
router.post('/:id/entrega', requiereRol('admin', 'recepcion', 'tecnico'), ordenesController.registrarEntrega);

router.post('/:id/fotos', requiereRol('admin', 'recepcion', 'tecnico'), upload.single('foto'), ordenesController.agregarFoto);
router.patch('/:id/fotos/:fotoId', requiereRol('admin', 'tecnico'), ordenesController.actualizarFoto);
router.delete('/:id/fotos/:fotoId', requiereRol('admin'), ordenesController.eliminarFoto);

router.get('/:id/pdf/ingreso', ordenesController.pdfIngreso);
router.get('/:id/pdf/entrega', ordenesController.pdfEntrega);

module.exports = router;
