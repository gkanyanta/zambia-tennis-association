import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download as DownloadIcon,
  Smartphone,
  Shield,
  CheckCircle,
  Apple,
  Store
} from 'lucide-react'

export function Download() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Get the App"
        description="Download the Zambia Tennis Association app to stay connected with tournaments, rankings, live scores, and more — right from your phone."
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Android APK Download */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 mx-auto">
                <Smartphone className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Android</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Download and install the ZTA app directly on your Android device.
              </p>
            </div>

            <div className="flex justify-center mb-8">
              <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6">
                <a href="/app-release-signed.apk" download>
                  <DownloadIcon className="h-5 w-5 mr-2" />
                  Download APK
                </a>
              </Button>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Installation Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                    <div>
                      <p className="font-medium text-foreground">Download the APK</p>
                      <p className="text-sm text-muted-foreground">Tap the download button above. Your browser may warn you about downloading an APK file — this is normal.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                    <div>
                      <p className="font-medium text-foreground">Enable "Install from unknown sources"</p>
                      <p className="text-sm text-muted-foreground">Go to Settings &gt; Security (or Privacy) and enable "Install unknown apps" for your browser.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                    <div>
                      <p className="font-medium text-foreground">Open the downloaded file</p>
                      <p className="text-sm text-muted-foreground">Tap the downloaded APK file from your notifications or file manager to begin installation.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</span>
                    <div>
                      <p className="font-medium text-foreground">Install and open</p>
                      <p className="text-sm text-muted-foreground">Tap "Install" when prompted, then open the app and enjoy!</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* iOS Section */}
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
                      <p className="text-sm text-muted-foreground">Tap the share icon (square with an arrow) at the bottom of the screen.</p>
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

          {/* Google Play Section */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Google Play Store</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-4">
              The ZTA app will be available on the Google Play Store soon. Stay tuned!
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Automatic updates
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Verified by Google
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Coming soon
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
