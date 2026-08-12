const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function normalizarEmail(email) {
  if (!email) return null;
  const valor = String(email).trim().toLowerCase();
  return valor || null;
}

function normalizarCorreos(correos = [], fallbackEmail = null) {
  const listaBase = Array.isArray(correos) ? correos : [];
  const lista = [...listaBase, fallbackEmail]
    .map((item) => (typeof item === 'string' ? item : item?.email))
    .map(normalizarEmail)
    .filter(Boolean);

  return Array.from(new Set(lista));
}

function hydrateCliente(cliente) {
  if (!cliente) return null;
  const correos = db.prepare(`
    SELECT id, email, creado_en
    FROM cliente_correos
    WHERE cliente_id = ?
    ORDER BY email
  `).all(cliente.id);

  return {
    ...cliente,
    correos,
    email: cliente.email || correos[0]?.email || null
  };
}

function hydrateClientes(clientes = []) {
  return clientes.map(hydrateCliente);
}

const Cliente = {
  crear({
    nombre, rut, tipo_cliente, razon_social, giro, contacto_nombre, contacto_cargo,
    telefono, email, direccion, notas, correos
  }) {
    const correosNormalizados = normalizarCorreos(correos, email);
    const emailPrincipal = correosNormalizados[0] || null;

    const tx = db.transaction(() => {
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
        emailPrincipal,
        direccion || null,
        notas || null
      );
      this.reemplazarCorreos(info.lastInsertRowid, correosNormalizados);
      return info.lastInsertRowid;
    });

    const clienteId = tx();
    return this.buscarPorId(clienteId);
  },

  buscarPorId(id) {
    return hydrateCliente(db.prepare('SELECT * FROM clientes WHERE id = ?').get(id));
  },

  buscarPorRut(rut) {
    return hydrateCliente(db.prepare('SELECT * FROM clientes WHERE rut = ?').get(rut));
  },

  buscarEmpresaPorNombreExacto(nombre) {
    if (!nombre) return null;
    return hydrateCliente(db.prepare(`
      SELECT * FROM clientes
      WHERE tipo_cliente = 'empresa' AND lower(trim(nombre)) = lower(trim(?))
      LIMIT 1
    `).get(nombre));
  },

  buscar(termino) {
    const like = `%${termino}%`;
    const rows = db.prepare(`
      SELECT DISTINCT c.*
      FROM clientes c
      LEFT JOIN ordenes o ON o.cliente_id = c.id
      LEFT JOIN cliente_correos cc ON cc.cliente_id = c.id
      WHERE c.nombre LIKE ?
        OR c.rut LIKE ?
        OR c.telefono LIKE ?
        OR c.email LIKE ?
        OR cc.email LIKE ?
        OR c.razon_social LIKE ?
        OR c.contacto_nombre LIKE ?
        OR o.numero_serie LIKE ?
        OR o.marca LIKE ?
        OR o.modelo LIKE ?
        OR (COALESCE(o.marca, '') || ' ' || COALESCE(o.modelo, '')) LIKE ?
      ORDER BY c.nombre
      LIMIT 20
    `).all(like, like, like, like, like, like, like, like, like, like, like);
    return hydrateClientes(rows);
  },

  listarTodos({ limit = 50, offset = 0, tipo_cliente } = {}) {
    const rows = tipo_cliente
      ? db.prepare(`
        SELECT * FROM clientes WHERE tipo_cliente = ? ORDER BY nombre LIMIT ? OFFSET ?
      `).all(tipo_cliente, limit, offset)
      : db.prepare(`
        SELECT * FROM clientes ORDER BY nombre LIMIT ? OFFSET ?
      `).all(limit, offset);
    return hydrateClientes(rows);
  },

  contarOrdenes(id) {
    const fila = db.prepare('SELECT COUNT(*) AS total FROM ordenes WHERE cliente_id = ?').get(id);
    return fila?.total || 0;
  },

  reemplazarCorreos(clienteId, correos = []) {
    const lista = normalizarCorreos(correos);
    db.prepare('DELETE FROM cliente_correos WHERE cliente_id = ?').run(clienteId);
    if (lista.length) {
      const insertar = db.prepare('INSERT OR IGNORE INTO cliente_correos (cliente_id, email) VALUES (?, ?)');
      lista.forEach((email) => insertar.run(clienteId, email));
    }
    db.prepare(`
      UPDATE clientes
      SET email = (
        SELECT email
        FROM cliente_correos
        WHERE cliente_id = ?
        ORDER BY email
        LIMIT 1
      )
      WHERE id = ?
    `).run(clienteId, clienteId);
  },

  agregarCorreo(clienteId, email) {
    const cliente = this.buscarPorId(clienteId);
    if (!cliente) {
      const err = new Error('Cliente no encontrado.');
      err.status = 404;
      throw err;
    }

    const correo = normalizarEmail(email);
    if (!correo) {
      const err = new Error('Debes indicar un correo valido.');
      err.status = 400;
      throw err;
    }

    db.prepare('INSERT OR IGNORE INTO cliente_correos (cliente_id, email) VALUES (?, ?)').run(clienteId, correo);
    db.prepare(`
      UPDATE clientes
      SET email = COALESCE(email, ?)
      WHERE id = ?
    `).run(correo, clienteId);

    return this.buscarPorId(clienteId);
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

  actualizar(id, {
    nombre, tipo_cliente, razon_social, giro, contacto_nombre, contacto_cargo,
    telefono, email, direccion, notas, correos
  }) {
    const clienteActual = this.buscarPorId(id);
    const correosNormalizados = Array.isArray(correos)
      ? normalizarCorreos(correos, email)
      : null;
    const emailPrincipal = correosNormalizados?.[0] ?? normalizarEmail(email) ?? clienteActual?.email ?? null;

    const tx = db.transaction(() => {
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
        emailPrincipal,
        direccion || null,
        notas || null,
        id
      );

      if (correosNormalizados) {
        this.reemplazarCorreos(id, correosNormalizados);
      } else if (emailPrincipal) {
        this.agregarCorreo(id, emailPrincipal);
      }
    });

    tx();
    return this.buscarPorId(id);
  },

  obtenerOCrear({
    empresa_id, nombre, rut, tipo_cliente, razon_social, giro, contacto_nombre,
    contacto_cargo, telefono, email, direccion, notas, correos
  }) {
    const tipo = tipo_cliente || 'empresa';

    if (empresa_id) {
      const existentePorId = this.buscarPorId(empresa_id);
      if (existentePorId) {
        if (email) this.agregarCorreo(existentePorId.id, email);
        return existentePorId;
      }
    }

    const existente = this.buscarPorRut(rut);
    if (existente) {
      if (email) this.agregarCorreo(existente.id, email);
      return existente;
    }

    const existentePorNombre = tipo === 'empresa' ? this.buscarEmpresaPorNombreExacto(nombre || razon_social) : null;
    if (existentePorNombre) {
      if (email) this.agregarCorreo(existentePorNombre.id, email);
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
      notas,
      correos
    });
  }
};

module.exports = Cliente;
