const express = require('express');
const multer = require('multer');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { requiereAutenticacion, requiereRol } = require('../middleware/auth');
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.use(requiereAutenticacion);

router.get('/', clientesController.listar);
router.post('/importar', requiereRol('admin', 'recepcion', 'tecnico'), uploadCsv.single('archivo'), clientesController.importar);
router.post('/:id/correos', requiereRol('admin', 'tecnico'), clientesController.agregarCorreo);
router.get('/:id', clientesController.obtener);
router.post('/', requiereRol('admin', 'recepcion', 'tecnico'), clientesController.crear);
router.put('/:id', requiereRol('admin', 'recepcion', 'tecnico'), clientesController.actualizar);
router.delete('/:id', requiereRol('admin'), clientesController.eliminar);

module.exports = router;
