# ServiceHub TI

Aplicacion full-stack para operacion de soporte TI con:

- React + Vite en frontend
- Node + Express en backend
- Prisma como capa ORM
- SQLite para persistencia
- JWT con roles `ADMIN` y `TECHNICIAN`
- Calendario semanal/diario con drag and drop
- Gestion de clientes, tecnicos y visitas recurrentes

## Ejecutar con Docker

```bash
docker compose up -d --build
```

Abrir:

```text
http://localhost:8080
```

Detener:

```bash
docker compose down
```

## Credenciales demo

- Admin: `admin@servicehub.local` / `admin123`
- Tecnico: `camila@servicehub.local` / `tecnico123`

## Integración con Microsoft 365 / Outlook

Para habilitar la sincronización con calendarios de Office 365, define estas variables antes de levantar Docker:

```bash
export MS_TENANT_ID=common
export MS_CLIENT_ID=tu_client_id
export MS_CLIENT_SECRET=tu_client_secret
export MS_REDIRECT_URI=http://localhost:8080/api/integrations/microsoft/callback
```

En Azure Portal debes registrar una aplicación y agregar como redirect URI:

```text
http://localhost:8080/api/integrations/microsoft/callback
```

Permisos recomendados para esta primera integración:

- `offline_access`
- `openid`
- `profile`
- `email`
- `User.Read`
- `Calendars.Read`
- `Calendars.Read.Shared`

Después de reiniciar el stack, la conexión y sincronización quedan disponibles en la vista de calendario para usuarios `ADMIN`.

## Estructura

- `frontend/`: aplicacion React
- `backend/`: API Express, Prisma y seed
- `Dockerfile`: build del frontend y publicacion con nginx
- `backend.Dockerfile`: API + inicializacion de base de datos
- `docker-compose.yml`: stack completo

## Próximos pasos sugeridos

1. Migrar esta base a React + backend/API real.
2. Persistir datos en base de datos.
3. Agregar autenticación y roles.
4. Implementar calendario semanal/diario con drag and drop.
5. Crear módulos de tickets, SLA e historial por cliente.
