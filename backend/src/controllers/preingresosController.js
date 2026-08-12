const Preingreso = require('../models/Preingreso');
const Cliente = require('../models/Cliente');
const { notificarPreingresoEnviado, reenviarCorreoPreingreso } = require('../services/preingresoNotifications');

function validarBasico(body) {
  if (!body.cliente_nombre || !body.cliente_nombre.trim()) {
    return 'El nombre de quien entrega es obligatorio.';
  }
  if (!body.cliente_rut || !body.cliente_rut.trim()) {
    return 'El RUT es obligatorio.';
  }
  if (!body.cliente_telefono || !body.cliente_telefono.trim()) {
    return 'El telefono es obligatorio para contactarte sobre tu servicio.';
  }
  if (!body.cliente_email || !body.cliente_email.trim()) {
    return 'El correo electronico es obligatorio para enviarte informacion del servicio.';
  }
  if (!body.falla_reportada || !body.falla_reportada.trim()) {
    return 'Debes indicar por que dejaras el equipo en servicio tecnico.';
  }
  return null;
}

function resolverEmpresaPreingreso(body = {}) {
  const empresa_id = body.empresa_id ? Number(body.empresa_id) : null;
  const empresa_nombre = body.empresa_nombre ? String(body.empresa_nombre).trim() : null;

  if (empresa_id) {
    const empresa = Cliente.buscarPorId(empresa_id);
    if (empresa) {
      return { empresa_id: empresa.id, empresa_nombre: empresa.nombre };
    }
  }

  const porNombre = empresa_nombre ? Cliente.buscarEmpresaPorNombreExacto(empresa_nombre) : null;
  if (porNombre) {
    return { empresa_id: porNombre.id, empresa_nombre: porNombre.nombre };
  }

  return {
    empresa_id: null,
    empresa_nombre
  };
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

      const empresa = resolverEmpresaPreingreso(req.body || {});
      const actualizado = Preingreso.actualizarDesdeCliente(preingreso.id, {
        ...req.body,
        ...empresa
      });
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
