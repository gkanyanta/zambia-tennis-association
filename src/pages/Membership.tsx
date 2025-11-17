import { Hero } from '@/components/Hero'
import { MembershipCard } from '@/components/MembershipCard'

const membershipTiers = [
  {
    name: 'Junior Membership',
    description: 'For players under 18 years old',
    price: '200',
    period: 'year',
    benefits: [
      'Access to all ZTA junior tournaments',
      'Eligibility for national rankings',
      'Junior development program access',
      'Discounted coaching sessions',
      'Free tournament entry for selected events',
      'ZTA junior membership card and certificate',
      'Access to member-only training sessions',
    ],
  },
  {
    name: 'Adult Membership',
    description: 'For players 18 years and older',
    price: '400',
    period: 'year',
    benefits: [
      'Access to all ZTA adult tournaments',
      'Eligibility for national rankings',
      'Priority tournament registration',
      'Access to member-only events',
      'ZTA membership card and certificate',
      'Voting rights at AGM',
      'Monthly newsletter subscription',
      'Insurance coverage during ZTA events',
      'Discounted merchandise',
    ],
    featured: true,
  },
  {
    name: 'Family Membership',
    description: 'For families with multiple players',
    price: '750',
    period: 'year',
    benefits: [
      'Coverage for up to 4 family members',
      'All benefits of individual memberships',
      'Additional discount on coaching packages',
      'Priority access to family tournaments',
      'Complimentary guest passes (4 per year)',
      'Family locker room access',
      'Special family event invitations',
      'Discounted merchandise',
    ],
  },
]

export function Membership() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Become a ZTA Member"
        description="Join Zambia's premier tennis community and unlock exclusive benefits, tournaments, and opportunities"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Choose Your Membership
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the membership tier that best fits your tennis journey. All memberships
              include access to our growing network of clubs and facilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {membershipTiers.map((tier, index) => (
              <div key={index} className={tier.featured ? 'md:-mt-4' : ''}>
                <MembershipCard
                  {...tier}
                  onJoin={() => alert(`Joining ${tier.name} - Payment integration coming soon!`)}
                />
              </div>
            ))}
          </div>

          {/* Additional Benefits */}
          <div className="bg-muted/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
              All Members Enjoy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-2">🎾</div>
                <h4 className="font-semibold text-foreground mb-1">Official Recognition</h4>
                <p className="text-sm text-muted-foreground">
                  Recognized by the International Tennis Federation
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h4 className="font-semibold text-foreground mb-1">Tournament Access</h4>
                <p className="text-sm text-muted-foreground">
                  Compete in sanctioned tournaments nationwide
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <h4 className="font-semibold text-foreground mb-1">National Rankings</h4>
                <p className="text-sm text-muted-foreground">
                  Track your progress with official rankings
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🤝</div>
                <h4 className="font-semibold text-foreground mb-1">Community</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with players across Zambia
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
