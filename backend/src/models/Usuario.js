const db = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = {
  crear({ nombre, email, password, rol }) {
    const password_hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(nombre, email, password_hash, rol || 'tecnico');
    return this.buscarPorId(info.lastInsertRowid);
  },

  buscarPorEmail(email) {
    return db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  },

  buscarPorId(id) {
    return db.prepare(`
      SELECT id, nombre, email, rol, activo, creado_en FROM usuarios WHERE id = ?
    `).get(id);
  },

  listarTodos() {
    return db.prepare(`
      SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY nombre
    `).all();
  },

  listarTecnicos() {
    return db.prepare(`
      SELECT id, nombre, email FROM usuarios WHERE rol IN ('tecnico', 'admin') AND activo = 1 ORDER BY nombre
    `).all();
  },

  listarTecnicosDetalle() {
    return db.prepare(`
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.rol,
        u.activo,
        u.creado_en,
        COUNT(CASE WHEN o.estado IN ('ingresado', 'en_diagnostico', 'en_reparacion', 'esperando_aprobacion', 'reparado') THEN 1 END) AS ordenes_activas,
        COUNT(CASE WHEN o.estado = 'entregado' THEN 1 END) AS ordenes_entregadas,
        COUNT(o.id) AS ordenes_totales
      FROM usuarios u
      LEFT JOIN ordenes o ON o.tecnico_asignado_id = u.id
      WHERE u.rol IN ('tecnico', 'admin')
      GROUP BY u.id
      ORDER BY u.activo DESC, ordenes_activas DESC, u.nombre ASC
    `).all();
  },

  actualizar(id, { nombre, rol, activo }) {
    db.prepare(`
      UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE id = ?
    `).run(nombre, rol, activo ? 1 : 0, id);
    return this.buscarPorId(id);
  },

  cambiarPassword(id, nuevaPassword) {
    const password_hash = bcrypt.hashSync(nuevaPassword, 10);
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(password_hash, id);
  },

  verificarPassword(passwordPlano, hash) {
    return bcrypt.compareSync(passwordPlano, hash);
  }
};

module.exports = Usuario;
