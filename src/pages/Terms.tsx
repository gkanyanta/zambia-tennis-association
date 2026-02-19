import { Hero } from '@/components/Hero'
import { Card, CardContent } from '@/components/ui/card'

export function Terms() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Terms of Service"
        description="Terms and conditions for using ZTA services"
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

              <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-6">
                By accessing and using the Zambia Tennis Association website and services,
                you accept and agree to be bound by these Terms of Service. If you do not
                agree to these terms, please do not use our services.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">2. Membership</h2>
              <p className="text-muted-foreground mb-3">
                Membership with ZTA is subject to the following conditions:
              </p>
              <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
                <li>Members must provide accurate and complete information</li>
                <li>Membership fees are non-refundable unless otherwise stated</li>
                <li>Members must comply with ZTA rules and code of conduct</li>
                <li>ZTA reserves the right to suspend or terminate membership for violations</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mb-4">3. Tournament Participation</h2>
              <p className="text-muted-foreground mb-3">
                Tournament participation is governed by:
              </p>
              <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
                <li>Valid ZTA membership is required for all sanctioned tournaments</li>
                <li>Players must register by the specified deadline</li>
                <li>Entry fees are non-refundable after the registration deadline</li>
                <li>Players must adhere to ITF Rules of Tennis and ZTA regulations</li>
                <li>Disciplinary action may be taken for code of conduct violations</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mb-4">4. Intellectual Property</h2>
              <p className="text-muted-foreground mb-6">
                All content on this website, including text, graphics, logos, and images,
                is the property of ZTA and protected by copyright laws. You may not reproduce,
                distribute, or create derivative works without written permission.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">5. User Conduct</h2>
              <p className="text-muted-foreground mb-3">
                Users agree not to:
              </p>
              <ul className="list-disc pl-6 mb-6 text-muted-foreground space-y-2">
                <li>Use the service for any unlawful purpose</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the service</li>
                <li>Attempt to gain unauthorized access to any portion of the service</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mb-4">6. Liability Disclaimer</h2>
              <p className="text-muted-foreground mb-6">
                ZTA provides services "as is" without warranties of any kind. We are not
                liable for any injuries, damages, or losses incurred during participation
                in tennis activities. Participants engage in activities at their own risk.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">7. Payment Terms</h2>
              <p className="text-muted-foreground mb-6">
                All fees must be paid in full by the specified due date. Late payments may
                result in suspension of membership privileges. Payment information is processed
                securely through authorized payment providers.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">8. Modifications</h2>
              <p className="text-muted-foreground mb-6">
                ZTA reserves the right to modify these Terms of Service at any time.
                Continued use of our services after changes constitutes acceptance of
                the modified terms.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">9. Governing Law</h2>
              <p className="text-muted-foreground mb-6">
                These Terms of Service are governed by the laws of the Republic of Zambia.
                Any disputes shall be resolved in the courts of Zambia.
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-4">10. Contact Information</h2>
              <p className="text-muted-foreground mb-2">
                For questions about these Terms of Service, please contact:
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
