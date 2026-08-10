const express = require('express');
const router = express.Router();
const Orden = require('../models/Orden');

/**
 * Endpoint publico para consulta de estado de ordenes de servicio.
 * Accesible por clientes mediante QR o enlace directo sin requerir autenticacion JWT.
 * 
 * Permite buscar por numero_orden y valida RUT para proteger privacidad basica.
 */
router.get('/consulta', (req, res, next) => {
  try {
    const { numero, rut } = req.query;

    if (!numero) {
      return res.status(400).json({ error: 'Debe proporcionar el numero de orden.' });
    }

    const numeroLimpio = String(numero).trim().toUpperCase();
    const orden = Orden.buscarPorNumero(numeroLimpio);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
    }

    // Si se proporciona RUT, se valida para mayor privacidad
    if (rut) {
      const normalizarRut = (r) => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();
      const rutBuscado = normalizarRut(rut);
      const rutCliente = normalizarRut(orden.cliente_rut);

      if (rutBuscado && rutCliente && rutBuscado !== rutCliente) {
        return res.status(403).json({ error: 'El RUT ingresado no coincide con los registros de la orden.' });
      }
    }

    // Retornamos unicamente informacion publica y segura para el cliente
    const ordenPublica = {
      id: orden.id,
      numero_orden: orden.numero_orden,
      estado: orden.estado,
      tipo_equipo: orden.tipo_equipo,
      marca: orden.marca,
      modelo: orden.modelo,
      color: orden.color,
      falla_reportada: orden.falla_reportada,
      accesorios: orden.accesorios || [],
      estado_fisico: orden.estado_fisico,
      diagnostico: orden.diagnostico,
      presupuesto_monto: orden.presupuesto_monto,
      presupuesto_aprobado: orden.presupuesto_aprobado,
      creado_en: orden.creado_en,
      actualizado_en: orden.actualizado_en,
      cliente_nombre: orden.cliente_nombre,
      empresa_orden_nombre: orden.empresa_orden_nombre,
      firma_ingreso_fecha: orden.firma_ingreso_fecha,
      firma_entrega_fecha: orden.firma_entrega_fecha,
      tecnico_asignado_nombre: orden.tecnico_asignado_nombre ? 'Técnico asignado' : 'Pendiente de asignación',
      fotos: (orden.fotos || []).map(f => ({
        id: f.id,
        tipo: f.tipo,
        ruta_archivo: f.ruta_archivo,
        nombre_original: f.nombre_original
      }))
    };

    return res.json(ordenPublica);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
