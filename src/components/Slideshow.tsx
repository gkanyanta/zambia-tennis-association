import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Slide {
  image: string
  title: string
  description: string
  focalPoint?: 'top' | 'center' | 'bottom'
}

// Apply Cloudinary smart-crop transformation for slideshow dimensions.
// This replaces the stored 1200×800 image with a server-side cropped version
// that fits the slideshow frame (1920×820) with automatic subject detection.
function slideshowUrl(url: string, focalPoint?: string): string {
  if (!url.includes('res.cloudinary.com')) return url
  const gravity =
    focalPoint === 'top' ? 'g_north' :
    focalPoint === 'bottom' ? 'g_south' :
    'g_auto'
  return url.replace('/upload/', `/upload/c_fill,${gravity},w_1920,h_820,q_auto,f_auto/`)
}

interface SlideshowProps {
  slides: Slide[]
  autoPlay?: boolean
  interval?: number
}

export function Slideshow({ slides, autoPlay = true, interval = 6000 }: SlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const goToSlide = useCallback((index: number) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => setTransitioning(false), 900)
    setCurrentSlide(index)
  }, [transitioning])

  const goToPrevious = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }, [currentSlide, slides.length, goToSlide])

  const goToNext = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length)
  }, [currentSlide, slides.length, goToSlide])

  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return
    const timer = setInterval(goToNext, interval)
    return () => clearInterval(timer)
  }, [autoPlay, interval, goToNext, slides.length])

  const pad = (n: number) => String(n + 1).padStart(2, '0')

  if (slides.length === 0) return null

  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ height: 'clamp(480px, 80vh, 820px)' }}>

      {/* ── Images ── */}
      {slides.map((slide, i) => {
        const active = i === currentSlide
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              opacity: active ? 1 : 0,
              transition: 'opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: active ? 'auto' : 'none',
            }}
          >
            <img
              src={slideshowUrl(slide.image, slide.focalPoint)}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                objectPosition: 'center center',
                animation: active ? `kenBurns ${interval + 3000}ms ease-out forwards` : 'none',
                transformOrigin: 'center center',
              }}
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
          </div>
        )
      })}

      {/* ── Slide text (re-keyed on change to re-trigger animation) ── */}
      <div
        key={currentSlide}
        className="absolute left-0 right-0 px-8 md:px-16"
        style={{
          bottom: 'clamp(60px, 10%, 100px)',
          animation: 'slideUpFade 0.85s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        }}
      >
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <span className="block h-px w-8 bg-primary flex-shrink-0" />
            <span className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
              Zambia Tennis Association
            </span>
          </div>

          {/* Title */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            {slides[currentSlide].title}
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg text-white/70 max-w-xl leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>
      </div>

      {/* ── Arrow buttons ── */}
      <button
        onClick={goToPrevious}
        aria-label="Previous slide"
        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-all duration-200 hover:scale-110"
      >
        <ChevronLeft className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />
      </button>
      <button
        onClick={goToNext}
        aria-label="Next slide"
        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-all duration-200 hover:scale-110"
      >
        <ChevronRight className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />
      </button>

      {/* ── Bottom controls ── */}
      <div className="absolute bottom-4 left-8 md:left-16 right-8 md:right-16 flex items-center justify-between">
        {/* Pill dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="transition-all duration-500 rounded-full bg-white"
              style={{
                width:   i === currentSlide ? '28px' : '6px',
                height:  '6px',
                opacity: i === currentSlide ? 1 : 0.35,
              }}
            />
          ))}
        </div>

        {/* Slide counter */}
        <span className="text-white/60 font-mono text-xs tracking-widest select-none">
          {pad(currentSlide)}&thinsp;/&thinsp;{pad(slides.length - 1)}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
        {autoPlay && (
          <div
            key={currentSlide}
            className="h-full bg-primary"
            style={{ animation: `progressFill ${interval}ms linear forwards`, width: 0 }}
          />
        )}
      </div>
    </div>
  )
}
