/**
 * Generador de enlaces de WhatsApp para notificar a clientes de servicio tecnico.
 */

export function limpiarTelefonoChile(telefono) {
  if (!telefono) return '';
  let digitos = String(telefono).replace(/\D/g, '');
  if (!digitos) return '';

  // Si no incluye el codigo de pais 56 pero tiene 9 digitos (ej. 912345678), agregar 56
  if (digitos.length === 9 && digitos.startsWith('9')) {
    digitos = `56${digitos}`;
  } else if (digitos.length === 8) {
    digitos = `569${digitos}`;
  }
  return digitos;
}

export function construirMensajeWhatsApp({
  tipo = 'listo_retiro',
  clienteNombre = '',
  numeroOrden = '',
  equipo = '',
  monto = null
}) {
  const nombreLimpio = clienteNombre ? clienteNombre.split(' ')[0] : 'Estimado/a cliente';
  const equipoTexto = equipo || 'equipo';
  const ordenTexto = numeroOrden || '';
  const urlConsulta = `${window.location.origin}/consulta?numero=${encodeURIComponent(ordenTexto)}`;

  switch (tipo) {
    case 'ingreso':
      return `Hola ${nombreLimpio}, confirmamos la recepción de su ${equipoTexto} (Orden #${ordenTexto}) en nuestro servicio técnico. Puede realizar el seguimiento de su equipo aquí: ${urlConsulta}`;

    case 'listo_retiro':
      return `Hola ${nombreLimpio}, le informamos que su ${equipoTexto} (Orden #${ordenTexto}) se encuentra *LISTO PARA RETIRO* en nuestro servicio técnico. ¡Le esperamos! Seguimiento: ${urlConsulta}`;

    case 'presupuesto':
      return `Hola ${nombreLimpio}, tenemos el diagnóstico para su ${equipoTexto} (Orden #${ordenTexto}). ${monto ? `El valor estimado es de $${Number(monto).toLocaleString('es-CL')}.` : ''} Por favor indíquenos si aprueba para proceder. Ver detalle: ${urlConsulta}`;

    case 'recordatorio':
      return `Hola ${nombreLimpio}, le recordamos que su ${equipoTexto} (Orden #${ordenTexto}) está listo para ser retirado en nuestra sucursal. Horario de atención disponible.`;

    default:
      return `Hola ${nombreLimpio}, le escribimos de servicio técnico sobre su orden #${ordenTexto}.`;
  }
}

export function enviarWhatsAppCliente({
  telefono,
  tipo = 'listo_retiro',
  clienteNombre = '',
  numeroOrden = '',
  equipo = '',
  monto = null
}) {
  const telefonoFormateado = limpiarTelefonoChile(telefono);
  if (!telefonoFormateado) {
    alert('El cliente no tiene un número de teléfono válido registrado.');
    return false;
  }

  const mensaje = construirMensajeWhatsApp({ tipo, clienteNombre, numeroOrden, equipo, monto });
  const url = `https://api.whatsapp.com/send?phone=${telefonoFormateado}&text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
