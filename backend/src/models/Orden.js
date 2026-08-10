const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const NotificacionLog = require('./NotificacionLog');

/**
 * Genera un numero de orden legible, ej: OS-2026-000123
 */
function generarNumeroOrden() {
  const anio = new Date().getFullYear();
  const fila = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(numero_orden, 9) AS INTEGER)), 0) AS ultimo
    FROM ordenes
    WHERE numero_orden LIKE ?
  `).get(`OS-${anio}-%`);
  const siguiente = (fila.ultimo + 1).toString().padStart(6, '0');
  return `OS-${anio}-${siguiente}`;
}

const SELECT_COMPLETO = `
  SELECT
    o.*,
    COALESCE(o.empresa_orden_nombre, c.nombre) AS cliente_nombre,
    COALESCE(o.empresa_orden_rut, c.rut) AS cliente_rut,
    COALESCE(o.contacto_orden_telefono, c.telefono) AS cliente_telefono,
    COALESCE(o.contacto_orden_email, c.email) AS cliente_email,
    COALESCE(o.contacto_orden_direccion, c.direccion) AS cliente_direccion,
    c.razon_social AS cliente_empresa,
    COALESCE(o.contacto_orden_nombre, c.contacto_nombre) AS cliente_contacto_nombre,
    ur.nombre AS usuario_recibe_nombre,
    ut.nombre AS tecnico_asignado_nombre,
    ue.nombre AS usuario_entrega_nombre
  FROM ordenes o
  JOIN clientes c ON c.id = o.cliente_id
  JOIN usuarios ur ON ur.id = o.usuario_recibe_id
  LEFT JOIN usuarios ut ON ut.id = o.tecnico_asignado_id
  LEFT JOIN usuarios ue ON ue.id = o.usuario_entrega_id
`;

const Orden = {
  generarNumeroOrden,

  crear(datos) {
    const numero_orden = generarNumeroOrden();
    const stmt = db.prepare(`
      INSERT INTO ordenes (
        numero_orden, cliente_id, usuario_recibe_id, tecnico_asignado_id,
        tipo_equipo, marca, modelo, numero_serie, color,
        falla_reportada, accesorios, estado_fisico, clave_acceso, observaciones_ingreso,
        firma_ingreso_nombre, firma_ingreso_rut, firma_ingreso_data, firma_ingreso_fecha,
        empresa_orden_nombre, empresa_orden_rut, contacto_orden_nombre, contacto_orden_telefono,
        contacto_orden_email, contacto_orden_direccion, clave_acceso_entregada,
        estado
      ) VALUES (
        @numero_orden, @cliente_id, @usuario_recibe_id, @tecnico_asignado_id,
        @tipo_equipo, @marca, @modelo, @numero_serie, @color,
        @falla_reportada, @accesorios, @estado_fisico, @clave_acceso, @observaciones_ingreso,
        @firma_ingreso_nombre, @firma_ingreso_rut, @firma_ingreso_data, @firma_ingreso_fecha,
        @empresa_orden_nombre, @empresa_orden_rut, @contacto_orden_nombre, @contacto_orden_telefono,
        @contacto_orden_email, @contacto_orden_direccion, @clave_acceso_entregada,
        @estado
      )
    `);

    const info = stmt.run({
      numero_orden,
      cliente_id: datos.cliente_id,
      usuario_recibe_id: datos.usuario_recibe_id,
      tecnico_asignado_id: datos.tecnico_asignado_id || null,
      tipo_equipo: datos.tipo_equipo,
      marca: datos.marca || null,
      modelo: datos.modelo || null,
      numero_serie: datos.numero_serie || null,
      color: datos.color || null,
      falla_reportada: datos.falla_reportada,
      accesorios: JSON.stringify(datos.accesorios || []),
      estado_fisico: datos.estado_fisico || null,
      clave_acceso: datos.clave_acceso || null,
      clave_acceso_entregada: datos.clave_acceso_entregada ? 1 : 0,
      observaciones_ingreso: datos.observaciones_ingreso || null,
      firma_ingreso_nombre: datos.firma_ingreso_nombre,
      firma_ingreso_rut: datos.firma_ingreso_rut,
      firma_ingreso_data: datos.firma_ingreso_data,
      firma_ingreso_fecha: new Date().toISOString(),
      empresa_orden_nombre: datos.empresa_orden_nombre || null,
      empresa_orden_rut: datos.empresa_orden_rut || null,
      contacto_orden_nombre: datos.contacto_orden_nombre || null,
      contacto_orden_telefono: datos.contacto_orden_telefono || null,
      contacto_orden_email: datos.contacto_orden_email || null,
      contacto_orden_direccion: datos.contacto_orden_direccion || null,
      estado: 'ingresado'
    });

    this.registrarHistorial(info.lastInsertRowid, datos.usuario_recibe_id, null, 'ingresado', 'Ingreso de equipo');

    return this.buscarPorId(info.lastInsertRowid);
  },

  buscarPorId(id) {
    const orden = db.prepare(`${SELECT_COMPLETO} WHERE o.id = ?`).get(id);
    if (orden) {
      orden.accesorios = orden.accesorios ? JSON.parse(orden.accesorios) : [];
      orden.fotos = db.prepare(`
        SELECT * FROM orden_fotos
        WHERE orden_id = ?
        ORDER BY posicion ASC, creado_en ASC, id ASC
      `).all(id);
      orden.historial = db.prepare(`
        SELECT h.*, u.nombre AS usuario_nombre
        FROM orden_historial h
        LEFT JOIN usuarios u ON u.id = h.usuario_id
        WHERE h.orden_id = ? ORDER BY h.creado_en ASC
      `).all(id);
      orden.notificaciones = NotificacionLog.listarPorEntidad('orden', id);
    }
    return orden;
  },

  buscarPorNumero(numero_orden) {
    const fila = db.prepare(`${SELECT_COMPLETO} WHERE o.numero_orden = ?`).get(numero_orden);
    return fila ? this.buscarPorId(fila.id) : null;
  },

  listar({ estado, cliente_id, tecnico_id, busqueda, limit = 50, offset = 0 } = {}) {
    let condiciones = [];
    let params = {};

    if (estado) {
      condiciones.push('o.estado = @estado');
      params.estado = estado;
    }
    if (cliente_id) {
      condiciones.push('o.cliente_id = @cliente_id');
      params.cliente_id = cliente_id;
    }
    if (tecnico_id) {
      condiciones.push('o.tecnico_asignado_id = @tecnico_id');
      params.tecnico_id = tecnico_id;
    }
    if (busqueda) {
      condiciones.push(`(
        o.numero_orden LIKE @busqueda
        OR c.nombre LIKE @busqueda
        OR c.rut LIKE @busqueda
        OR o.numero_serie LIKE @busqueda
        OR o.marca LIKE @busqueda
        OR o.modelo LIKE @busqueda
        OR (COALESCE(o.marca, '') || ' ' || COALESCE(o.modelo, '')) LIKE @busqueda
      )`);
      params.busqueda = `%${busqueda}%`;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    params.limit = limit;
    params.offset = offset;

    const filas = db.prepare(`
      ${SELECT_COMPLETO}
      ${where}
      ORDER BY o.creado_en DESC
      LIMIT @limit OFFSET @offset
    `).all(params);

    return filas.map(f => ({ ...f, accesorios: f.accesorios ? JSON.parse(f.accesorios) : [] }));
  },

  contar({ estado, cliente_id, tecnico_id, busqueda } = {}) {
    let condiciones = [];
    let params = {};

    if (estado) {
      condiciones.push('o.estado = @estado');
      params.estado = estado;
    }
    if (cliente_id) {
      condiciones.push('o.cliente_id = @cliente_id');
      params.cliente_id = cliente_id;
    }
    if (tecnico_id) {
      condiciones.push('o.tecnico_asignado_id = @tecnico_id');
      params.tecnico_id = tecnico_id;
    }
    if (busqueda) {
      condiciones.push(`(
        o.numero_orden LIKE @busqueda
        OR c.nombre LIKE @busqueda
        OR c.rut LIKE @busqueda
        OR o.numero_serie LIKE @busqueda
        OR o.marca LIKE @busqueda
        OR o.modelo LIKE @busqueda
        OR (COALESCE(o.marca, '') || ' ' || COALESCE(o.modelo, '')) LIKE @busqueda
      )`);
      params.busqueda = `%${busqueda}%`;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const fila = db.prepare(`
      SELECT COUNT(*) as total FROM ordenes o JOIN clientes c ON c.id = o.cliente_id ${where}
    `).get(params);
    return fila.total;
  },

  actualizarEstado(id, nuevoEstado, usuario_id, comentario) {
    const actual = db.prepare('SELECT estado FROM ordenes WHERE id = ?').get(id);
    if (!actual) return null;

    db.prepare(`
      UPDATE ordenes SET estado = ?, actualizado_en = datetime('now') WHERE id = ?
    `).run(nuevoEstado, id);

    this.registrarHistorial(id, usuario_id, actual.estado, nuevoEstado, comentario);
    return this.buscarPorId(id);
  },

  actualizarDiagnostico(id, cambios = {}) {
    const sets = [];
    const valores = [];

    if (Object.prototype.hasOwnProperty.call(cambios, 'diagnostico')) {
      sets.push('diagnostico = ?');
      valores.push(cambios.diagnostico ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(cambios, 'presupuesto_monto')) {
      sets.push('presupuesto_monto = ?');
      valores.push(cambios.presupuesto_monto ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(cambios, 'tecnico_asignado_id')) {
      sets.push('tecnico_asignado_id = ?');
      valores.push(cambios.tecnico_asignado_id ?? null);
    }

    if (!sets.length) {
      return this.buscarPorId(id);
    }

    sets.push("actualizado_en = datetime('now')");
    valores.push(id);

    db.prepare(`
      UPDATE ordenes SET
        ${sets.join(', ')}
      WHERE id = ?
    `).run(...valores);
    return this.buscarPorId(id);
  },

  aprobarPresupuesto(id, aprobado) {
    db.prepare(`
      UPDATE ordenes SET presupuesto_aprobado = ?, actualizado_en = datetime('now') WHERE id = ?
    `).run(aprobado ? 1 : 0, id);
    return this.buscarPorId(id);
  },

  registrarEntrega(id, { firma_entrega_nombre, firma_entrega_rut, firma_entrega_data, observaciones_entrega, usuario_id }) {
    const actual = db.prepare('SELECT estado FROM ordenes WHERE id = ?').get(id);

    db.prepare(`
      UPDATE ordenes SET
        firma_entrega_nombre = ?,
        firma_entrega_rut = ?,
        firma_entrega_data = ?,
        firma_entrega_fecha = datetime('now'),
        usuario_entrega_id = ?,
        observaciones_entrega = ?,
        estado = 'entregado',
        actualizado_en = datetime('now')
      WHERE id = ?
    `).run(firma_entrega_nombre, firma_entrega_rut, firma_entrega_data, usuario_id || null, observaciones_entrega || null, id);

    this.registrarHistorial(id, usuario_id, actual ? actual.estado : null, 'entregado', 'Equipo entregado al cliente');
    return this.buscarPorId(id);
  },

  registrarHistorial(orden_id, usuario_id, estado_anterior, estado_nuevo, comentario) {
    db.prepare(`
      INSERT INTO orden_historial (orden_id, usuario_id, estado_anterior, estado_nuevo, comentario)
      VALUES (?, ?, ?, ?, ?)
    `).run(orden_id, usuario_id || null, estado_anterior, estado_nuevo, comentario || null);
  },

  agregarFoto(orden_id, { ruta_archivo, nombre_original, tipo }) {
    const posicion = this.contarFotosPorTipo(orden_id, tipo || 'ingreso');
    const info = db.prepare(`
      INSERT INTO orden_fotos (orden_id, tipo, posicion, ruta_archivo, nombre_original)
      VALUES (?, ?, ?, ?, ?)
    `).run(orden_id, tipo || 'ingreso', posicion, ruta_archivo, nombre_original || null);
    return db.prepare('SELECT * FROM orden_fotos WHERE id = ?').get(info.lastInsertRowid);
  },

  buscarFotoPorId(foto_id) {
    return db.prepare('SELECT * FROM orden_fotos WHERE id = ?').get(foto_id);
  },

  actualizarFoto(foto_id, { tipo, posicion }) {
    const actual = this.buscarFotoPorId(foto_id);
    if (!actual) return null;

    db.prepare(`
      UPDATE orden_fotos SET
        tipo = ?,
        posicion = ?
      WHERE id = ?
    `).run(tipo || actual.tipo, Number.isFinite(posicion) ? posicion : actual.posicion, foto_id);

    return this.buscarFotoPorId(foto_id);
  },

  contarFotosPorTipo(orden_id, tipo) {
    const fila = db.prepare(`
      SELECT COUNT(*) AS total FROM orden_fotos WHERE orden_id = ? AND tipo = ?
    `).get(orden_id, tipo);
    return fila?.total || 0;
  },

  eliminarFoto(foto_id) {
    const foto = db.prepare('SELECT ruta_archivo FROM orden_fotos WHERE id = ?').get(foto_id);
    if (foto && foto.ruta_archivo) {
      const rutaArchivo = path.join(__dirname, '..', '..', 'uploads', foto.ruta_archivo);
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
      }
    }

    return db.prepare('DELETE FROM orden_fotos WHERE id = ?').run(foto_id);
  },

  estadisticas() {
    const porEstado = db.prepare(`
      SELECT estado, COUNT(*) as total FROM ordenes GROUP BY estado
    `).all();
    const hoy = db.prepare(`
      SELECT COUNT(*) as total FROM ordenes WHERE date(creado_en) = date('now')
    `).get();
    return { porEstado, ingresosHoy: hoy.total };
  }
};

module.exports = Orden;
