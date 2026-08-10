const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requiereAutenticacion } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/perfil', requiereAutenticacion, authController.perfil);
router.post('/cambiar-password', requiereAutenticacion, authController.cambiarPassword);

module.exports = router;
