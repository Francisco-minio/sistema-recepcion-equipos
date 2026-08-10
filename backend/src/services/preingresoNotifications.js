const nodemailer = require('nodemailer');
const Configuracion = require('../models/Configuracion');
const NotificacionLog = require('../models/NotificacionLog');

const EMPRESA_NOMBRE = process.env.EMPRESA_NOMBRE || 'Backupcode SPA';
const EMPRESA_DIRECCION = process.env.EMPRESA_DIRECCION || 'Icalma 1030, Puerto Montt';
const EMPRESA_EMAIL = process.env.EMPRESA_EMAIL || 'soporte@backupcode.cl';
const EMPRESA_MAPA_URL = process.env.EMPRESA_MAPA_URL || 'https://maps.app.goo.gl/dGcwpXHw6qUxB6Jr6';
function obtenerConfigNotificaciones() {
  const dbConfig = Configuracion.obtenerNotificacionesParaUso();

  return {
    smtpHost: dbConfig.smtp_host || process.env.SMTP_HOST || '',
    smtpPort: Number(dbConfig.smtp_port || process.env.SMTP_PORT || 587),
    smtpSecure: String(dbConfig.smtp_secure || process.env.SMTP_SECURE || 'false') === 'true',
    smtpUser: dbConfig.smtp_user || process.env.SMTP_USER || '',
    smtpPass: dbConfig.smtp_pass || process.env.SMTP_PASS || '',
    smtpFrom: dbConfig.smtp_from || process.env.SMTP_FROM || EMPRESA_EMAIL,
    telegramBotToken: dbConfig.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: dbConfig.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || ''
  };
}

function obtenerTransport() {
  const config = obtenerConfigNotificaciones();
  if (!config.smtpHost) return null;

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser ? {
      user: config.smtpUser,
      pass: config.smtpPass
    } : undefined
  });
}

function datosEquipo(preingreso) {
  return [
    `Codigo de servicio: ${preingreso.codigo_servicio}`,
    `Nombre: ${preingreso.cliente_nombre || '-'}`,
    `RUT: ${preingreso.cliente_rut || '-'}`,
    `Telefono: ${preingreso.cliente_telefono || '-'}`,
    `Correo: ${preingreso.cliente_email || '-'}`,
    `Tipo de equipo: ${preingreso.tipo_equipo || '-'}`,
    `Marca: ${preingreso.marca || '-'}`,
    `Modelo: ${preingreso.modelo || '-'}`,
    `Numero de serie: ${preingreso.numero_serie || '-'}`,
    `Motivo del ingreso: ${preingreso.falla_reportada || '-'}`,
    `Observaciones: ${preingreso.observaciones || '-'}`
  ].join('\n');
}

function datosEquipoOrden(orden) {
  return [
    `Orden: ${orden.numero_orden}`,
    `Empresa / cliente: ${orden.cliente_nombre || '-'}`,
    `Contacto: ${orden.cliente_contacto_nombre || '-'}`,
    `RUT: ${orden.cliente_rut || '-'}`,
    `Correo: ${orden.cliente_email || '-'}`,
    `Tipo de equipo: ${orden.tipo_equipo || '-'}`,
    `Marca: ${orden.marca || '-'}`,
    `Modelo: ${orden.modelo || '-'}`,
    `Numero de serie: ${orden.numero_serie || '-'}`,
    `Motivo del ingreso: ${orden.falla_reportada || '-'}`,
    `Observaciones: ${orden.observaciones_ingreso || '-'}`
  ].join('\n');
}

async function enviarCorreo({ to, subject, text, html }) {
  if (!to) {
    return { ok: false, estado: 'omitido', detalle: 'La entidad no tiene correo de contacto.' };
  }

  const smtp = obtenerTransport();
  if (!smtp) {
    return { ok: false, estado: 'omitido', detalle: 'No hay configuracion SMTP activa.' };
  }

  const config = obtenerConfigNotificaciones();
  await smtp.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
    html
  });

  return { ok: true, estado: 'enviado', detalle: 'Correo enviado correctamente.' };
}

async function enviarCorreoCliente(preingreso) {
  const subject = `Preingreso recibido ${preingreso.codigo_servicio} - ${EMPRESA_NOMBRE}`;
  const text = [
    `Hola ${preingreso.cliente_nombre || ''},`,
    '',
    `Recibimos tu preingreso en ${EMPRESA_NOMBRE}.`,
    '',
    datosEquipo(preingreso),
    '',
    'Puedes acercarte a dejar tu equipo en:',
    `${EMPRESA_DIRECCION}`,
    `${EMPRESA_MAPA_URL}`,
    '',
    'Conserva este codigo para recepcion:',
    `${preingreso.codigo_servicio}`,
    '',
    `Contacto: ${EMPRESA_EMAIL}`
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#10263c;line-height:1.5">
      <h2 style="margin:0 0 12px">${EMPRESA_NOMBRE}</h2>
      <p>Hola ${escapeHtml(preingreso.cliente_nombre || '')},</p>
      <p>Recibimos tu preingreso correctamente. Conserva este codigo para la recepcion del equipo:</p>
      <p style="font-size:20px;font-weight:700;color:#1b93f4">${escapeHtml(preingreso.codigo_servicio)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;margin:16px 0">
        ${filaHtml('Nombre', preingreso.cliente_nombre)}
        ${filaHtml('RUT', preingreso.cliente_rut)}
        ${filaHtml('Telefono', preingreso.cliente_telefono)}
        ${filaHtml('Correo', preingreso.cliente_email)}
        ${filaHtml('Tipo de equipo', preingreso.tipo_equipo)}
        ${filaHtml('Marca', preingreso.marca)}
        ${filaHtml('Modelo', preingreso.modelo)}
        ${filaHtml('Numero de serie', preingreso.numero_serie)}
        ${filaHtml('Motivo del ingreso', preingreso.falla_reportada)}
        ${filaHtml('Observaciones', preingreso.observaciones)}
      </table>
      <p><strong>Direccion de recepcion:</strong><br>${escapeHtml(EMPRESA_DIRECCION)}</p>
      <p><a href="${escapeHtml(EMPRESA_MAPA_URL)}">Ver mapa para llegar</a></p>
      <p>Contacto: <a href="mailto:${escapeHtml(EMPRESA_EMAIL)}">${escapeHtml(EMPRESA_EMAIL)}</a></p>
    </div>
  `;

  return enviarCorreo({
    to: preingreso.cliente_email,
    subject,
    text,
    html
  });
}

async function enviarCorreoOrden(orden) {
  const subject = `Ingreso registrado ${orden.numero_orden} - ${EMPRESA_NOMBRE}`;
  const text = [
    `Hola ${orden.cliente_contacto_nombre || orden.cliente_nombre || ''},`,
    '',
    `Registramos el ingreso de tu equipo en ${EMPRESA_NOMBRE}.`,
    '',
    datosEquipoOrden(orden),
    '',
    'Puedes hacer seguimiento con tu numero de orden:',
    `${orden.numero_orden}`,
    '',
    'Recepcion y entrega en:',
    `${EMPRESA_DIRECCION}`,
    `${EMPRESA_MAPA_URL}`,
    '',
    `Contacto: ${EMPRESA_EMAIL}`
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#10263c;line-height:1.5">
      <h2 style="margin:0 0 12px">${EMPRESA_NOMBRE}</h2>
      <p>Hola ${escapeHtml(orden.cliente_contacto_nombre || orden.cliente_nombre || '')},</p>
      <p>Tu equipo fue recepcionado correctamente. Conserva este numero de orden para seguimiento:</p>
      <p style="font-size:20px;font-weight:700;color:#1b93f4">${escapeHtml(orden.numero_orden)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;margin:16px 0">
        ${filaHtml('Empresa / cliente', orden.cliente_nombre)}
        ${filaHtml('Contacto', orden.cliente_contacto_nombre)}
        ${filaHtml('RUT', orden.cliente_rut)}
        ${filaHtml('Correo', orden.cliente_email)}
        ${filaHtml('Tipo de equipo', orden.tipo_equipo)}
        ${filaHtml('Marca', orden.marca)}
        ${filaHtml('Modelo', orden.modelo)}
        ${filaHtml('Numero de serie', orden.numero_serie)}
        ${filaHtml('Motivo del ingreso', orden.falla_reportada)}
        ${filaHtml('Observaciones', orden.observaciones_ingreso)}
      </table>
      <p><strong>Direccion de recepcion:</strong><br>${escapeHtml(EMPRESA_DIRECCION)}</p>
      <p><a href="${escapeHtml(EMPRESA_MAPA_URL)}">Ver mapa para llegar</a></p>
      <p>Contacto: <a href="mailto:${escapeHtml(EMPRESA_EMAIL)}">${escapeHtml(EMPRESA_EMAIL)}</a></p>
    </div>
  `;

  return enviarCorreo({
    to: orden.cliente_email,
    subject,
    text,
    html
  });
}

async function enviarCorreoOrdenListaEntrega(orden) {
  const subject = `Equipo listo para entrega ${orden.numero_orden} - ${EMPRESA_NOMBRE}`;
  const estadoTexto = orden.estado === 'no_reparable'
    ? 'Tu equipo ya esta disponible para retiro y cierre de servicio.'
    : 'Tu equipo ya esta listo para retiro.';
  const text = [
    `Hola ${orden.cliente_contacto_nombre || orden.cliente_nombre || ''},`,
    '',
    estadoTexto,
    '',
    datosEquipoOrden(orden),
    '',
    'Puedes retirarlo en:',
    `${EMPRESA_DIRECCION}`,
    `${EMPRESA_MAPA_URL}`,
    '',
    `Numero de orden: ${orden.numero_orden}`,
    '',
    `Contacto: ${EMPRESA_EMAIL}`
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#10263c;line-height:1.5">
      <h2 style="margin:0 0 12px">${EMPRESA_NOMBRE}</h2>
      <p>Hola ${escapeHtml(orden.cliente_contacto_nombre || orden.cliente_nombre || '')},</p>
      <p>${escapeHtml(estadoTexto)}</p>
      <p style="font-size:20px;font-weight:700;color:#1b93f4">${escapeHtml(orden.numero_orden)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;margin:16px 0">
        ${filaHtml('Empresa / cliente', orden.cliente_nombre)}
        ${filaHtml('Contacto', orden.cliente_contacto_nombre)}
        ${filaHtml('RUT', orden.cliente_rut)}
        ${filaHtml('Correo', orden.cliente_email)}
        ${filaHtml('Tipo de equipo', orden.tipo_equipo)}
        ${filaHtml('Marca', orden.marca)}
        ${filaHtml('Modelo', orden.modelo)}
        ${filaHtml('Numero de serie', orden.numero_serie)}
        ${filaHtml('Estado actual', orden.estado === 'no_reparable' ? 'No reparable - listo para retiro' : 'Reparado - listo para retiro')}
      </table>
      <p><strong>Direccion de retiro:</strong><br>${escapeHtml(EMPRESA_DIRECCION)}</p>
      <p><a href="${escapeHtml(EMPRESA_MAPA_URL)}">Ver mapa para llegar</a></p>
      <p>Contacto: <a href="mailto:${escapeHtml(EMPRESA_EMAIL)}">${escapeHtml(EMPRESA_EMAIL)}</a></p>
    </div>
  `;

  return enviarCorreo({
    to: orden.cliente_email,
    subject,
    text,
    html
  });
}

async function enviarTelegram(preingreso) {
  const config = obtenerConfigNotificaciones();
  if (!config.telegramBotToken || !config.telegramChatId) {
    return { ok: false, estado: 'omitido', detalle: 'No hay configuracion de Telegram activa.' };
  }

  const mensaje = [
    'Nuevo preingreso recibido',
    `Codigo: ${preingreso.codigo_servicio}`,
    `Cliente: ${preingreso.cliente_nombre || '-'}`,
    `RUT: ${preingreso.cliente_rut || '-'}`,
    `Equipo: ${[preingreso.tipo_equipo, preingreso.marca, preingreso.modelo].filter(Boolean).join(' / ') || '-'}`,
    `Serie: ${preingreso.numero_serie || '-'}`,
    `Motivo: ${preingreso.falla_reportada || '-'}`,
    `Direccion recepcion: ${EMPRESA_DIRECCION}`
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text: mensaje
    })
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`No se pudo enviar alerta a Telegram: ${detalle}`);
  }

  return { ok: true, estado: 'enviado', detalle: 'Alerta enviada correctamente a Telegram.' };
}

function registrarResultado({ entidad_tipo, entidad_id, canal, evento, destinatario, asunto }, resultado) {
  return NotificacionLog.registrar({
    entidad_tipo,
    entidad_id,
    canal,
    evento,
    destinatario,
    asunto,
    estado: resultado.estado,
    detalle: resultado.detalle
  });
}

async function ejecutarNotificacion({ entidad_tipo, entidad_id, canal, evento, destinatario, asunto, ejecutor }) {
  try {
    const resultado = await ejecutor();
    registrarResultado({ entidad_tipo, entidad_id, canal, evento, destinatario, asunto }, resultado);
    return resultado;
  } catch (error) {
    const resultado = {
      ok: false,
      estado: 'fallido',
      detalle: error?.message || 'Fallo desconocido al enviar notificacion.'
    };
    registrarResultado({ entidad_tipo, entidad_id, canal, evento, destinatario, asunto }, resultado);
    return resultado;
  }
}

async function notificarPreingresoEnviado(preingreso) {
  const asunto = `Preingreso recibido ${preingreso.codigo_servicio} - ${EMPRESA_NOMBRE}`;
  return Promise.all([
    ejecutarNotificacion({
      entidad_tipo: 'preingreso',
      entidad_id: preingreso.id,
      canal: 'email',
      evento: 'preingreso_enviado',
      destinatario: preingreso.cliente_email,
      asunto,
      ejecutor: () => enviarCorreoCliente(preingreso)
    }),
    ejecutarNotificacion({
      entidad_tipo: 'preingreso',
      entidad_id: preingreso.id,
      canal: 'telegram',
      evento: 'preingreso_enviado',
      destinatario: null,
      asunto: `Nuevo preingreso ${preingreso.codigo_servicio}`,
      ejecutor: () => enviarTelegram(preingreso)
    })
  ]);
}

async function notificarIngresoCreado(orden) {
  const asunto = `Ingreso registrado ${orden.numero_orden} - ${EMPRESA_NOMBRE}`;
  return ejecutarNotificacion({
    entidad_tipo: 'orden',
    entidad_id: orden.id,
    canal: 'email',
    evento: 'ingreso_creado',
    destinatario: orden.cliente_email,
    asunto,
    ejecutor: () => enviarCorreoOrden(orden)
  });
}

async function notificarOrdenListaEntrega(orden) {
  const asunto = `Equipo listo para entrega ${orden.numero_orden} - ${EMPRESA_NOMBRE}`;
  return ejecutarNotificacion({
    entidad_tipo: 'orden',
    entidad_id: orden.id,
    canal: 'email',
    evento: 'orden_lista_entrega',
    destinatario: orden.cliente_email,
    asunto,
    ejecutor: () => enviarCorreoOrdenListaEntrega(orden)
  });
}

async function reenviarCorreoPreingreso(preingreso) {
  const asunto = `Preingreso recibido ${preingreso.codigo_servicio} - ${EMPRESA_NOMBRE}`;
  return ejecutarNotificacion({
    entidad_tipo: 'preingreso',
    entidad_id: preingreso.id,
    canal: 'email',
    evento: 'preingreso_reenviado',
    destinatario: preingreso.cliente_email,
    asunto,
    ejecutor: () => enviarCorreoCliente(preingreso)
  });
}

async function reenviarCorreoOrden(orden) {
  const listoEntrega = ['reparado', 'no_reparable'].includes(orden.estado);
  const asunto = listoEntrega
    ? `Equipo listo para entrega ${orden.numero_orden} - ${EMPRESA_NOMBRE}`
    : `Ingreso registrado ${orden.numero_orden} - ${EMPRESA_NOMBRE}`;
  return ejecutarNotificacion({
    entidad_tipo: 'orden',
    entidad_id: orden.id,
    canal: 'email',
    evento: listoEntrega ? 'orden_lista_entrega_reenviada' : 'orden_reenviada',
    destinatario: orden.cliente_email,
    asunto,
    ejecutor: () => (listoEntrega ? enviarCorreoOrdenListaEntrega(orden) : enviarCorreoOrden(orden))
  });
}

function filaHtml(etiqueta, valor) {
  return `
    <tr>
      <td style="padding:8px 10px;border:1px solid #d7e1eb;background:#f7fafc;font-weight:700;width:180px">${escapeHtml(etiqueta)}</td>
      <td style="padding:8px 10px;border:1px solid #d7e1eb">${escapeHtml(valor || '-')}</td>
    </tr>
  `;
}

function escapeHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  notificarPreingresoEnviado,
  notificarIngresoCreado,
  notificarOrdenListaEntrega,
  reenviarCorreoPreingreso,
  reenviarCorreoOrden
};
