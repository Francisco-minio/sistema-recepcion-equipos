const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
require('dotenv').config();

/**
 * Verifica que la peticion tenga un token JWT valido en el header Authorization.
 * Adjunta los datos del usuario decodificados en req.usuario
 */
function requiereAutenticacion(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No se proporciono un token de autenticacion.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = Usuario.buscarPorId(payload.id);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Tu sesion ya no se encuentra habilitada.' });
    }
    req.usuario = {
      ...payload,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

/**
 * Middleware factory: exige que el usuario autenticado tenga uno de los roles permitidos.
 * Uso: requiereRol('admin', 'recepcion')
 */
function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta accion.' });
    }
    next();
  };
}

module.exports = { requiereAutenticacion, requiereRol };
