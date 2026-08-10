const db = require('../config/database');
const { cifrarTexto, descifrarTexto, esTextoCifrado } = require('../utils/secretField');

const CLAVES_SECRETAS = new Set(['smtp_pass', 'telegram_bot_token']);

const CLAVES_NOTIFICACION = [
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_pass',
  'smtp_from',
  'telegram_bot_token',
  'telegram_chat_id'
];

const Configuracion = {
  obtener(clave) {
    return db.prepare('SELECT clave, valor, actualizado_en FROM configuraciones WHERE clave = ?').get(clave);
  },

  obtenerValor(clave) {
    const fila = this.obtener(clave);
    if (!fila) return null;
    if (CLAVES_SECRETAS.has(clave)) {
      return descifrarTexto(fila.valor);
    }
    return fila.valor;
  },

  guardar(clave, valor) {
    const valorNormalizado = CLAVES_SECRETAS.has(clave)
      ? (valor ? cifrarTexto(valor) : '')
      : String(valor ?? '');

    db.prepare(`
      INSERT INTO configuraciones (clave, valor, actualizado_en)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(clave) DO UPDATE SET
        valor = excluded.valor,
        actualizado_en = datetime('now')
    `).run(clave, valorNormalizado);
  },

  obtenerConfiguracionNotificaciones() {
    const filas = db.prepare(`
      SELECT clave, valor
      FROM configuraciones
      WHERE clave IN (${CLAVES_NOTIFICACION.map(() => '?').join(', ')})
    `).all(...CLAVES_NOTIFICACION);

    const mapa = Object.fromEntries(filas.map((fila) => [fila.clave, fila.valor]));
    return {
      smtp_host: mapa.smtp_host || '',
      smtp_port: mapa.smtp_port || '',
      smtp_secure: mapa.smtp_secure === 'true',
      smtp_user: mapa.smtp_user || '',
      smtp_from: mapa.smtp_from || '',
      telegram_chat_id: mapa.telegram_chat_id || '',
      has_smtp_pass: Boolean(mapa.smtp_pass),
      has_telegram_bot_token: Boolean(mapa.telegram_bot_token)
    };
  },

  guardarConfiguracionNotificaciones(payload) {
    const existente = this.obtenerConfiguracionNotificaciones();

    const datos = {
      smtp_host: String(payload.smtp_host || '').trim(),
      smtp_port: String(payload.smtp_port || '').trim(),
      smtp_secure: payload.smtp_secure ? 'true' : 'false',
      smtp_user: String(payload.smtp_user || '').trim(),
      smtp_from: String(payload.smtp_from || '').trim(),
      telegram_chat_id: String(payload.telegram_chat_id || '').trim()
    };

    Object.entries(datos).forEach(([clave, valor]) => {
      this.guardar(clave, valor);
    });

    if (Object.prototype.hasOwnProperty.call(payload, 'smtp_pass')) {
      const smtpPass = String(payload.smtp_pass || '');
      if (smtpPass.trim()) {
        this.guardar('smtp_pass', smtpPass);
      } else if (!payload.preservar_smtp_pass) {
        this.guardar('smtp_pass', '');
      } else if (!existente.has_smtp_pass) {
        this.guardar('smtp_pass', '');
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'telegram_bot_token')) {
      const token = String(payload.telegram_bot_token || '');
      if (token.trim()) {
        this.guardar('telegram_bot_token', token);
      } else if (!payload.preservar_telegram_bot_token) {
        this.guardar('telegram_bot_token', '');
      } else if (!existente.has_telegram_bot_token) {
        this.guardar('telegram_bot_token', '');
      }
    }

    return this.obtenerConfiguracionNotificaciones();
  },

  obtenerNotificacionesParaUso() {
    const filas = db.prepare(`
      SELECT clave, valor
      FROM configuraciones
      WHERE clave IN (${CLAVES_NOTIFICACION.map(() => '?').join(', ')})
    `).all(...CLAVES_NOTIFICACION);

    const resultado = {};
    filas.forEach((fila) => {
      const valor = CLAVES_SECRETAS.has(fila.clave)
        ? (esTextoCifrado(fila.valor) ? descifrarTexto(fila.valor) : fila.valor)
        : fila.valor;
      resultado[fila.clave] = valor || '';
    });
    return resultado;
  }
};

module.exports = Configuracion;
