import { Hero } from '@/components/Hero'
import { Card, CardContent } from '@/components/ui/card'

export function Privacy() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Privacy Policy"
        description="How we collect, use, and protect your information"
        gradient={false}
        className="bg-muted/50"
      />

      <section className="py-16">
        <div className="container-custom max-w-4xl">
          <Card className="card-elevated">
            <CardContent className="p-8 prose prose-sm max-w-none">
              <p className="text-muted-foreground mb-6">
                <strong>Last Updated:</strong> January 1, 2025
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-6">
                The Zambia Tennis Association ("ZTA", "we", "our", or "us") is committed
                to protecting your privacy. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you visit our website
                or use our services.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-3">
                We may collect information about you in various ways, including:
              </p>
              <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
                <li>Personal identification information (name, email, phone number)</li>
                <li>Membership and registration details</li>
                <li>Tournament participation records</li>
                <li>Payment and billing information</li>
                <li>Communication preferences</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
                <li>Process membership applications and renewals</li>
                <li>Manage tournament registrations and rankings</li>
                <li>Send administrative information and updates</li>
                <li>Improve our services and website</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground mb-6">
                We do not sell, trade, or rent your personal information to third parties.
                We may share your information with trusted partners who assist us in operating
                our website and conducting our business, subject to confidentiality agreements.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-6">
                We implement appropriate technical and organizational measures to protect
                your personal information against unauthorized access, alteration, disclosure,
                or destruction.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground mb-3">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Lodge a complaint with relevant authorities</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground mb-2">
                If you have questions about this Privacy Policy, please contact us:
              </p>
              <p className="text-muted-foreground">
                Email: info@zambiatennis.com<br />
                Phone: +260 979 326 778<br />
                Address: Olympic Youth Development Centre, Lusaka, Zambia
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
