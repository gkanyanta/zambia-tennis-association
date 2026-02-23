import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const DISMISS_KEY = 'zta-install-banner-dismissed'

export function InstallBanner() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState(true) // Start hidden, show after check
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY)
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsMobile(mobile)
    setDismissed(!!wasDismissed)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (accepted) {
      handleDismiss()
    }
  }

  // Don't show if: already installed, dismissed, not mobile, or no install option
  if (isInstalled || dismissed || !isMobile || (!canInstall && !isIOS)) {
    return null
  }

  return (
    <div className="bg-green-600 text-white px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Download className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium truncate">
          {isIOS ? (
            <>
              Tap <Share className="inline h-4 w-4 mx-0.5" /> then "Add to Home Screen"
            </>
          ) : (
            'Install the ZTA app for a better experience'
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canInstall && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="h-7 text-xs"
          >
            Install
          </Button>
        )}
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white p-1"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
