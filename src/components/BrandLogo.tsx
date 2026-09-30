import Image from 'next/image'

interface BrandLogoProps {
  readonly compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo-spaxion.jpg"
      alt="Spaxión Centro Estético"
      width={640}
      height={641}
      className={compact ? 'h-10 w-10 rounded-full object-contain' : 'h-32 w-32 rounded-full object-contain'}
      priority
      unoptimized
    />
  )
}
