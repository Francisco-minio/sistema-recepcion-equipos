# Sistema de Ingreso y Entrega de Equipos

Aplicacion web para mesas de ayuda y servicios tecnicos. Permite registrar ingresos de equipos, asignar tecnicos, llevar trazabilidad del diagnostico y reparacion, capturar firmas digitales y generar comprobantes PDF de ingreso y entrega.

## Stack

- `backend/`: Node.js + Express + SQLite
- `frontend/`: React + Vite
- Archivos persistentes:
  - Base de datos SQLite
  - Fotos subidas por los usuarios
  - Firmas embebidas en la base de datos

## Funcionalidades principales

- Registro de clientes y ordenes de servicio
- Flujo de estados: ingreso, diagnostico, reparacion y entrega
- Roles de usuario: `admin`, `recepcion`, `tecnico`
- Firma digital del cliente en ingreso y entrega
- Generacion de PDF para comprobantes
- Carga de imagenes asociadas a la orden
- Estadisticas basicas y trazabilidad de cambios

## Estructura

```text
sistema-soporte/
├── backend/             API REST, SQLite, PDFs y uploads
├── frontend/            interfaz React
├── docker-compose.yml   despliegue local/servidor con Docker
├── docker-compose.server.yml despliegue de servidor + Cloudflare Tunnel
└── .env.example         variables para docker compose
```

## Variables de entorno

### Backend

El archivo de ejemplo es [backend/.env.example](/Users/franciscominio/Documents/sistema-soporte/backend/.env.example).

Variables mas importantes:

- `PORT`: puerto del backend
- `JWT_SECRET`: secreto para firmar JWT
- `JWT_EXPIRES_IN`: expiracion del token
- `DATA_ENCRYPTION_KEY`: clave para cifrar datos sensibles como `clave_acceso`
- `DB_PATH`: ruta del archivo SQLite
- `FRONTEND_URL`: origen permitido por CORS
- `EMPRESA_*`: datos impresos en los PDF
- `EMPRESA_MAPA_URL`: enlace del mapa para correos y formulario publico
- `SMTP_*`: configuracion SMTP para enviar correo automatico al cliente
- `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`: alertas internas por Telegram

### Docker Compose

El archivo de ejemplo es [.env.example](/Users/franciscominio/Documents/sistema-soporte/.env.example).

Variables usadas por `docker compose`:

- `BACKEND_PORT`
- `FRONTEND_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `DATA_ENCRYPTION_KEY`
- `EMPRESA_NOMBRE`
- `EMPRESA_RUT`
- `EMPRESA_DIRECCION`
- `EMPRESA_TELEFONO`
- `EMPRESA_EMAIL`
- `EMPRESA_MAPA_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Para despliegue en servidor con tunel, usa tambien [.env.server.example](/Users/franciscominio/Documents/sistema-soporte/.env.server.example).

En esta configuracion del proyecto, los PDF salen identificados como `Backupcode SPA`.

## Desarrollo local sin Docker

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run init-db
npm run dev
```

Backend disponible en `http://localhost:4000`.

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en `http://localhost:5173`.

En desarrollo, Vite hace proxy automatico de `/api` y `/uploads` al backend.

## Despliegue con Docker

### Requisitos

- Docker
- Docker Compose Plugin (`docker compose`)

### Levantar el proyecto

1. Crear el archivo de variables del despliegue:

```bash
cp .env.example .env
```

2. Editar `.env` y cambiar al menos `JWT_SECRET`.

3. Construir y levantar:

```bash
docker compose up -d --build
```

### URLs

- Frontend: `http://localhost:${FRONTEND_PORT}` (por defecto `8080`)
- Backend API: `http://localhost:${BACKEND_PORT}` (por defecto `4000`)
- Healthcheck simple: `http://localhost:${BACKEND_PORT}/api/health`

Si `8080` o `4000` ya estan ocupados, cambia esos valores en `.env` antes de levantar los contenedores.

### Credenciales iniciales

Al iniciar el contenedor backend se ejecuta automaticamente `npm run init-db`.
Si no existe un administrador, se crea:

- Email: `admin@soporte.cl`
- Password: `admin123`

Cambia esta contrasena inmediatamente despues del primer ingreso.

### Persistencia

`docker compose` crea dos volumenes:

- `backend_data`: base SQLite
- `backend_uploads`: imagenes subidas

Esto permite recrear contenedores sin perder datos.

### Comandos utiles

```bash
docker compose logs -f
docker compose ps
docker compose down
docker compose up -d --build
```

## Despliegue en servidor

### Opcion recomendada

Usa el overlay [docker-compose.server.yml](/Users/franciscominio/Documents/sistema-soporte/docker-compose.server.yml) para:

- dejar `frontend` y `backend` publicados solo en `127.0.0.1`
- agregar `cloudflared` como tercer servicio
- exponer el sistema hacia Internet mediante Cloudflare Tunnel en vez de abrir puertos publicos

### Pasos

1. Copia el proyecto al servidor.
2. Crea un archivo `.env` basado en [.env.server.example](/Users/franciscominio/Documents/sistema-soporte/.env.server.example).
3. Ajusta al menos:
   - `JWT_SECRET`
   - `DATA_ENCRYPTION_KEY`
   - `FRONTEND_URL`
   - `CLOUDFLARE_TUNNEL_TOKEN`
4. Construye y levanta:

```bash
docker compose -f docker-compose.yml -f docker-compose.server.yml up -d --build
```

### Verificacion

```bash
docker compose -f docker-compose.yml -f docker-compose.server.yml ps
docker compose -f docker-compose.yml -f docker-compose.server.yml logs -f cloudflared
```

## Cloudflare Tunnel

Esta implementacion usa `cloudflared` con tunel administrado por token.

### Flujo sugerido

1. En Cloudflare Zero Trust crea un Tunnel.
2. Elige el despliegue con `cloudflared`.
3. Copia el `Tunnel token` y guardalo como `CLOUDFLARE_TUNNEL_TOKEN` en el `.env` del servidor.
4. En el dashboard del tunnel crea un `Public hostname`.
5. Para este proyecto, apunta el servicio al frontend interno:

```text
http://frontend:80
```

Como el frontend ya hace proxy a `/api` y `/uploads`, normalmente no necesitas exponer el backend por separado.

### Notas operativas

- Si usas un subdominio como `soporte.tudominio.cl`, pon esa URL en `FRONTEND_URL`.
- Si quieres revisar el sistema dentro del servidor sin pasar por Cloudflare, quedara disponible solo localmente en:
  - `http://127.0.0.1:${FRONTEND_PORT}`
  - `http://127.0.0.1:${BACKEND_PORT}`
- `cloudflared` quedara en el mismo network de Docker, por lo que puede resolver el servicio `frontend` directamente.

## Flujo operativo

1. Ingreso de equipo con datos del cliente, detalle de falla y firma.
2. La empresa queda como ficha maestra y el contacto del ingreso queda asociado solo a esa orden.
3. Preingreso publico opcional por enlace, con codigo de servicio para recepcion.
4. Asignacion y diagnostico por tecnico.
5. Registro fotografico con tipos `ingreso`, `diagnostico` y `entrega`.
6. Actualizacion de estado y presupuesto.
7. Entrega final con segunda firma y PDF de cierre.

## Preingresos y notificaciones

- Un tecnico, recepcion o admin puede generar un enlace desde `/preingresos`.
- El cliente completa el formulario publico y el sistema invalida el `token` del enlace una vez enviado.
- Recepcion reutiliza los datos mediante el `codigo_servicio` al crear el ingreso formal.
- Si `SMTP_HOST` esta configurado y el cliente deja correo, se envia una confirmacion con:
  - codigo de servicio
  - resumen del preingreso
  - direccion `Icalma 1030, Puerto Montt`
  - enlace de mapa configurado
- Si `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` estan configurados, se envia una alerta interna al completar el preingreso.

## Permisos operativos

- `recepcion`: puede crear ingresos y registrar entregas
- `tecnico`: puede actualizar diagnostico, presupuesto y clasificar fotos
- `admin`: gestiona usuarios, empresas, eliminacion de fotos y borrados forzados

## Respaldo y mantenimiento

### Exportar respaldo manual

```bash
cd backend
npm run backup:export
```

Esto genera una carpeta en `backend/backups/` con:

- copia de la base SQLite
- copia de `uploads/`
- `manifest.json` con resumen

### Limpiar uploads huerfanos

Modo simulacion:

```bash
cd backend
npm run uploads:cleanup
```

Eliminacion real:

```bash
cd backend
npm run uploads:cleanup -- --apply
```

### Respaldo programado recomendado

Ejemplo de cron diario a las 02:00:

```cron
0 2 * * * cd /ruta/al/proyecto/backend && npm run backup:export >> /var/log/soporte-backup.log 2>&1
```

## Documentacion tecnica breve

### Backend

- Entrada principal: [backend/src/server.js](/Users/franciscominio/Documents/sistema-soporte/backend/src/server.js)
- Rutas REST en `src/routes/`
- Logica HTTP en `src/controllers/`
- Acceso a datos en `src/models/`
- Inicializacion de SQLite en [backend/src/config/initDb.js](/Users/franciscominio/Documents/sistema-soporte/backend/src/config/initDb.js)
- Archivos subidos en `backend/uploads/`

### Frontend

- Entrada principal: [frontend/src/App.jsx](/Users/franciscominio/Documents/sistema-soporte/frontend/src/App.jsx)
- Paginas en `src/pages/`
- Componentes compartidos en `src/components/`
- Cliente HTTP en [frontend/src/services/api.js](/Users/franciscominio/Documents/sistema-soporte/frontend/src/services/api.js)

## Docker incluido en este repositorio

- [docker-compose.yml](/Users/franciscominio/Documents/sistema-soporte/docker-compose.yml): orquesta frontend y backend
- [docker-compose.server.yml](/Users/franciscominio/Documents/sistema-soporte/docker-compose.server.yml): overlay para servidor y Cloudflare Tunnel
- [backend/Dockerfile](/Users/franciscominio/Documents/sistema-soporte/backend/Dockerfile): imagen del backend
- [backend/docker-entrypoint.sh](/Users/franciscominio/Documents/sistema-soporte/backend/docker-entrypoint.sh): inicializa DB y arranca la API
- [frontend/Dockerfile](/Users/franciscominio/Documents/sistema-soporte/frontend/Dockerfile): build del frontend y servido con Nginx
- [frontend/nginx.conf](/Users/franciscominio/Documents/sistema-soporte/frontend/nginx.conf): SPA fallback y proxy a `/api` y `/uploads`

## Respaldo y operacion

- Respaldar periodicamente el volumen de base de datos SQLite
- Respaldar tambien el volumen de uploads
- No subir archivos `.env` reales al repositorio
- Si el sistema va a estar expuesto a internet, publicar el frontend detras de HTTPS

## Seguridad

- Las contrasenas se almacenan con `bcrypt`
- La autenticacion usa JWT
- La variable `JWT_SECRET` debe cambiarse antes de produccion
- `clave_acceso` ahora se cifra en reposo y solo se expone como marca de resguardo en la interfaz y PDF
