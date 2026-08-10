const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { requiereAutenticacion, requiereRol } = require('../middleware/auth');

router.use(requiereAutenticacion);

// Cualquier usuario autenticado puede ver la lista de tecnicos (para asignar ordenes)
router.get('/tecnicos', usuariosController.listarTecnicos);
router.get('/tecnicos/detalle', requiereRol('admin'), usuariosController.listarTecnicosDetalle);

// Solo administradores gestionan usuarios
router.get('/', requiereRol('admin'), usuariosController.listar);
router.post('/', requiereRol('admin'), usuariosController.crear);
router.put('/:id', requiereRol('admin'), usuariosController.actualizar);
router.post('/:id/reset-password', requiereRol('admin'), usuariosController.resetPassword);

module.exports = router;
