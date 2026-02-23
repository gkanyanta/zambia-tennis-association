import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download as DownloadIcon,
  Smartphone,
  CheckCircle,
  Apple,
  Share,
  Globe,
} from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export function Download() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall()

  return (
    <div className="flex flex-col">
      <Hero
        title="Get the App"
        description="Install the Zambia Tennis Association app to stay connected with tournaments, rankings, live scores, and more — right from your phone."
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Already Installed State */}
          {isInstalled && (
            <div className="text-center mb-16">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">App Installed</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                You're already using the ZTA app! Enjoy quick access to tournaments, live scores, and more.
              </p>
            </div>
          )}

          {/* Smart Install Button (Android with beforeinstallprompt) */}
          {canInstall && !isInstalled && (
            <div className="text-center mb-16">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 mx-auto">
                <DownloadIcon className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Install Now</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                Add the ZTA app to your home screen for instant access — no app store needed.
              </p>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                onClick={promptInstall}
              >
                <DownloadIcon className="h-5 w-5 mr-2" />
                Install App
              </Button>
            </div>
          )}

          {/* Android Instructions */}
          {!isInstalled && (
            <div className="mb-16">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 mx-auto">
                  <Smartphone className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Android</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Install the ZTA app directly from Chrome — no app store required.
                </p>
              </div>

              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>How to Install on Android</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                      <div>
                        <p className="font-medium text-foreground">Open in Chrome</p>
                        <p className="text-sm text-muted-foreground">Visit <strong>zambiatennis.com</strong> in Google Chrome.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                      <div>
                        <p className="font-medium text-foreground">Tap the install prompt</p>
                        <p className="text-sm text-muted-foreground">If you see an "Install app" banner at the bottom, tap it. Otherwise, tap the menu (three dots) in the top right corner.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">3</span>
                      <div>
                        <p className="font-medium text-foreground">Select "Install app" or "Add to Home screen"</p>
                        <p className="text-sm text-muted-foreground">Tap the install option from the menu.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">4</span>
                      <div>
                        <p className="font-medium text-foreground">Tap "Install"</p>
                        <p className="text-sm text-muted-foreground">The app will be added to your home screen and open like a native app.</p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}

          {/* iOS Instructions */}
          {!isInstalled && (
            <div className="mb-16">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 mx-auto">
                  <Apple className="h-8 w-8 text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">iPhone & iPad</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Install the ZTA app on your iOS device using Safari's "Add to Home Screen" feature.
                </p>
              </div>

              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>How to Install on iOS</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                      <div>
                        <p className="font-medium text-foreground">Open in Safari</p>
                        <p className="text-sm text-muted-foreground">Visit <strong>zambiatennis.com</strong> in Safari (this feature only works in Safari).</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                      <div>
                        <p className="font-medium text-foreground">Tap the Share button</p>
                        <p className="text-sm text-muted-foreground">
                          Tap the share icon (<Share className="inline h-4 w-4 mx-0.5" />) at the bottom of the screen.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">3</span>
                      <div>
                        <p className="font-medium text-foreground">Select "Add to Home Screen"</p>
                        <p className="text-sm text-muted-foreground">Scroll down in the share menu and tap "Add to Home Screen".</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">4</span>
                      <div>
                        <p className="font-medium text-foreground">Tap "Add"</p>
                        <p className="text-sm text-muted-foreground">The app will appear on your home screen just like a native app.</p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Features */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Why Install?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              The ZTA app works just like a native app — fast, reliable, and always accessible from your home screen.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Works offline
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Live score updates
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No app store needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Always up to date
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
