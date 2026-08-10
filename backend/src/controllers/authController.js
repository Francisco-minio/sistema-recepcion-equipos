const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
require('dotenv').config();

const authController = {
  login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena son requeridos.' });
    }

    const usuario = Usuario.buscarPorEmail(email);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const passwordValida = Usuario.verificarPassword(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  },

  perfil(req, res) {
    const usuario = Usuario.buscarPorId(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(usuario);
  },

  cambiarPassword(req, res) {
    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Debes proporcionar la contrasena actual y la nueva.' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres.' });
    }

    const usuario = Usuario.buscarPorEmail(req.usuario.email);
    const valida = Usuario.verificarPassword(passwordActual, usuario.password_hash);
    if (!valida) {
      return res.status(401).json({ error: 'La contrasena actual es incorrecta.' });
    }

    Usuario.cambiarPassword(usuario.id, passwordNueva);
    res.json({ mensaje: 'Contrasena actualizada correctamente.' });
  }
};

module.exports = authController;
