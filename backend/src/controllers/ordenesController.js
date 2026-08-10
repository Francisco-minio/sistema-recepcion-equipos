const Orden = require('../models/Orden');
const Cliente = require('../models/Cliente');
const Preingreso = require('../models/Preingreso');
const Usuario = require('../models/Usuario');
const { notificarIngresoCreado, reenviarCorreoOrden } = require('../services/preingresoNotifications');
const { generarComprobanteIngreso, generarComprobanteEntrega } = require('../utils/pdfGenerator');
const { cifrarTexto } = require('../utils/secretField');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const carpetaUploads = path.join(__dirname, '..', '..', 'uploads');

function guardarFotoBase64({ dataUrl, nombreOriginal }) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) {
    const err = new Error('Formato de imagen invalido.');
    err.status = 400;
    throw err;
  }

  const mimeType = match[1].toLowerCase();
  const extensiones = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif'
  };
  const extension = extensiones[mimeType];
  if (!extension) {
    const err = new Error('Tipo de imagen no soportado.');
    err.status = 400;
    throw err;
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) {
    const err = new Error('La imagen excede el limite de 8 MB.');
    err.status = 413;
    throw err;
  }

  if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads, { recursive: true });
  }

  const filename = `${uuidv4()}${extension}`;
  fs.writeFileSync(path.join(carpetaUploads, filename), buffer);
  return {
    ruta_archivo: filename,
    nombre_original: nombreOriginal || filename
  };
}

function comentarioAsignacionTecnico(tecnico) {
  return tecnico
    ? `Tecnico asignado: ${tecnico.nombre}`
    : 'Tecnico desasignado';
}

function comentarioTipoFoto(tipo) {
  const etiquetas = {
    ingreso: 'Ingreso',
    diagnostico: 'Diagnostico',
    entrega: 'Entrega'
  };
  return etiquetas[tipo] || tipo || 'Ingreso';
}

const ordenesController = {
  /**
   * Crea una nueva orden de ingreso.
   * Crea o reutiliza el cliente segun su RUT.
   */
  async crearIngreso(req, res, next) {
    try {
      const body = typeof req.body.payload === 'string'
        ? JSON.parse(req.body.payload)
        : req.body;

      const {
        cliente, // { nombre, rut, telefono, email, direccion }
        tipo_equipo, marca, modelo, numero_serie, color,
        falla_reportada, accesorios, estado_fisico, clave_acceso, observaciones_ingreso,
        tecnico_asignado_id,
        preingreso_id,
        firma_ingreso_nombre, firma_ingreso_rut, firma_ingreso_data,
        fotos_ingreso
      } = body;

      if (!cliente || !cliente.nombre || !cliente.rut) {
        return res.status(400).json({ error: 'Los datos del cliente (nombre y RUT) son obligatorios.' });
      }
      if (!tipo_equipo) {
        return res.status(400).json({ error: 'El tipo de equipo es obligatorio.' });
      }
      if (!falla_reportada) {
        return res.status(400).json({ error: 'La falla reportada es obligatoria.' });
      }
      if (!firma_ingreso_data || !firma_ingreso_nombre || !firma_ingreso_rut) {
        return res.status(400).json({ error: 'La firma de conformidad del cliente es obligatoria.' });
      }

      let preingreso = null;
      if (preingreso_id) {
        preingreso = Preingreso.buscarPorId(preingreso_id);
        if (!preingreso) {
          return res.status(404).json({ error: 'Preingreso no encontrado.' });
        }
        if (preingreso.estado === 'recepcionado') {
          return res.status(409).json({ error: 'Este codigo de servicio ya fue recepcionado.' });
        }
      }

      const clienteRegistrado = Cliente.obtenerOCrear(cliente);
      const claveCifrada = clave_acceso ? cifrarTexto(clave_acceso) : null;
      const esParticular = (cliente?.tipo_cliente || 'empresa') === 'particular';

      const orden = Orden.crear({
        cliente_id: clienteRegistrado.id,
        usuario_recibe_id: req.usuario.id,
        tecnico_asignado_id: tecnico_asignado_id || null,
        tipo_equipo, marca, modelo, numero_serie, color,
        falla_reportada,
        accesorios: Array.isArray(accesorios) ? accesorios : [],
        estado_fisico,
        clave_acceso: claveCifrada,
        clave_acceso_entregada: Boolean(clave_acceso),
        observaciones_ingreso,
        firma_ingreso_nombre,
        firma_ingreso_rut,
        firma_ingreso_data,
        empresa_orden_nombre: cliente.nombre,
        empresa_orden_rut: cliente.rut,
        contacto_orden_nombre: esParticular ? cliente.nombre : (cliente.contacto_nombre || null),
        contacto_orden_telefono: cliente.telefono || null,
        contacto_orden_email: cliente.email || null,
        contacto_orden_direccion: cliente.direccion || null
      });

      if (tecnico_asignado_id) {
        const tecnico = Usuario.buscarPorId(tecnico_asignado_id);
        if (tecnico) {
          Orden.registrarHistorial(orden.id, req.usuario.id, orden.estado, orden.estado, comentarioAsignacionTecnico(tecnico));
        }
      }

      if (preingreso) {
        Preingreso.marcarRecepcionado(preingreso.id, orden.id);
        Orden.registrarHistorial(
          orden.id,
          req.usuario.id,
          orden.estado,
          orden.estado,
          `Ingreso creado desde codigo de servicio ${preingreso.codigo_servicio}`
        );
      }

      if (Array.isArray(req.files) && req.files.length) {
        req.files.slice(0, 3).forEach((foto) => {
          Orden.agregarFoto(orden.id, {
            ruta_archivo: foto.filename,
            nombre_original: foto.originalname,
            tipo: 'ingreso'
          });
        });
      } else if (Array.isArray(fotos_ingreso)) {
        const fotos = fotos_ingreso.slice(0, 3);
        fotos.forEach((foto) => {
          if (!foto?.data_url) return;
          const archivo = guardarFotoBase64({
            dataUrl: foto.data_url,
            nombreOriginal: foto.nombre_original
          });
          Orden.agregarFoto(orden.id, {
            ruta_archivo: archivo.ruta_archivo,
            nombre_original: archivo.nombre_original,
            tipo: 'ingreso'
          });
        });
      }

      const ordenCompleta = Orden.buscarPorId(orden.id);
      await notificarIngresoCreado(ordenCompleta);
      res.status(201).json(ordenCompleta);
    } catch (err) {
      next(err);
    }
  },

  listar(req, res) {
    const { estado, cliente_id, tecnico_id, busqueda, limit, offset } = req.query;
    const params = {
      estado, cliente_id, tecnico_id, busqueda,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };
    const ordenes = Orden.listar(params);
    const total = Orden.contar(params);
    res.json({ ordenes, total });
  },

  obtener(req, res) {
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
    res.json(orden);
  },

  obtenerPorNumero(req, res) {
    const orden = Orden.buscarPorNumero(req.params.numero);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
    res.json(orden);
  },

  async reenviarCorreo(req, res, next) {
    try {
      const orden = Orden.buscarPorId(req.params.id);
      if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

      const resultado = await reenviarCorreoOrden(orden);
      res.json({
        ok: resultado.ok,
        estado: resultado.estado,
        detalle: resultado.detalle,
        orden: Orden.buscarPorId(req.params.id)
      });
    } catch (err) {
      next(err);
    }
  },

  actualizarEstado(req, res) {
    const { estado, comentario } = req.body;
    const ESTADOS_VALIDOS = ['ingresado', 'en_diagnostico', 'en_reparacion', 'esperando_aprobacion', 'reparado', 'no_reparable', 'entregado', 'cancelado'];

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado invalido.' });
    }

    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    const actualizada = Orden.actualizarEstado(req.params.id, estado, req.usuario.id, comentario);
    res.json(actualizada);
  },

  actualizarDiagnostico(req, res) {
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    const { diagnostico, presupuesto_monto, tecnico_asignado_id } = req.body;
    const cambios = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'diagnostico')) {
      cambios.diagnostico = diagnostico;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'presupuesto_monto')) {
      cambios.presupuesto_monto = presupuesto_monto;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'tecnico_asignado_id')) {
      cambios.tecnico_asignado_id = tecnico_asignado_id;
    }

    const actualizada = Orden.actualizarDiagnostico(req.params.id, cambios);

    if (diagnostico) {
      Orden.registrarHistorial(req.params.id, req.usuario.id, orden.estado, orden.estado, 'Diagnostico actualizado');
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'tecnico_asignado_id')
      && Number(orden.tecnico_asignado_id || 0) !== Number(tecnico_asignado_id || 0)) {
      const tecnico = tecnico_asignado_id ? Usuario.buscarPorId(tecnico_asignado_id) : null;
      Orden.registrarHistorial(
        req.params.id,
        req.usuario.id,
        orden.estado,
        orden.estado,
        comentarioAsignacionTecnico(tecnico)
      );
    }

    res.json(actualizada);
  },

  aprobarPresupuesto(req, res) {
    const { aprobado } = req.body;
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    const actualizada = Orden.aprobarPresupuesto(req.params.id, aprobado);
    Orden.registrarHistorial(
      req.params.id, req.usuario.id, orden.estado, orden.estado,
      aprobado ? 'Presupuesto aprobado por el cliente' : 'Presupuesto rechazado por el cliente'
    );
    res.json(actualizada);
  },

  /**
   * Registra la entrega del equipo: requiere firma del cliente.
   */
  registrarEntrega(req, res) {
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    if (orden.estado === 'entregado') {
      return res.status(409).json({ error: 'Esta orden ya fue marcada como entregada.' });
    }

    const { firma_entrega_nombre, firma_entrega_rut, firma_entrega_data, observaciones_entrega } = req.body;

    if (!firma_entrega_data || !firma_entrega_nombre || !firma_entrega_rut) {
      return res.status(400).json({ error: 'La firma de conformidad del cliente es obligatoria para la entrega.' });
    }

    const actualizada = Orden.registrarEntrega(req.params.id, {
      firma_entrega_nombre, firma_entrega_rut, firma_entrega_data, observaciones_entrega,
      usuario_id: req.usuario.id
    });

    res.json(actualizada);
  },

  agregarFoto(req, res) {
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
    if (!req.file) return res.status(400).json({ error: 'No se recibio ningun archivo.' });
    const tipo = req.body.tipo || 'ingreso';

    if (tipo === 'ingreso' && Orden.contarFotosPorTipo(req.params.id, 'ingreso') >= 3) {
      return res.status(409).json({ error: 'Solo se permiten hasta 3 imagenes de ingreso por orden.' });
    }

    const foto = Orden.agregarFoto(req.params.id, {
      ruta_archivo: req.file.filename,
      nombre_original: req.file.originalname,
      tipo
    });

    res.status(201).json(foto);
  },

  actualizarFoto(req, res) {
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    const foto = Orden.buscarFotoPorId(req.params.fotoId);
    if (!foto || Number(foto.orden_id) !== Number(req.params.id)) {
      return res.status(404).json({ error: 'Foto no encontrada para esta orden.' });
    }

    const tiposValidos = ['ingreso', 'diagnostico', 'entrega'];
    const tipo = req.body.tipo || foto.tipo;
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de foto invalido.' });
    }

    const posicion = Number.isFinite(Number(req.body.posicion)) ? Number(req.body.posicion) : foto.posicion;
    const actualizada = Orden.actualizarFoto(req.params.fotoId, { tipo, posicion });
    Orden.registrarHistorial(
      req.params.id,
      req.usuario.id,
      orden.estado,
      orden.estado,
      `Foto actualizada (${comentarioTipoFoto(tipo)})`
    );
    res.json(actualizada);
  },

  eliminarFoto(req, res) {
    const orden = Orden.buscarPorId(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });

    const foto = Orden.buscarFotoPorId(req.params.fotoId);
    if (!foto || Number(foto.orden_id) !== Number(req.params.id)) {
      return res.status(404).json({ error: 'Foto no encontrada para esta orden.' });
    }

    Orden.eliminarFoto(req.params.fotoId);
    Orden.registrarHistorial(
      req.params.id,
      req.usuario.id,
      orden.estado,
      orden.estado,
      `Foto eliminada (${comentarioTipoFoto(foto.tipo)})`
    );
    res.json({ mensaje: 'Foto eliminada.' });
  },

  async pdfIngreso(req, res, next) {
    try {
      const orden = Orden.buscarPorId(req.params.id);
      if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
      if (!orden.firma_ingreso_data) {
        return res.status(400).json({ error: 'Esta orden aun no tiene firma de ingreso registrada.' });
      }

      const buffer = await generarComprobanteIngreso(orden);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="ingreso-${orden.numero_orden}.pdf"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async pdfEntrega(req, res, next) {
    try {
      const orden = Orden.buscarPorId(req.params.id);
      if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
      if (!orden.firma_entrega_data) {
        return res.status(400).json({ error: 'Esta orden aun no tiene firma de entrega registrada.' });
      }

      const buffer = await generarComprobanteEntrega(orden);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="entrega-${orden.numero_orden}.pdf"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  estadisticas(req, res) {
    res.json(Orden.estadisticas());
  }
};

module.exports = ordenesController;
