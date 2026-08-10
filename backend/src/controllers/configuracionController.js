const Configuracion = require('../models/Configuracion');

function validar(body) {
  const puerto = String(body.smtp_port || '').trim();
  if (puerto && Number.isNaN(Number(puerto))) {
    return 'El puerto SMTP debe ser numerico.';
  }
  return null;
}

const configuracionController = {
  obtenerNotificaciones(req, res) {
    res.json(Configuracion.obtenerConfiguracionNotificaciones());
  },

  guardarNotificaciones(req, res) {
    const error = validar(req.body || {});
    if (error) return res.status(400).json({ error });

    const configuracion = Configuracion.guardarConfiguracionNotificaciones(req.body || {});
    res.json(configuracion);
  }
};

module.exports = configuracionController;
