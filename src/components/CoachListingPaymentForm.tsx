import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { coachService, type Coach, type PricingPlan } from '@/services/coachService'
import { DollarSign, Calendar, CreditCard } from 'lucide-react'

interface CoachListingPaymentFormProps {
  coach: Coach
  onSuccess: () => void
  onCancel: () => void
}

export function CoachListingPaymentForm({ coach, onSuccess, onCancel }: CoachListingPaymentFormProps) {
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    duration: '',
    amount: '',
    paymentMethod: 'cash',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    fetchPricingPlans()
  }, [])

  const fetchPricingPlans = async () => {
    try {
      const plans = await coachService.getPricingPlans()
      setPricingPlans(plans)

      // Set default to annual plan
      const annualPlan = plans.find(p => p.duration === 12)
      if (annualPlan) {
        setFormData(prev => ({
          ...prev,
          duration: annualPlan.duration.toString(),
          amount: annualPlan.price.toString()
        }))
      }
    } catch (err: any) {
      console.error('Failed to fetch pricing plans:', err)
    }
  }

  const handleDurationChange = (duration: string) => {
    const plan = pricingPlans.find(p => p.duration.toString() === duration)
    if (plan) {
      setFormData({
        ...formData,
        duration,
        amount: plan.price.toString()
      })
    } else {
      setFormData({ ...formData, duration })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await coachService.createCoachListing({
        coachId: coach._id,
        amount: parseFloat(formData.amount),
        duration: parseInt(formData.duration),
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference || undefined,
        paymentDate: new Date(formData.paymentDate),
        notes: formData.notes || undefined
      })

      alert('Listing payment processed successfully!')
      onSuccess()
    } catch (err: any) {
      alert(err.message || 'Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const calculateExpiryDate = () => {
    if (!formData.duration || !formData.paymentDate) return null
    const date = new Date(formData.paymentDate)
    date.setMonth(date.getMonth() + parseInt(formData.duration))
    return date
  }

  const expiryDate = calculateExpiryDate()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Coach Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coach Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{coach.fullName || `${coach.firstName} ${coach.lastName}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Club:</span>
            <span className="font-medium">{coach.club.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{coach.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Status:</span>
            <span className="font-medium capitalize">{coach.listingStatus}</span>
          </div>
          {coach.listingExpiryDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Expiry:</span>
              <span className="font-medium">{new Date(coach.listingExpiryDate).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      {pricingPlans.length > 0 && (
        <div>
          <Label className="mb-2 block">Select Listing Plan</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.duration}
                className={`cursor-pointer transition-all ${
                  formData.duration === plan.duration.toString()
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleDurationChange(plan.duration.toString())}
              >
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold">K{plan.price}</div>
                  <div className="text-sm font-medium text-muted-foreground">{plan.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{plan.description}</div>
                  <div className="text-xs text-muted-foreground mt-2">{plan.duration} months</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">Duration (months) *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount (ZMW) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={formData.paymentMethod} onValueChange={(value: string) => setFormData({ ...formData, paymentMethod: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="transactionReference">Transaction Reference</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="transactionReference"
              value={formData.transactionReference}
              onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
              placeholder="Optional reference number"
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes about this payment"
            rows={3}
          />
        </div>
      </div>

      {/* Summary */}
      {expiryDate && (
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-medium">
                <span>Payment Date:</span>
                <span>{new Date(formData.paymentDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Listing Duration:</span>
                <span>{formData.duration} months</span>
              </div>
              <div className="flex justify-between font-medium text-primary">
                <span>Listing Expires:</span>
                <span>{expiryDate.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Amount:</span>
                <span>K{parseFloat(formData.amount || '0').toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Process Payment'}
        </Button>
      </div>
    </form>
  )
}
