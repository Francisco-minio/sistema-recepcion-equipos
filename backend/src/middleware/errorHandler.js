/**
 * Middleware de manejo centralizado de errores.
 * Debe registrarse al final de la cadena de middlewares en server.js
 */
function manejadorErrores(err, req, res, next) {
  console.error('[ERROR]', err);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'El registro ya existe (violacion de restriccion unica).' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El archivo o datos enviados son demasiado grandes.' });
  }

  const status = err.status || 500;
  const mensaje = err.message || 'Error interno del servidor.';
  res.status(status).json({ error: mensaje });
}

module.exports = manejadorErrores;
