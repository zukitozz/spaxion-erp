# Spaxión ERP/POS

Proyecto inicial para un sistema ERP/POS de gestión de spa con Next.js 14, PostgreSQL y Prisma.

## Estructura

- `src/app`: rutas principales de la aplicación
- `src/components`: UI reusable
- `src/store`: estado frontend con zustand
- `src/lib`: configuración de Prisma y librerías de integración
- `prisma/schema.prisma`: modelo de datos para usuarios, clientes, cabinas, inventario y facturación

## Cómo usar

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Copiar `.env.example` como `.env` y configurar `DATABASE_URL` con el endpoint de AWS RDS.
3. Generar Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Aplicar el esquema en PostgreSQL:
   ```bash
   npx prisma migrate dev --name initial_schema
   ```
5. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

6. Crear o actualizar el primer administrador:
   ```bash
   npm run seed
   ```
   Usa `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` en el entorno. La contraseña se guarda con bcrypt.

## Notas

- `.env` y `.env.local` están excluidos de Git; no publiques las credenciales de RDS.
- La aplicación usa NextAuth con credenciales almacenadas en el modelo `User`.
- Debes crear el primer usuario administrador mediante un proceso controlado antes de iniciar sesión.
- Las rutas de API respaldadas por Prisma se ejecutan dinámicamente contra PostgreSQL.
- El registro de factura se guarda localmente en PostgreSQL y, para Boleta/Factura (no para Nota de venta), puede enviarse a SUNAT desde el botón "Enviar a SUNAT" en Facturación — llama a `/api/facturacion/enviar`, que usa el proveedor Mifact (`src/lib/mifact.ts`):
  - `MIFACT_ENDPOINT`: URL del servicio SendInvoice que te da Mifact.
  - `MIFACT_TOKEN`: credencial de autenticación (Mifact tiene un ambiente `demo.mifact.net.pe` separado del de producción; usa el token correspondiente a cada uno).
  - `MIFACT_RUC_EMISOR`: el RUC asociado a ese token (puede diferir del RUC real de la empresa mientras se usa el ambiente de pruebas).
  - Razón social, dirección fiscal y UBIGEO del emisor se configuran en Ajustes/Configuracion (`razonSocial`, `direccionFiscal`, `codigoUbigeo`), no como variables de entorno.
  - Una Factura exige que el cliente tenga RUC registrado; una Boleta acepta DNI o RUC.
- Google Calendar se integra con OAuth 2.0 real (dos sentidos):
  1. En [Google Cloud Console](https://console.cloud.google.com/), crea un proyecto y habilita "Google Calendar API".
  2. Configura la pantalla de consentimiento OAuth (modo interno o externo con tu email como test user).
  3. Crea una credencial "OAuth 2.0 Client ID" tipo *Web application*, con redirect URI `<NEXTAUTH_URL>/api/integraciones/google-calendar/callback`.
  4. Copia el Client ID/Secret a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
  5. Desde Ajustes (rol Supervisor), pulsa "Conectar con Google" para autorizar la cuenta; el refresh token queda cifrado en la tabla `Configuracion`.
  - Con la sincronización activada (`googleCalendarActivo`), crear/editar/eliminar una cita en la app se refleja en Calendar, y al abrir el módulo de Citas se hace polling de Calendar hacia la app: los eventos nuevos se vinculan a un cliente si su DNI/RUC o nombre aparece en la descripción del evento; si no hay coincidencia, la cita se importa sin cliente asignado.
- Las fotos de atenciones y productos se guardan en S3 (`src/lib/storage.ts`), no en disco local — necesario en hosting serverless (Vercel), donde el filesystem no persiste entre despliegues:
  1. Crea un bucket S3 privado (bloqueo de acceso público activado, es el valor por defecto).
  2. Crea un usuario IAM dedicado con una policy que solo permita `s3:PutObject`/`s3:GetObject` sobre ese bucket (evita reusar credenciales de administrador en la app).
  3. Copia el nombre del bucket, la región y el access key/secret del usuario IAM a `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` en `.env`.
  4. El bucket se mantiene privado: las fotos se sirven con URLs firmadas (`urlFirmada`, 12 horas de vigencia) generadas en cada respuesta de la API, nunca con una URL pública fija.
