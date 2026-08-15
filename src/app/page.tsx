import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

const cards = [
  { title: 'Dashboard', href: '/dashboard', description: 'Resumen diario y agenda de cabinas' },
  { title: 'Clientes', href: '/clientes', description: 'Buscar clientes y ver historial' },
  { title: 'Cabinas', href: '/cabinas', description: 'Visualizar estado de cabinas y asignar tratamientos' },
  { title: 'Inventario', href: '/inventario', description: 'Control de stock y alertas de reabastecimiento' },
  { title: 'Facturación', href: '/facturacion', description: 'Cobros, boletas y facturas' },
  { title: 'Descuentos', href: '/descuentos', description: 'Promociones y códigos de descuento' },
  { title: 'Reportes', href: '/reportes', description: 'Cierres de turno y métricas' },
  { title: 'Ajustes', href: '/ajustes', description: 'Configuración de API y Google Calendar' },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf6] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="page-enter relative mb-10 overflow-hidden rounded-[30px] border border-[#c7d9ce] bg-[#eef4ed] px-6 py-10 shadow-[0_22px_60px_rgba(0,72,63,0.10)] sm:px-10 lg:px-16 lg:py-14">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-[#c19a4b]/60 bg-[#d9e6d9]/70" />
          <div className="absolute -bottom-28 right-28 h-64 w-64 rounded-full border border-[#c19a4b]/40 bg-[#fbfaf6]/80" />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <BrandLogo />
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00665b]">Spaxión Centro Estético · Operaciones</p>
              <h1 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-[1.05] text-[#00483f] sm:text-6xl">Bienestar que también se administra con calma.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#486b60]">Una vista serena para coordinar clientes, cabinas, tratamientos, inventario y cobros durante cada jornada.</p>
              <Link href="/dashboard" className="btn-brand mt-7">Abrir operación <span className="ml-2">→</span></Link>
            </div>
            <div className="relative grid min-h-56 w-full max-w-md grid-cols-2 gap-4 sm:min-h-64">
              <div className="hero-orbit hero-orbit-one flex items-end rounded-full bg-[#c19a4b] p-5"><span className="text-sm font-semibold text-[#173d36]">Agenda</span></div>
              <div className="hero-orbit hero-orbit-two flex items-end rounded-full bg-[#b7d0c4] p-5"><span className="text-sm font-semibold text-[#00483f]">Cuidado</span></div>
              <div className="hero-orbit hero-orbit-three col-span-2 mx-auto flex w-40 items-end rounded-full bg-[#dfe8e0] p-5"><span className="text-sm font-semibold text-[#00665b]">Control</span></div>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00665b]">Espacios de trabajo</p><h2 className="mt-2 font-serif text-3xl text-[#00483f]">Todo en un solo lugar</h2></div><span className="hidden text-sm text-[#6e8b7e] sm:block">{cards.length} módulos disponibles</span></div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => (
            <Link key={card.href} href={card.href} className="card-surface page-enter group transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:bg-white" style={{ animationDelay: `${index * 45}ms` }}>
              <div className="flex items-center justify-between gap-4"><span className="text-xs font-semibold tracking-[0.2em] text-[#c19a4b]">0{index + 1}</span><span className="text-lg text-[#00665b] transition group-hover:translate-x-1">→</span></div>
              <h2 className="mt-5 font-serif text-xl font-semibold text-[#00483f]">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#55766a]">{card.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
