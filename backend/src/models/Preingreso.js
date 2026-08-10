const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const NotificacionLog = require('./NotificacionLog');

function generarCodigoServicio() {
  const anio = new Date().getFullYear();
  const fila = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(codigo_servicio, 10) AS INTEGER)), 0) AS ultimo
    FROM preingresos
    WHERE codigo_servicio LIKE ?
  `).get(`PRE-${anio}-%`);
  const siguiente = String((fila?.ultimo || 0) + 1).padStart(6, '0');
  return `PRE-${anio}-${siguiente}`;
}

const SELECT_BASE = `
  SELECT
    p.*,
    u.nombre AS creado_por_nombre,
    u.email AS creado_por_email,
    o.numero_orden AS orden_numero,
    (
      SELECT n.estado
      FROM notificacion_logs n
      WHERE n.entidad_tipo = 'preingreso'
        AND n.entidad_id = p.id
        AND n.canal = 'email'
      ORDER BY n.creado_en DESC, n.id DESC
      LIMIT 1
    ) AS ultima_notificacion_email_estado,
    (
      SELECT n.creado_en
      FROM notificacion_logs n
      WHERE n.entidad_tipo = 'preingreso'
        AND n.entidad_id = p.id
        AND n.canal = 'email'
      ORDER BY n.creado_en DESC, n.id DESC
      LIMIT 1
    ) AS ultima_notificacion_email_fecha,
    (
      SELECT n.detalle
      FROM notificacion_logs n
      WHERE n.entidad_tipo = 'preingreso'
        AND n.entidad_id = p.id
        AND n.canal = 'email'
      ORDER BY n.creado_en DESC, n.id DESC
      LIMIT 1
    ) AS ultima_notificacion_email_detalle
  FROM preingresos p
  JOIN usuarios u ON u.id = p.creado_por_usuario_id
  LEFT JOIN ordenes o ON o.id = p.orden_id
`;

const Preingreso = {
  crear({ creado_por_usuario_id }) {
    const codigo_servicio = generarCodigoServicio();
    const token_acceso = uuidv4();
    const info = db.prepare(`
      INSERT INTO preingresos (codigo_servicio, token_acceso, creado_por_usuario_id)
      VALUES (?, ?, ?)
    `).run(codigo_servicio, token_acceso, creado_por_usuario_id);
    return this.buscarPorId(info.lastInsertRowid);
  },

  buscarPorId(id) {
    const preingreso = db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(id);
    if (preingreso) {
      preingreso.notificaciones = NotificacionLog.listarPorEntidad('preingreso', preingreso.id);
    }
    return preingreso;
  },

  buscarPorToken(token) {
    if (!token || !String(token).trim()) return null;
    return db.prepare(`${SELECT_BASE} WHERE p.token_acceso = ?`).get(token);
  },

  buscarPorCodigo(codigo_servicio) {
    return db.prepare(`${SELECT_BASE} WHERE p.codigo_servicio = ?`).get(codigo_servicio);
  },

  listar({ usuario_id, rol, estado, limit = 50, offset = 0 } = {}) {
    const condiciones = [];
    const params = { limit, offset };

    if (rol === 'tecnico') {
      condiciones.push('p.creado_por_usuario_id = @usuario_id');
      params.usuario_id = usuario_id;
    }
    if (estado) {
      condiciones.push('p.estado = @estado');
      params.estado = estado;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    return db.prepare(`
      ${SELECT_BASE}
      ${where}
      ORDER BY p.creado_en DESC
      LIMIT @limit OFFSET @offset
    `).all(params);
  },

  actualizarDesdeCliente(id, datos) {
    db.prepare(`
      UPDATE preingresos SET
        token_acceso = 'usado-' || id || '-' || strftime('%s', 'now'),
        cliente_nombre = ?,
        cliente_rut = ?,
        cliente_telefono = ?,
        cliente_email = ?,
        tipo_equipo = ?,
        marca = ?,
        modelo = ?,
        numero_serie = ?,
        falla_reportada = ?,
        observaciones = ?,
        estado = 'enviado',
        enviado_en = datetime('now'),
        actualizado_en = datetime('now')
      WHERE id = ?
    `).run(
      datos.cliente_nombre,
      datos.cliente_rut,
      datos.cliente_telefono || null,
      datos.cliente_email || null,
      datos.tipo_equipo || 'computador',
      datos.marca || null,
      datos.modelo || null,
      datos.numero_serie || null,
      datos.falla_reportada,
      datos.observaciones || null,
      id
    );
    return this.buscarPorId(id);
  },

  marcarRecepcionado(id, orden_id) {
    db.prepare(`
      UPDATE preingresos SET
        estado = 'recepcionado',
        orden_id = ?,
        recepcionado_en = datetime('now'),
        actualizado_en = datetime('now')
      WHERE id = ?
    `).run(orden_id, id);
    return this.buscarPorId(id);
  }
};

module.exports = Preingreso;
