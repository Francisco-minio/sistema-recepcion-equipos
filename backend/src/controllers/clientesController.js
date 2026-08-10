const Cliente = require('../models/Cliente');

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
      contacto_nombre, contacto_cargo, telefono, email, direccion, notas
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
      contacto_nombre, contacto_cargo, telefono, email, direccion, notas
    });
    res.status(201).json(cliente);
  },

  actualizar(req, res) {
    const existente = Cliente.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const {
      nombre, tipo_cliente, razon_social, giro,
      contacto_nombre, contacto_cargo, telefono, email, direccion, notas
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
      notas: notas ?? existente.notas
    });
    res.json(actualizado);
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
