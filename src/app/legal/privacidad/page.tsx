export const metadata = {
  title: 'Política de Privacidad · Spaxión',
}

export default function PoliticaPrivacidadPage() {
  return (
    <div className="page-shell px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card-surface space-y-4">
          <p className="eyebrow">Spaxión Centro Estético</p>
          <h1 className="page-heading text-3xl">Política de Privacidad</h1>
          <p className="text-sm text-slate-500">Última actualización: agosto de 2026</p>

          <p className="text-slate-700">
            Spaxión Por Tu Belleza S.A.C. (RUC 20608699679, &quot;Spaxión&quot;) opera un sistema interno de gestión
            (el &quot;Sistema&quot;) para administrar citas, tratamientos, inventario y facturación de su centro estético.
            Esta política describe qué información recopilamos, cómo la usamos y cómo la protegemos.
          </p>

          <h2 className="text-xl font-semibold text-emerald-900">1. Información que recopilamos</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            <li>Datos de clientes: nombre, DNI o RUC, celular, correo, distrito, fecha de nacimiento y notas de tratamiento.</li>
            <li>Fotos de seguimiento de tratamientos, asociadas a cada atención.</li>
            <li>Citas agendadas, incluyendo fecha, tratamiento y estado.</li>
            <li>Comprobantes de pago y datos de facturación necesarios para la emisión de Boletas y Facturas electrónicas.</li>
            <li>Datos de cuenta del personal que usa el Sistema (nombre, correo, rol).</li>
          </ul>

          <h2 className="text-xl font-semibold text-emerald-900">2. Uso de Google Calendar</h2>
          <p className="text-slate-700">
            El Sistema puede conectarse, de forma opcional y solo si el personal autorizado lo activa desde Ajustes,
            a una cuenta de Google Calendar de la empresa. Esta conexión se usa exclusivamente para:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            <li>Crear, actualizar y eliminar eventos en el calendario cuando se agenda, modifica o cancela una cita en el Sistema.</li>
            <li>Leer eventos del calendario para importarlos como citas dentro del Sistema.</li>
          </ul>
          <p className="text-slate-700">
            No accedemos a otros calendarios de la cuenta, no compartimos esta información con terceros, y el acceso
            puede revocarse en cualquier momento desde Ajustes o directamente desde la
            {' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="underline">
              configuración de la cuenta de Google
            </a>
            {' '}del usuario. El uso y transferencia de la información obtenida de las APIs de Google se rige por la
            {' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="underline">
              Política de Datos de Usuario de los Servicios de API de Google
            </a>
            , incluidos los requisitos de Uso Limitado.
          </p>

          <h2 className="text-xl font-semibold text-emerald-900">3. Cómo usamos la información</h2>
          <p className="text-slate-700">
            Usamos los datos descritos únicamente para operar el negocio: agendar y dar seguimiento a citas y
            tratamientos, gestionar inventario, emitir comprobantes de pago ante SUNAT, y administrar los accesos del
            personal. No vendemos ni compartimos datos de clientes con terceros ajenos a estos fines, salvo lo
            requerido por ley (por ejemplo, la emisión de comprobantes electrónicos ante SUNAT).
          </p>

          <h2 className="text-xl font-semibold text-emerald-900">4. Almacenamiento y seguridad</h2>
          <p className="text-slate-700">
            Los datos se almacenan en una base de datos alojada en AWS (región us-east-2). Las fotos de tratamientos
            se almacenan en un bucket privado de Amazon S3 y se sirven únicamente mediante enlaces temporales
            firmados. Las contraseñas del personal se guardan cifradas.
          </p>

          <h2 className="text-xl font-semibold text-emerald-900">5. Derechos del titular de datos</h2>
          <p className="text-slate-700">
            De acuerdo con la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, los clientes pueden
            solicitar acceso, rectificación, cancelación u oposición al tratamiento de sus datos personales
            escribiendo al correo de contacto indicado abajo.
          </p>

          <h2 className="text-xl font-semibold text-emerald-900">6. Contacto</h2>
          <p className="text-slate-700">
            Para consultas sobre esta política o sobre el tratamiento de datos personales, escríbenos a{' '}
            <a href="mailto:contacto@spaxion.pe" className="underline">contacto@spaxion.pe</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
