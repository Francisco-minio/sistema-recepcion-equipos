const db = require('../config/database');

const NotificacionLog = {
  registrar({ entidad_tipo, entidad_id, canal, evento, destinatario, asunto, estado, detalle }) {
    const info = db.prepare(`
      INSERT INTO notificacion_logs (
        entidad_tipo, entidad_id, canal, evento, destinatario, asunto, estado, detalle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entidad_tipo,
      entidad_id,
      canal,
      evento,
      destinatario || null,
      asunto || null,
      estado,
      detalle || null
    );

    return db.prepare('SELECT * FROM notificacion_logs WHERE id = ?').get(info.lastInsertRowid);
  },

  listarPorEntidad(entidad_tipo, entidad_id) {
    return db.prepare(`
      SELECT *
      FROM notificacion_logs
      WHERE entidad_tipo = ? AND entidad_id = ?
      ORDER BY creado_en DESC, id DESC
    `).all(entidad_tipo, entidad_id);
  }
};

module.exports = NotificacionLog;
