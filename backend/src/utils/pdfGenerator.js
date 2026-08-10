const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const EMPRESA = {
  nombre: process.env.EMPRESA_NOMBRE || 'Backupcode SPA',
  rut: process.env.EMPRESA_RUT || '',
  direccion: process.env.EMPRESA_DIRECCION || '',
  telefono: process.env.EMPRESA_TELEFONO || '',
  email: process.env.EMPRESA_EMAIL || ''
};

const COLOR = {
  primario: '#123B5D',
  secundario: '#4C6A85',
  linea: '#D8E0E8',
  fondo: '#F5F8FB',
  texto: '#1F2D3A',
  tenue: '#6A7B88'
};

const MARGIN_X = 40;
const CONTENT_WIDTH = 515;
const PAGE_BOTTOM = 760;
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'backupcode-guide-logo.jpg');

async function dibujarQRConsulta(doc, orden) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trackingUrl = `${frontendUrl}/consulta?numero=${encodeURIComponent(orden.numero_orden)}&rut=${encodeURIComponent(orden.cliente_rut || '')}`;
    const qrBuffer = await QRCode.toBuffer(trackingUrl, { width: 90, margin: 1 });

    asegurarEspacio(doc, 76);
    const y = doc.y;
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 64, 8).fillAndStroke('#F0F7FF', '#CCE3FC');
    doc.image(qrBuffer, MARGIN_X + 10, y + 7, { width: 50, height: 50 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.primario).text('Consulta de Estado en Línea', MARGIN_X + 70, y + 12);
    doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.texto).text(
      'Escanee este código QR con su teléfono móvil o ingrese a nuestra plataforma para revisar el avance de su equipo en tiempo real.',
      MARGIN_X + 70,
      y + 28,
      { width: 425 }
    );
    doc.y = y + 72;
  } catch (e) {
    // Si falla el QR, el PDF continua normalmente
  }
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return '-';
  const d = new Date(fechaISO);
  return d.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

function textoEstado(estado) {
  const etiquetas = {
    ingresado: 'Ingresado',
    en_diagnostico: 'En diagnostico',
    en_reparacion: 'En reparacion',
    esperando_aprobacion: 'Esperando aprobacion',
    reparado: 'Reparado',
    no_reparable: 'No reparable',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
  };
  return etiquetas[estado] || estado || '-';
}

function formatearMoneda(valor) {
  if (valor === null || valor === undefined || valor === '') return 'No aplica';
  return `$${Number(valor).toLocaleString('es-CL')}`;
}

function textoCorto(texto, max = 280) {
  if (!texto) return '-';
  const limpio = String(texto).replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1)}…`;
}

function asegurarEspacio(doc, altoNecesario) {
  if (doc.y + altoNecesario <= PAGE_BOTTOM) return;
  doc.addPage();
  doc.y = 46;
}

function crearDocumento() {
  return new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
}

function dibujarEncabezado(doc, titulo, numeroOrden, subtitulo) {
  const y = 28;
  const alto = 78;

  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, alto, 10).fill(COLOR.primario);
  doc.roundedRect(MARGIN_X + 14, y + 10, 84, 58, 12).fill('#FFFFFF');
  doc.roundedRect(MARGIN_X + 300, y + 12, 195, 52, 10).fill('#1B4A71');

  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, MARGIN_X + 20, y + 14, { fit: [72, 50], align: 'center', valign: 'center' });
    } catch (err) {
      // Si la imagen falla, el resto del encabezado sigue funcionando.
    }
  }

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text(EMPRESA.nombre, MARGIN_X + 112, y + 12, {
    width: 255,
    lineBreak: false
  });

  if (EMPRESA.email || EMPRESA.direccion) {
    doc.font('Helvetica').fontSize(8.1).fillColor('#D8E7F3').text(
      [EMPRESA.email, EMPRESA.direccion].filter(Boolean).join('  |  '),
      MARGIN_X + 112,
      y + 37,
      { width: 184 }
    );
  }

  doc.font('Helvetica-Bold').fontSize(12.5).fillColor('#FFFFFF').text(titulo, MARGIN_X + 312, y + 17, {
    width: 172,
    align: 'right'
  });
  doc.font('Helvetica').fontSize(8.2).fillColor('#D8E7F3').text(subtitulo, MARGIN_X + 312, y + 42, {
    width: 172,
    align: 'right'
  });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text(`Orden ${numeroOrden}`, MARGIN_X + 312, y + 56, {
    width: 172,
    align: 'right'
  });

  doc.y = 120;
}

function dibujarResumen(doc, orden, tipoDocumento) {
  asegurarEspacio(doc, 58);
  const y = doc.y;

  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 48, 8).fill(COLOR.fondo);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.tenue).text('CLIENTE', MARGIN_X + 14, y + 8);
  doc.text('FECHA', MARGIN_X + 235, y + 8);
  doc.text('ESTADO', MARGIN_X + 385, y + 8);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto).text(textoCorto(orden.cliente_nombre, 34), MARGIN_X + 14, y + 20, { width: 200 });
  doc.font('Helvetica').fontSize(8.2).fillColor(COLOR.tenue).text(
    textoCorto(orden.cliente_contacto_nombre || orden.cliente_email || orden.cliente_telefono || '-', 40),
    MARGIN_X + 14,
    y + 33,
    { width: 200 }
  );
  doc.text(
    formatearFecha(tipoDocumento === 'ingreso' ? (orden.firma_ingreso_fecha || orden.creado_en) : orden.firma_entrega_fecha),
    MARGIN_X + 235,
    y + 20,
    { width: 135 }
  );
  doc.text(textoEstado(orden.estado), MARGIN_X + 385, y + 20, { width: 120 });

  doc.y = y + 60;
}

function dibujarTituloSeccion(doc, texto) {
  asegurarEspacio(doc, 30);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.primario).text(texto, MARGIN_X, doc.y);
  const lineY = doc.y + 4;
  doc.moveTo(MARGIN_X, lineY).lineTo(MARGIN_X + CONTENT_WIDTH, lineY).strokeColor(COLOR.linea).lineWidth(1).stroke();
  doc.moveDown(0.6);
}

function filaSimple(doc, etiqueta, valor) {
  const texto = textoCorto(valor, 180);
  const alto = Math.max(
    doc.heightOfString(`${etiqueta}:`, { width: 130 }),
    doc.heightOfString(texto, { width: 370 })
  ) + 4;

  asegurarEspacio(doc, alto + 4);
  const y = doc.y;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.tenue).text(`${etiqueta}:`, MARGIN_X, y, { width: 130 });
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(texto, MARGIN_X + 130, y, {
    width: 385
  });

  doc.y = y + alto;
}

function bloqueTexto(doc, etiqueta, valor, max = 420) {
  const texto = textoCorto(valor, max);
  const altoTexto = doc.heightOfString(texto, { width: CONTENT_WIDTH - 20, align: 'left' });
  const alto = Math.max(42, altoTexto + 22);

  asegurarEspacio(doc, alto + 8);
  const y = doc.y;

  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, alto, 8).fillAndStroke('#FFFFFF', COLOR.linea);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.tenue).text(etiqueta, MARGIN_X + 10, y + 8);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(texto, MARGIN_X + 10, y + 20, {
    width: CONTENT_WIDTH - 20
  });

  doc.y = y + alto + 8;
}

function dibujarDosColumnas(doc, items) {
  const leftX = MARGIN_X;
  const rightX = MARGIN_X + 265;
  const boxWidth = 250;

  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    const leftText = textoCorto(left.valor, 60);
    const rightText = right ? textoCorto(right.valor, 60) : '';

    const leftHeight = 34 + doc.heightOfString(leftText, { width: boxWidth - 18 });
    const rightHeight = right ? 34 + doc.heightOfString(rightText, { width: boxWidth - 18 }) : leftHeight;
    const boxHeight = Math.max(48, leftHeight, rightHeight);

    asegurarEspacio(doc, boxHeight + 8);
    const y = doc.y;

    dibujarTarjetaCampo(doc, leftX, y, boxWidth, boxHeight, left.etiqueta, leftText);
    if (right) dibujarTarjetaCampo(doc, rightX, y, boxWidth, boxHeight, right.etiqueta, rightText);

    doc.y = y + boxHeight + 8;
  }
}

function dibujarTarjetaCampo(doc, x, y, width, height, etiqueta, valor) {
  doc.roundedRect(x, y, width, height, 8).fill(COLOR.fondo);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.tenue).text(etiqueta, x + 10, y + 8, { width: width - 20 });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.texto).text(valor, x + 10, y + 22, { width: width - 20 });
}

function dibujarFirma(doc, { titulo, nombre, rut, fechaISO, firmaDataUrl }) {
  asegurarEspacio(doc, 140);
  const y = doc.y;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.primario).text(titulo, MARGIN_X, y);

  const sigY = y + 18;
  doc.roundedRect(MARGIN_X, sigY, 260, 78, 8).strokeColor(COLOR.linea).stroke();
  doc.moveTo(MARGIN_X + 14, sigY + 88).lineTo(MARGIN_X + 246, sigY + 88).strokeColor(COLOR.linea).stroke();

  if (firmaDataUrl) {
    try {
      const base64Data = firmaDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      doc.image(buffer, MARGIN_X + 8, sigY + 6, { fit: [244, 64], align: 'center', valign: 'center' });
    } catch (e) {
      doc.font('Helvetica').fontSize(8).fillColor('#AA3B3B').text('No se pudo cargar la firma.', MARGIN_X + 10, sigY + 30);
    }
  }

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.tenue).text('Firmante', 330, sigY + 6);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(textoCorto(nombre, 50), 330, sigY + 18, { width: 200 });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.tenue).text('RUT', 330, sigY + 42);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(textoCorto(rut, 24), 330, sigY + 54, { width: 200 });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.tenue).text('Fecha', 330, sigY + 78);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(formatearFecha(fechaISO), 330, sigY + 90, { width: 200 });

  doc.y = sigY + 114;
}

function dibujarCondiciones(doc, texto) {
  dibujarTituloSeccion(doc, 'Condiciones');
  bloqueTexto(doc, 'Resumen legal', texto, 320);
}

function dibujarGaleriaFotos(doc, titulo, fotos = []) {
  if (!fotos.length) return;

  dibujarTituloSeccion(doc, titulo);
  const ancho = 248;
  const alto = 150;

  for (let i = 0; i < fotos.length; i += 2) {
    asegurarEspacio(doc, alto + 28);
    const y = doc.y;
    const lote = fotos.slice(i, i + 2);

    lote.forEach((foto, indice) => {
      const x = MARGIN_X + (indice * 267);
      const ruta = path.join(UPLOADS_DIR, foto.ruta_archivo || '');

      doc.roundedRect(x, y, ancho, alto, 8).fillAndStroke('#FFFFFF', COLOR.linea);
      if (fs.existsSync(ruta)) {
        try {
          doc.image(ruta, x + 8, y + 8, { fit: [ancho - 16, alto - 34], align: 'center', valign: 'center' });
        } catch (err) {
          doc.font('Helvetica').fontSize(8).fillColor('#AA3B3B').text('No se pudo cargar la imagen.', x + 10, y + 62, { width: ancho - 20, align: 'center' });
        }
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.tenue).text('Archivo no disponible.', x + 10, y + 62, { width: ancho - 20, align: 'center' });
      }

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.tenue).text(
        textoCorto(foto.nombre_original || `Foto ${foto.id}`, 38),
        x + 10,
        y + alto - 18,
        { width: ancho - 20 }
      );
    });

    doc.y = y + alto + 10;
  }
}

function agregarPiePagina(doc) {
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 70;
    const infoEmpresa = textoCorto(
      `${EMPRESA.nombre}${EMPRESA.direccion ? ` | ${EMPRESA.direccion}` : ''}`,
      82
    );

    doc.moveTo(MARGIN_X, y).lineTo(MARGIN_X + CONTENT_WIDTH, y).strokeColor(COLOR.linea).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.tenue).text(
      infoEmpresa,
      MARGIN_X,
      y + 6,
      { width: 350, lineBreak: false }
    );
    doc.text(`Pagina ${i + 1} de ${rango.count}`, MARGIN_X + 370, y + 6, {
      width: 145,
      align: 'right',
      lineBreak: false
    });
  }
}

function generarComprobanteIngreso(orden) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = crearDocumento();
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      dibujarEncabezado(doc, 'COMPROBANTE DE INGRESO', orden.numero_orden, 'Recepcion de equipo');
      dibujarResumen(doc, orden, 'ingreso');
      await dibujarQRConsulta(doc, orden);

      dibujarTituloSeccion(doc, 'Cliente');
      dibujarDosColumnas(doc, [
        { etiqueta: 'Empresa', valor: orden.cliente_nombre },
        { etiqueta: 'Contacto', valor: orden.cliente_contacto_nombre || '-' },
        { etiqueta: 'RUT', valor: orden.cliente_rut },
        { etiqueta: 'Razon social', valor: orden.cliente_empresa || '-' }
      ]);
      dibujarDosColumnas(doc, [
        { etiqueta: 'Telefono', valor: orden.cliente_telefono || '-' },
        { etiqueta: 'Email', valor: orden.cliente_email || '-' }
      ]);
      if (orden.cliente_direccion) filaSimple(doc, 'Direccion', orden.cliente_direccion);

      dibujarTituloSeccion(doc, 'Equipo');
      dibujarDosColumnas(doc, [
        { etiqueta: 'Tipo', valor: orden.tipo_equipo },
        { etiqueta: 'Marca / Modelo', valor: [orden.marca, orden.modelo].filter(Boolean).join(' / ') || '-' },
        { etiqueta: 'N° de serie', valor: orden.numero_serie || '-' },
        { etiqueta: 'Color', valor: orden.color || '-' },
        { etiqueta: 'Accesorios', valor: orden.accesorios?.length ? orden.accesorios.join(', ') : 'Ninguno' },
        { etiqueta: 'Clave de acceso', valor: orden.clave_acceso_entregada ? 'Entregada y resguardada' : 'No proporcionada' }
      ]);

      dibujarTituloSeccion(doc, 'Detalle');
      bloqueTexto(doc, 'Falla reportada', orden.falla_reportada, 320);
      if (orden.estado_fisico) bloqueTexto(doc, 'Estado fisico', orden.estado_fisico, 220);
      if (orden.observaciones_ingreso) bloqueTexto(doc, 'Observaciones', orden.observaciones_ingreso, 220);
      filaSimple(doc, 'Recibido por', orden.usuario_recibe_nombre || '-');
      filaSimple(doc, 'Fecha de ingreso', formatearFecha(orden.firma_ingreso_fecha || orden.creado_en));
      dibujarGaleriaFotos(doc, 'Registro fotografico de ingreso', (orden.fotos || []).filter((foto) => foto.tipo === 'ingreso').slice(0, 6));

      dibujarCondiciones(
        doc,
        'El cliente confirma que los datos del equipo y accesorios son correctos. Backupcode SPA recomienda respaldo previo y no responde por perdida de informacion durante revision, mantencion o reparacion.'
      );

      dibujarTituloSeccion(doc, 'Conformidad del cliente');
      dibujarFirma(doc, {
        titulo: 'Firma de recepcion',
        nombre: orden.firma_ingreso_nombre,
        rut: orden.firma_ingreso_rut,
        fechaISO: orden.firma_ingreso_fecha,
        firmaDataUrl: orden.firma_ingreso_data
      });

      agregarPiePagina(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function generarComprobanteEntrega(orden) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = crearDocumento();
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      dibujarEncabezado(doc, 'COMPROBANTE DE ENTREGA', orden.numero_orden, 'Entrega de equipo');
      dibujarResumen(doc, orden, 'entrega');
      await dibujarQRConsulta(doc, orden);

      dibujarTituloSeccion(doc, 'Cliente');
      dibujarDosColumnas(doc, [
        { etiqueta: 'Empresa', valor: orden.cliente_nombre },
        { etiqueta: 'Contacto', valor: orden.cliente_contacto_nombre || '-' },
        { etiqueta: 'RUT', valor: orden.cliente_rut },
        { etiqueta: 'Razon social', valor: orden.cliente_empresa || '-' }
      ]);

      dibujarTituloSeccion(doc, 'Equipo');
      dibujarDosColumnas(doc, [
        { etiqueta: 'Tipo', valor: orden.tipo_equipo },
        { etiqueta: 'Marca / Modelo', valor: [orden.marca, orden.modelo].filter(Boolean).join(' / ') || '-' },
        { etiqueta: 'N° de serie', valor: orden.numero_serie || '-' },
        { etiqueta: 'Estado final', valor: textoEstado(orden.estado) }
      ]);

      dibujarTituloSeccion(doc, 'Resultado del servicio');
      filaSimple(doc, 'Tecnico asignado', orden.tecnico_asignado_nombre || 'Sin asignar');
      filaSimple(doc, 'Presupuesto', formatearMoneda(orden.presupuesto_monto));
      bloqueTexto(doc, 'Diagnostico tecnico', orden.diagnostico || 'Sin diagnostico registrado.', 340);
      if (orden.observaciones_entrega) bloqueTexto(doc, 'Observaciones de entrega', orden.observaciones_entrega, 220);
      filaSimple(doc, 'Fecha de entrega', formatearFecha(orden.firma_entrega_fecha));
      filaSimple(doc, 'Entregado por', orden.usuario_entrega_nombre || '-');
      dibujarGaleriaFotos(doc, 'Fotos de diagnostico', (orden.fotos || []).filter((foto) => foto.tipo === 'diagnostico').slice(0, 6));
      dibujarGaleriaFotos(doc, 'Fotos de entrega', (orden.fotos || []).filter((foto) => foto.tipo === 'entrega').slice(0, 6));

      dibujarCondiciones(
        doc,
        'El cliente declara recibir el equipo conforme al estado informado por Backupcode SPA. Cualquier garantia posterior se rige por las condiciones comunicadas durante el servicio.'
      );

      dibujarTituloSeccion(doc, 'Conformidad del cliente');
      dibujarFirma(doc, {
        titulo: 'Firma de entrega',
        nombre: orden.firma_entrega_nombre,
        rut: orden.firma_entrega_rut,
        fechaISO: orden.firma_entrega_fecha,
        firmaDataUrl: orden.firma_entrega_data
      });

      agregarPiePagina(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generarComprobanteIngreso, generarComprobanteEntrega };
