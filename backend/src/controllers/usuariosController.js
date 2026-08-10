const Usuario = require('../models/Usuario');

const usuariosController = {
  listar(req, res) {
    res.json(Usuario.listarTodos());
  },

  listarTecnicos(req, res) {
    res.json(Usuario.listarTecnicos());
  },

  listarTecnicosDetalle(req, res) {
    res.json(Usuario.listarTecnicosDetalle());
  },

  crear(req, res) {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contrasena son requeridos.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });
    }
    if (Usuario.buscarPorEmail(email)) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    const usuario = Usuario.crear({ nombre, email, password, rol });
    res.status(201).json(usuario);
  },

  actualizar(req, res) {
    const { id } = req.params;
    const { nombre, rol, activo } = req.body;

    const existente = Usuario.buscarPorId(id);
    if (!existente) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const actualizado = Usuario.actualizar(id, {
      nombre: nombre ?? existente.nombre,
      rol: rol ?? existente.rol,
      activo: activo ?? existente.activo
    });
    res.json(actualizado);
  },

  resetPassword(req, res) {
    const { id } = req.params;
    const { passwordNueva } = req.body;

    if (!passwordNueva || passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres.' });
    }

    const existente = Usuario.buscarPorId(id);
    if (!existente) return res.status(404).json({ error: 'Usuario no encontrado.' });

    Usuario.cambiarPassword(id, passwordNueva);
    res.json({ mensaje: 'Contrasena restablecida correctamente.' });
  }
};

module.exports = usuariosController;
