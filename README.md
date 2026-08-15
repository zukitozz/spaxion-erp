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
- El registro de factura termina localmente en PostgreSQL: guarda `Factura`, `FacturaItem` y `Comprobante` con `enviado = false`. El envío a SUNAT/OSE/PSE queda como TODO en `/api/facturacion/enviar` hasta definir el proveedor y su contrato.
- Google Calendar usa OAuth 2.0 de Google Cloud. Debes crear credenciales OAuth, autorizar el calendario y guardar el access token fuera del repositorio en `GOOGLE_CALENDAR_ACCESS_TOKEN`; luego `/api/integraciones/google-calendar` sincroniza una cita.
