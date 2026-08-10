const Preingreso = require('../models/Preingreso');
const { notificarPreingresoEnviado, reenviarCorreoPreingreso } = require('../services/preingresoNotifications');

function validarBasico(body) {
  if (!body.cliente_nombre || !body.cliente_nombre.trim()) {
    return 'El nombre de quien entrega es obligatorio.';
  }
  if (!body.cliente_rut || !body.cliente_rut.trim()) {
    return 'El RUT es obligatorio.';
  }
  if (!body.falla_reportada || !body.falla_reportada.trim()) {
    return 'Debes indicar por que dejaras el equipo en servicio tecnico.';
  }
  return null;
}

const preingresosController = {
  crear(req, res) {
    const preingreso = Preingreso.crear({ creado_por_usuario_id: req.usuario.id });
    res.status(201).json(preingreso);
  },

  listar(req, res) {
    const { estado, limit, offset } = req.query;
    const preingresos = Preingreso.listar({
      usuario_id: req.usuario.id,
      rol: req.usuario.rol,
      estado,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json(preingresos);
  },

  obtenerPorCodigo(req, res) {
    const preingreso = Preingreso.buscarPorCodigo(req.params.codigo);
    if (!preingreso) return res.status(404).json({ error: 'Codigo de servicio no encontrado.' });
    res.json(preingreso);
  },

  obtenerPublico(req, res) {
    const preingreso = Preingreso.buscarPorToken(req.params.token);
    if (!preingreso) return res.status(404).json({ error: 'Enlace no valido o no disponible.' });
    res.json(preingreso);
  },

  async enviarPublico(req, res, next) {
    try {
      const preingreso = Preingreso.buscarPorToken(req.params.token);
      if (!preingreso) return res.status(404).json({ error: 'Enlace no valido o no disponible.' });
      if (preingreso.estado === 'recepcionado') {
        return res.status(409).json({ error: 'Este codigo ya fue recepcionado en taller.' });
      }

      const error = validarBasico(req.body || {});
      if (error) return res.status(400).json({ error });

      const actualizado = Preingreso.actualizarDesdeCliente(preingreso.id, req.body);
      await notificarPreingresoEnviado(actualizado);
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  async reenviarCorreo(req, res, next) {
    try {
      const preingreso = Preingreso.buscarPorId(req.params.id);
      if (!preingreso) return res.status(404).json({ error: 'Preingreso no encontrado.' });

      const resultado = await reenviarCorreoPreingreso(preingreso);
      res.json({
        ok: resultado.ok,
        estado: resultado.estado,
        detalle: resultado.detalle,
        preingreso: Preingreso.buscarPorId(req.params.id)
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = preingresosController;
