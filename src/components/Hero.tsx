import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeroProps {
  title: string
  subtitle?: string
  description?: string
  primaryCta?: {
    text: string
    href?: string
    onClick?: () => void
  }
  secondaryCta?: {
    text: string
    href?: string
    onClick?: () => void
  }
  imageUrl?: string
  gradient?: boolean
  children?: ReactNode
  className?: string
}

export function Hero({
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  gradient = true,
  children,
  className,
}: HeroProps) {
  const handleCtaClick = (cta?: { href?: string; onClick?: () => void }) => {
    if (cta?.onClick) {
      cta.onClick()
    } else if (cta?.href) {
      window.location.href = cta.href
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        gradient && "gradient-hero",
        className
      )}
    >
      {/* Background Image */}
      {imageUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-accent/80 to-secondary/80 mix-blend-multiply" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container-custom py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {subtitle && (
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400">
              {subtitle}
            </p>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            {title}
          </h1>
          {description && (
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-zinc-300 mb-8 leading-relaxed">
              {description}
            </p>
          )}

          {(primaryCta || secondaryCta) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {primaryCta && (
                <Button
                  size="lg"
                  className="bg-white text-[#081a0c] hover:bg-zinc-100 font-semibold min-w-[160px] border-0"
                  onClick={() => handleCtaClick(primaryCta)}
                >
                  {primaryCta.text}
                </Button>
              )}
              {secondaryCta && (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 min-w-[160px]"
                  onClick={() => handleCtaClick(secondaryCta)}
                >
                  {secondaryCta.text}
                </Button>
              )}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
