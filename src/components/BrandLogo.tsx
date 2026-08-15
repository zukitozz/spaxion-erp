import Image from 'next/image'

interface BrandLogoProps {
  readonly compact?: boolean
  readonly onDark?: boolean
}

export function BrandLogo({ compact = false, onDark = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo-spaxion.svg"
      alt="Spaxión Centro Estético"
      width={compact ? 132 : 220}
      height={compact ? 46 : 76}
      className={`${compact ? 'h-10 w-auto' : 'h-auto w-52'}${onDark ? ' brightness-0 invert' : ''}`}
      priority
    />
  )
}
