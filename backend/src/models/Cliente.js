const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const Cliente = {
  crear({ nombre, rut, tipo_cliente, razon_social, giro, contacto_nombre, contacto_cargo, telefono, email, direccion, notas }) {
    const stmt = db.prepare(`
      INSERT INTO clientes (nombre, rut, tipo_cliente, razon_social, giro, contacto_nombre, contacto_cargo, telefono, email, direccion, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nombre,
      rut,
      tipo_cliente || 'empresa',
      razon_social || null,
      giro || null,
      contacto_nombre || null,
      contacto_cargo || null,
      telefono || null,
      email || null,
      direccion || null,
      notas || null
    );
    return this.buscarPorId(info.lastInsertRowid);
  },

  buscarPorId(id) {
    return db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  },

  buscarPorRut(rut) {
    return db.prepare('SELECT * FROM clientes WHERE rut = ?').get(rut);
  },

  buscarEmpresaPorNombreExacto(nombre) {
    if (!nombre) return null;
    return db.prepare(`
      SELECT * FROM clientes
      WHERE tipo_cliente = 'empresa' AND lower(trim(nombre)) = lower(trim(?))
      LIMIT 1
    `).get(nombre);
  },

  buscar(termino) {
    const like = `%${termino}%`;
    return db.prepare(`
      SELECT DISTINCT c.*
      FROM clientes c
      LEFT JOIN ordenes o ON o.cliente_id = c.id
      WHERE c.nombre LIKE ?
        OR c.rut LIKE ?
        OR c.telefono LIKE ?
        OR c.email LIKE ?
        OR c.razon_social LIKE ?
        OR c.contacto_nombre LIKE ?
        OR o.numero_serie LIKE ?
        OR o.marca LIKE ?
        OR o.modelo LIKE ?
        OR (COALESCE(o.marca, '') || ' ' || COALESCE(o.modelo, '')) LIKE ?
      ORDER BY c.nombre
      LIMIT 20
    `).all(like, like, like, like, like, like, like, like, like, like);
  },

  listarTodos({ limit = 50, offset = 0, tipo_cliente } = {}) {
    if (tipo_cliente) {
      return db.prepare(`
        SELECT * FROM clientes WHERE tipo_cliente = ? ORDER BY nombre LIMIT ? OFFSET ?
      `).all(tipo_cliente, limit, offset);
    }
    return db.prepare(`
      SELECT * FROM clientes ORDER BY nombre LIMIT ? OFFSET ?
    `).all(limit, offset);
  },

  contarOrdenes(id) {
    const fila = db.prepare('SELECT COUNT(*) AS total FROM ordenes WHERE cliente_id = ?').get(id);
    return fila?.total || 0;
  },

  eliminar(id, { forzar = false } = {}) {
    const totalOrdenes = this.contarOrdenes(id);
    if (totalOrdenes > 0 && !forzar) {
      const err = new Error('La empresa tiene ordenes asociadas. Usa eliminacion forzada si deseas borrar tambien su historial.');
      err.status = 409;
      throw err;
    }

    const tx = db.transaction(() => {
      if (totalOrdenes > 0) {
        const fotos = db.prepare(`
          SELECT f.ruta_archivo
          FROM orden_fotos f
          JOIN ordenes o ON o.id = f.orden_id
          WHERE o.cliente_id = ?
        `).all(id);
        fotos.forEach((foto) => {
          const ruta = path.join(UPLOADS_DIR, foto.ruta_archivo || '');
          if (foto.ruta_archivo && fs.existsSync(ruta)) {
            fs.unlinkSync(ruta);
          }
        });
        db.prepare('DELETE FROM ordenes WHERE cliente_id = ?').run(id);
      }
      db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
    });

    tx();
    return { totalOrdenesEliminadas: totalOrdenes };
  },

  actualizar(id, { nombre, tipo_cliente, razon_social, giro, contacto_nombre, contacto_cargo, telefono, email, direccion, notas }) {
    db.prepare(`
      UPDATE clientes SET
        nombre = ?, tipo_cliente = ?, razon_social = ?, giro = ?, contacto_nombre = ?, contacto_cargo = ?,
        telefono = ?, email = ?, direccion = ?, notas = ?
      WHERE id = ?
    `).run(
      nombre,
      tipo_cliente || 'empresa',
      razon_social || null,
      giro || null,
      contacto_nombre || null,
      contacto_cargo || null,
      telefono || null,
      email || null,
      direccion || null,
      notas || null,
      id
    );
    return this.buscarPorId(id);
  },

  obtenerOCrear({ empresa_id, nombre, rut, tipo_cliente, razon_social, giro, contacto_nombre, contacto_cargo, telefono, email, direccion, notas }) {
    const tipo = tipo_cliente || 'empresa';

    if (empresa_id) {
      const existentePorId = this.buscarPorId(empresa_id);
      if (existentePorId) {
        return existentePorId;
      }
    }

    const existente = this.buscarPorRut(rut);
    if (existente) {
      return existente;
    }

    const existentePorNombre = tipo === 'empresa' ? this.buscarEmpresaPorNombreExacto(nombre || razon_social) : null;
    if (existentePorNombre) {
      return existentePorNombre;
    }

    return this.crear({
      nombre,
      rut,
      tipo_cliente: tipo,
      razon_social,
      giro,
      contacto_nombre,
      contacto_cargo,
      telefono,
      email,
      direccion,
      notas
    });
  }
};

module.exports = Cliente;
