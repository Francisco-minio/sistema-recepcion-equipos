const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { requiereAutenticacion, requiereRol } = require('../middleware/auth');

router.use(requiereAutenticacion);

router.get('/', clientesController.listar);
router.get('/:id', clientesController.obtener);
router.post('/', requiereRol('admin', 'recepcion', 'tecnico'), clientesController.crear);
router.put('/:id', requiereRol('admin', 'recepcion', 'tecnico'), clientesController.actualizar);
router.delete('/:id', requiereRol('admin'), clientesController.eliminar);

module.exports = router;
