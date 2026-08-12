const Cliente = require('../models/Cliente');
const { parseDelimitedText } = require('../utils/delimitedParser');

const CAMPOS_IMPORTACION = [
  'nombre',
  'rut',
  'razon_social',
  'giro',
  'contacto_nombre',
  'contacto_cargo',
  'telefono',
  'email',
  'direccion',
  'notas'
];

const clientesController = {
  listar(req, res) {
    const { busqueda, limit, offset, tipo_cliente } = req.query;
    if (busqueda) {
      const resultados = Cliente.buscar(busqueda);
      return res.json(
        tipo_cliente
          ? resultados.filter((cliente) => (cliente.tipo_cliente || 'empresa') === tipo_cliente)
          : resultados
      );
    }
    res.json(Cliente.listarTodos({
      tipo_cliente,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    }));
  },

  obtener(req, res) {
    const cliente = Cliente.buscarPorId(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(cliente);
  },

  crear(req, res) {
    const {
      nombre, rut, tipo_cliente, razon_social, giro,
      contacto_nombre, contacto_cargo, telefono, email, direccion, notas, correos
    } = req.body;
    if (!nombre || !rut) {
      return res.status(400).json({ error: 'Nombre y RUT son requeridos.' });
    }
    if (Cliente.buscarPorRut(rut)) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese RUT.' });
    }
    if ((tipo_cliente || 'empresa') === 'empresa') {
      const duplicada = Cliente.buscarEmpresaPorNombreExacto(nombre);
      if (duplicada) {
        return res.status(409).json({ error: 'Ya existe una empresa con ese nombre.' });
      }
    }
    const cliente = Cliente.crear({
      nombre, rut, tipo_cliente, razon_social, giro,
      contacto_nombre, contacto_cargo, telefono, email, direccion, notas, correos
    });
    res.status(201).json(cliente);
  },

  importar(req, res) {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Debes adjuntar un archivo CSV.' });
    }

    const { headers, rows } = parseDelimitedText(req.file.buffer.toString('utf8'));
    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: 'El archivo no contiene filas para importar.' });
    }

    if (!headers.includes('nombre') || !headers.includes('rut')) {
      return res.status(400).json({ error: 'El CSV debe incluir las columnas nombre y rut.' });
    }

    const errores = [];
    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;

    rows.forEach((fila) => {
      const nombre = fila.nombre?.trim();
      const rut = fila.rut?.trim();

      if (!nombre || !rut) {
        errores.push(`Linea ${fila.__linea}: nombre y rut son obligatorios.`);
        omitidos += 1;
        return;
      }

      const payload = {
        nombre,
        rut,
        tipo_cliente: 'empresa',
        razon_social: fila.razon_social || null,
        giro: fila.giro || null,
        contacto_nombre: fila.contacto_nombre || null,
        contacto_cargo: fila.contacto_cargo || null,
        telefono: fila.telefono || null,
        email: fila.email || null,
        direccion: fila.direccion || null,
        notas: fila.notas || null
      };

      try {
        const existente = Cliente.buscarPorRut(rut);
        if (existente) {
          Cliente.actualizar(existente.id, {
            nombre: payload.nombre,
            tipo_cliente: payload.tipo_cliente,
            razon_social: payload.razon_social,
            giro: payload.giro,
            contacto_nombre: payload.contacto_nombre,
            contacto_cargo: payload.contacto_cargo,
            telefono: payload.telefono,
            email: payload.email,
            direccion: payload.direccion,
            notas: payload.notas
          });
          actualizados += 1;
          return;
        }

        const duplicada = Cliente.buscarEmpresaPorNombreExacto(nombre);
        if (duplicada) {
          Cliente.actualizar(duplicada.id, {
            nombre: payload.nombre,
            tipo_cliente: payload.tipo_cliente,
            razon_social: payload.razon_social,
            giro: payload.giro,
            contacto_nombre: payload.contacto_nombre,
            contacto_cargo: payload.contacto_cargo,
            telefono: payload.telefono,
            email: payload.email,
            direccion: payload.direccion,
            notas: payload.notas
          });
          actualizados += 1;
          return;
        }

        Cliente.crear(payload);
        creados += 1;
      } catch (error) {
        errores.push(`Linea ${fila.__linea}: ${error.message}`);
        omitidos += 1;
      }
    });

    res.json({
      mensaje: 'Importacion procesada.',
      resumen: {
        total_filas: rows.length,
        creados,
        actualizados,
        omitidos,
        columnas_detectadas: headers.filter((header) => CAMPOS_IMPORTACION.includes(header))
      },
      errores
    });
  },

  actualizar(req, res) {
    const existente = Cliente.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const {
      nombre, tipo_cliente, razon_social, giro,
      contacto_nombre, contacto_cargo, telefono, email, direccion, notas, correos
    } = req.body;
    if ((tipo_cliente ?? existente.tipo_cliente ?? 'empresa') === 'empresa') {
      const duplicada = Cliente.buscarEmpresaPorNombreExacto(nombre ?? existente.nombre);
      if (duplicada && duplicada.id !== existente.id) {
        return res.status(409).json({ error: 'Ya existe una empresa con ese nombre.' });
      }
    }
    const actualizado = Cliente.actualizar(req.params.id, {
      nombre: nombre ?? existente.nombre,
      tipo_cliente: tipo_cliente ?? existente.tipo_cliente,
      razon_social: razon_social ?? existente.razon_social,
      giro: giro ?? existente.giro,
      contacto_nombre: contacto_nombre ?? existente.contacto_nombre,
      contacto_cargo: contacto_cargo ?? existente.contacto_cargo,
      telefono: telefono ?? existente.telefono,
      email: email ?? existente.email,
      direccion: direccion ?? existente.direccion,
      notas: notas ?? existente.notas,
      correos: Array.isArray(correos) ? correos : undefined
    });
    res.json(actualizado);
  },

  agregarCorreo(req, res, next) {
    try {
      const cliente = Cliente.buscarPorId(req.params.id);
      if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });

      const email = req.body?.email;
      if (!email || !String(email).trim()) {
        return res.status(400).json({ error: 'Debes indicar un correo valido.' });
      }

      const actualizado = Cliente.agregarCorreo(req.params.id, email);
      res.status(201).json(actualizado);
    } catch (err) {
      next(err);
    }
  },

  eliminar(req, res, next) {
    try {
      const existente = Cliente.buscarPorId(req.params.id);
      if (!existente) return res.status(404).json({ error: 'Cliente no encontrado.' });

      const forzar = String(req.query.forzar || req.body?.forzar || '') === 'true';
      const resultado = Cliente.eliminar(req.params.id, { forzar });
      res.json({
        mensaje: forzar
          ? 'Empresa y registros asociados eliminados correctamente.'
          : 'Empresa eliminada correctamente.',
        ...resultado
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = clientesController;
