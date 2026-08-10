require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const clientesRoutes = require('./routes/clientes');
const ordenesRoutes = require('./routes/ordenes');
const preingresosRoutes = require('./routes/preingresos');
const configuracionRoutes = require('./routes/configuracion');
const publicoRoutes = require('./routes/publico');
const manejadorErrores = require('./middleware/errorHandler');
const { carpetaUploads } = require('./middleware/upload');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Middlewares globales ---
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json({ limit: '35mb' })); // incluye firma y hasta 3 fotos en base64 desde moviles
app.use(morgan('dev'));

// Sirve las fotos subidas de forma estatica
app.use('/uploads', express.static(carpetaUploads));

// --- Rutas ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/publico', publicoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/preingresos', preingresosRoutes);
app.use('/api/ordenes', ordenesRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejador de errores (siempre al final)
app.use(manejadorErrores);

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
