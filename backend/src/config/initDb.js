/**
 * Script de inicializacion de la base de datos.
 * Crea todas las tablas necesarias para el sistema si no existen,
 * y crea un usuario administrador por defecto.
 *
 * Ejecutar con: npm run init-db
 */
const db = require('./database');
const bcrypt = require('bcryptjs');
const { cifrarTexto, esTextoCifrado } = require('../utils/secretField');

console.log('Inicializando base de datos...');

function agregarColumnaSiNoExiste(tabla, columna, definicion) {
  const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all();
  const existe = columnas.some((c) => c.name === columna);
  if (!existe) {
    db.prepare(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`).run();
    console.log(`Columna agregada: ${tabla}.${columna}`);
  }
}

db.exec(`
  -- Usuarios del sistema (tecnicos, recepcionistas, administradores)
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'tecnico' CHECK(rol IN ('admin', 'recepcion', 'tecnico')),
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Clientes
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rut TEXT NOT NULL,
    tipo_cliente TEXT NOT NULL DEFAULT 'empresa',
    razon_social TEXT,
    giro TEXT,
    contacto_nombre TEXT,
    contacto_cargo TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    notas TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(rut)
  );

  CREATE TABLE IF NOT EXISTS cliente_correos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(cliente_id, email),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  );

  -- Orden de servicio: el registro central de ingreso/entrega de un equipo
  CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_orden TEXT NOT NULL UNIQUE,
    cliente_id INTEGER NOT NULL,
    usuario_recibe_id INTEGER NOT NULL,
    tecnico_asignado_id INTEGER,

    -- Datos del equipo
    tipo_equipo TEXT NOT NULL CHECK(tipo_equipo IN ('computador', 'notebook', 'impresora', 'otro')),
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    color TEXT,

    -- Detalle del ingreso
    falla_reportada TEXT NOT NULL,
    accesorios TEXT,              -- JSON con lista de accesorios entregados (cargador, mouse, etc)
    estado_fisico TEXT,           -- Descripcion de rayones, golpes, etc al ingresar
    clave_acceso TEXT,            -- Contrasena del equipo/usuario (se guarda cifrada en reposo a nivel de app si se requiere)
    observaciones_ingreso TEXT,

    -- Presupuesto y diagnostico
    diagnostico TEXT,
    presupuesto_monto REAL,
    presupuesto_aprobado INTEGER DEFAULT 0,

    -- Estado del flujo
    estado TEXT NOT NULL DEFAULT 'ingresado'
      CHECK(estado IN ('ingresado', 'en_diagnostico', 'en_reparacion', 'esperando_aprobacion', 'reparado', 'no_reparable', 'entregado', 'cancelado')),

    -- Firma de ingreso (cliente deja el equipo)
    firma_ingreso_nombre TEXT,
    firma_ingreso_rut TEXT,
    firma_ingreso_data TEXT,      -- imagen base64 de la firma
    firma_ingreso_fecha TEXT,

    -- Firma de entrega (cliente retira el equipo)
    firma_entrega_nombre TEXT,
    firma_entrega_rut TEXT,
    firma_entrega_data TEXT,
    firma_entrega_fecha TEXT,
    usuario_entrega_id INTEGER,
    observaciones_entrega TEXT,

    -- Snapshot comercial de la orden para no mutar la ficha maestra
    empresa_orden_nombre TEXT,
    empresa_orden_rut TEXT,
    contacto_orden_nombre TEXT,
    contacto_orden_telefono TEXT,
    contacto_orden_email TEXT,
    contacto_orden_direccion TEXT,
    clave_acceso_entregada INTEGER NOT NULL DEFAULT 0,

    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (usuario_recibe_id) REFERENCES usuarios(id),
    FOREIGN KEY (tecnico_asignado_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_entrega_id) REFERENCES usuarios(id)
  );

  -- Fotos asociadas a una orden (estado del equipo al ingreso, evidencia, etc)
  CREATE TABLE IF NOT EXISTS orden_fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'ingreso' CHECK(tipo IN ('ingreso', 'entrega', 'diagnostico')),
    posicion INTEGER NOT NULL DEFAULT 0,
    ruta_archivo TEXT NOT NULL,
    nombre_original TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
  );

  -- Historial de cambios de estado de una orden (trazabilidad)
  CREATE TABLE IF NOT EXISTS orden_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    usuario_id INTEGER,
    estado_anterior TEXT,
    estado_nuevo TEXT NOT NULL,
    comentario TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS preingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_servicio TEXT NOT NULL UNIQUE,
    token_acceso TEXT NOT NULL UNIQUE,
    creado_por_usuario_id INTEGER NOT NULL,
    orden_id INTEGER,
    estado TEXT NOT NULL DEFAULT 'borrador'
      CHECK(estado IN ('borrador', 'enviado', 'recepcionado', 'cancelado')),
    empresa_id INTEGER,
    empresa_nombre TEXT,
    cliente_nombre TEXT,
    cliente_rut TEXT,
    cliente_telefono TEXT,
    cliente_email TEXT,
    tipo_equipo TEXT DEFAULT 'computador'
      CHECK(tipo_equipo IN ('computador', 'notebook', 'impresora', 'otro')),
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    falla_reportada TEXT,
    observaciones TEXT,
    enviado_en TEXT,
    recepcionado_en TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (orden_id) REFERENCES ordenes(id),
    FOREIGN KEY (empresa_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS configuraciones (
    clave TEXT PRIMARY KEY,
    valor TEXT,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notificacion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entidad_tipo TEXT NOT NULL CHECK(entidad_tipo IN ('preingreso', 'orden')),
    entidad_id INTEGER NOT NULL,
    canal TEXT NOT NULL CHECK(canal IN ('email', 'telegram')),
    evento TEXT NOT NULL,
    destinatario TEXT,
    asunto TEXT,
    estado TEXT NOT NULL CHECK(estado IN ('enviado', 'fallido', 'omitido')),
    detalle TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
  CREATE INDEX IF NOT EXISTS idx_ordenes_numero ON ordenes(numero_orden);
  CREATE INDEX IF NOT EXISTS idx_clientes_rut ON clientes(rut);
  CREATE INDEX IF NOT EXISTS idx_cliente_correos_cliente ON cliente_correos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_cliente_correos_email ON cliente_correos(email);
  CREATE INDEX IF NOT EXISTS idx_preingresos_codigo ON preingresos(codigo_servicio);
  CREATE INDEX IF NOT EXISTS idx_preingresos_token ON preingresos(token_acceso);
  CREATE INDEX IF NOT EXISTS idx_notificacion_logs_entidad ON notificacion_logs(entidad_tipo, entidad_id);
  CREATE INDEX IF NOT EXISTS idx_notificacion_logs_estado ON notificacion_logs(estado);
`);

console.log('Tablas creadas correctamente.');

agregarColumnaSiNoExiste('clientes', 'tipo_cliente', "TEXT NOT NULL DEFAULT 'empresa'");
agregarColumnaSiNoExiste('clientes', 'razon_social', 'TEXT');
agregarColumnaSiNoExiste('clientes', 'giro', 'TEXT');
agregarColumnaSiNoExiste('clientes', 'contacto_nombre', 'TEXT');
agregarColumnaSiNoExiste('clientes', 'contacto_cargo', 'TEXT');
agregarColumnaSiNoExiste('clientes', 'notas', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'empresa_orden_nombre', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'empresa_orden_rut', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'contacto_orden_nombre', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'contacto_orden_telefono', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'contacto_orden_email', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'contacto_orden_direccion', 'TEXT');
agregarColumnaSiNoExiste('ordenes', 'clave_acceso_entregada', 'INTEGER NOT NULL DEFAULT 0');
agregarColumnaSiNoExiste('ordenes', 'usuario_entrega_id', 'INTEGER');
agregarColumnaSiNoExiste('orden_fotos', 'posicion', 'INTEGER NOT NULL DEFAULT 0');
agregarColumnaSiNoExiste('preingresos', 'empresa_id', 'INTEGER');
agregarColumnaSiNoExiste('preingresos', 'empresa_nombre', 'TEXT');

db.prepare(`
  INSERT OR IGNORE INTO cliente_correos (cliente_id, email)
  SELECT id, lower(trim(email))
  FROM clientes
  WHERE email IS NOT NULL
    AND trim(email) <> ''
`).run();

db.prepare(`
  UPDATE ordenes
  SET clave_acceso_entregada = 1
  WHERE clave_acceso IS NOT NULL AND trim(clave_acceso) <> '' AND clave_acceso_entregada = 0
`).run();

const ordenesConClaveLegacy = db.prepare(`
  SELECT id, clave_acceso
  FROM ordenes
  WHERE clave_acceso IS NOT NULL AND trim(clave_acceso) <> ''
`).all();

ordenesConClaveLegacy.forEach((orden) => {
  if (!esTextoCifrado(orden.clave_acceso)) {
    db.prepare('UPDATE ordenes SET clave_acceso = ? WHERE id = ?').run(cifrarTexto(orden.clave_acceso), orden.id);
  }
});

db.prepare(`
  UPDATE ordenes
  SET
    empresa_orden_nombre = COALESCE(empresa_orden_nombre, (SELECT nombre FROM clientes WHERE clientes.id = ordenes.cliente_id)),
    empresa_orden_rut = COALESCE(empresa_orden_rut, (SELECT rut FROM clientes WHERE clientes.id = ordenes.cliente_id)),
    contacto_orden_nombre = COALESCE(contacto_orden_nombre, firma_ingreso_nombre, (SELECT contacto_nombre FROM clientes WHERE clientes.id = ordenes.cliente_id)),
    contacto_orden_telefono = COALESCE(contacto_orden_telefono, (SELECT telefono FROM clientes WHERE clientes.id = ordenes.cliente_id)),
    contacto_orden_email = COALESCE(contacto_orden_email, (SELECT email FROM clientes WHERE clientes.id = ordenes.cliente_id)),
    contacto_orden_direccion = COALESCE(contacto_orden_direccion, (SELECT direccion FROM clientes WHERE clientes.id = ordenes.cliente_id))
  WHERE empresa_orden_nombre IS NULL
    OR empresa_orden_rut IS NULL
    OR contacto_orden_nombre IS NULL
    OR contacto_orden_telefono IS NULL
    OR contacto_orden_email IS NULL
    OR contacto_orden_direccion IS NULL
`).run();

db.prepare(`
  UPDATE ordenes
  SET usuario_entrega_id = (
    SELECT h.usuario_id
    FROM orden_historial h
    WHERE h.orden_id = ordenes.id
      AND h.estado_nuevo = 'entregado'
      AND h.usuario_id IS NOT NULL
    ORDER BY h.creado_en DESC, h.id DESC
    LIMIT 1
  )
  WHERE usuario_entrega_id IS NULL
    AND estado = 'entregado'
`).run();

db.prepare(`
  UPDATE preingresos
  SET token_acceso = 'usado-' || id
  WHERE estado IN ('enviado', 'recepcionado', 'cancelado')
    AND token_acceso IS NOT NULL
    AND token_acceso NOT LIKE 'usado-%'
`).run();

// Crear usuario administrador por defecto si no existe ninguno
const existeAdmin = db.prepare('SELECT id FROM usuarios WHERE rol = ? LIMIT 1').get('admin');

if (!existeAdmin) {
  const passwordPorDefecto = 'admin123';
  const hash = bcrypt.hashSync(passwordPorDefecto, 10);

  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol)
    VALUES (?, ?, ?, ?)
  `).run('Administrador', 'admin@soporte.cl', hash, 'admin');

  console.log('');
  console.log('========================================================');
  console.log(' Usuario administrador creado:');
  console.log('   Email:    admin@soporte.cl');
  console.log(`   Password: ${passwordPorDefecto}`);
  console.log(' >>> IMPORTANTE: cambia esta contrasena despues del primer ingreso <<<');
  console.log('========================================================');
  console.log('');
} else {
  console.log('Ya existe un usuario administrador, no se crea uno nuevo.');
}

console.log('Inicializacion completa.');
