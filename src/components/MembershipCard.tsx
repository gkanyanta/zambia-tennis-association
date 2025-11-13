import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MembershipCardProps {
  name: string
  description: string
  price: string
  period: string
  benefits: string[]
  featured?: boolean
  onJoin?: () => void
}

export function MembershipCard({
  name,
  description,
  price,
  period,
  benefits,
  featured = false,
  onJoin,
}: MembershipCardProps) {
  return (
    <Card
      className={cn(
        "card-elevated-hover h-full flex flex-col relative",
        featured && "border-primary border-2 shadow-lg"
      )}
    >
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold text-foreground">K{price}</span>
          <span className="text-muted-foreground ml-2">/ {period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={featured ? "default" : "outline"}
          onClick={onJoin}
        >
          Join Now
        </Button>
      </CardFooter>
    </Card>
  )
}
