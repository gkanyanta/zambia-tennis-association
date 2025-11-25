import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Save, Plus, Trash2, DollarSign, Clock, Settings as SettingsIcon } from 'lucide-react'
import { coachService, type CoachListingSettings, type PricingPlan } from '@/services/coachService'

export function CoachListingSettings() {
  const [settings, setSettings] = useState<CoachListingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await coachService.getListingSettings()
      setSettings(data)
    } catch (err: any) {
      alert(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPricingPlan = () => {
    if (!settings) return

    const newPlan: PricingPlan = {
      duration: 1,
      price: 0,
      name: 'New Plan',
      description: '',
      isActive: true
    }

    setSettings({
      ...settings,
      pricingPlans: [...settings.pricingPlans, newPlan]
    })
  }

  const handleRemovePricingPlan = (index: number) => {
    if (!settings) return
    if (!confirm('Remove this pricing plan?')) return

    const updatedPlans = settings.pricingPlans.filter((_, i) => i !== index)
    setSettings({
      ...settings,
      pricingPlans: updatedPlans
    })
  }

  const handleUpdatePricingPlan = (index: number, field: keyof PricingPlan, value: any) => {
    if (!settings) return

    const updatedPlans = [...settings.pricingPlans]
    updatedPlans[index] = { ...updatedPlans[index], [field]: value }

    setSettings({
      ...settings,
      pricingPlans: updatedPlans
    })
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      await coachService.updateListingSettings(settings)
      alert('Settings saved successfully!')
      fetchSettings()
    } catch (err: any) {
      alert(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Coach Listing Settings" description="Configure pricing and business rules" gradient />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </section>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex flex-col">
        <Hero title="Coach Listing Settings" description="Configure pricing and business rules" gradient />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Failed to load settings</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero title="Coach Listing Settings" description="Configure pricing plans and business rules for coach listings" gradient />

      <section className="py-16">
        <div className="container-custom max-w-4xl">
          <div className="space-y-6">
            {/* Pricing Plans */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing Plans
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure subscription plans for coach listings
                    </p>
                  </div>
                  <Button onClick={handleAddPricingPlan} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.pricingPlans.map((plan, index) => (
                  <Card key={index} className={!plan.isActive ? 'opacity-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`plan-name-${index}`}>Plan Name</Label>
                          <Input
                            id={`plan-name-${index}`}
                            value={plan.name}
                            onChange={(e) => handleUpdatePricingPlan(index, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`plan-duration-${index}`}>Duration (months)</Label>
                          <Input
                            id={`plan-duration-${index}`}
                            type="number"
                            min="1"
                            value={plan.duration}
                            onChange={(e) => handleUpdatePricingPlan(index, 'duration', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`plan-price-${index}`}>Price (ZMW)</Label>
                          <Input
                            id={`plan-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={plan.price}
                            onChange={(e) => handleUpdatePricingPlan(index, 'price', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`plan-description-${index}`}>Description</Label>
                          <Input
                            id={`plan-description-${index}`}
                            value={plan.description || ''}
                            onChange={(e) => handleUpdatePricingPlan(index, 'description', e.target.value)}
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={plan.isActive}
                            onCheckedChange={(checked: boolean) => handleUpdatePricingPlan(index, 'isActive', checked)}
                          />
                          <Label>Active</Label>
                          {plan.isActive && <Badge variant="default">Active</Badge>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemovePricingPlan(index)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {settings.pricingPlans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pricing plans configured. Click "Add Plan" to create one.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Default Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Default Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultDuration">Default Duration (months)</Label>
                    <Input
                      id="defaultDuration"
                      type="number"
                      min="1"
                      value={settings.defaultDuration}
                      onChange={(e) => setSettings({ ...settings, defaultDuration: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultPrice">Default Price (ZMW)</Label>
                    <Input
                      id="defaultPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.defaultPrice}
                      onChange={(e) => setSettings({ ...settings, defaultPrice: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minListingDuration">Min Duration (months)</Label>
                    <Input
                      id="minListingDuration"
                      type="number"
                      min="1"
                      value={settings.minListingDuration}
                      onChange={(e) => setSettings({ ...settings, minListingDuration: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxListingDuration">Max Duration (months)</Label>
                    <Input
                      id="maxListingDuration"
                      type="number"
                      min="1"
                      value={settings.maxListingDuration}
                      onChange={(e) => setSettings({ ...settings, maxListingDuration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grace Period & Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Grace Period & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gracePeriodDays">Grace Period (days)</Label>
                    <Input
                      id="gracePeriodDays"
                      type="number"
                      min="0"
                      value={settings.gracePeriodDays}
                      onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Days after expiry before delisting coach
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="expiryReminderDays">Expiry Reminder (days)</Label>
                    <Input
                      id="expiryReminderDays"
                      type="number"
                      min="0"
                      value={settings.expiryReminderDays}
                      onChange={(e) => setSettings({ ...settings, expiryReminderDays: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Notify coaches N days before expiry
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.sendExpiryReminders}
                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, sendExpiryReminders: checked })}
                  />
                  <Label>Send expiry reminder notifications</Label>
                </div>
              </CardContent>
            </Card>

            {/* Business Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Business Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Club Verification</Label>
                    <p className="text-xs text-muted-foreground">
                      Coach must have verified club association before listing
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireClubVerification}
                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, requireClubVerification: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-approve Listings</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve listings after payment
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoApproveListings}
                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, autoApproveListings: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Multiple Clubs</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow coaches to be associated with multiple clubs
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowMultipleClubs}
                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, allowMultipleClubs: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Certification Upload</Label>
                    <p className="text-xs text-muted-foreground">
                      Require coaches to upload certification documents
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireCertificationUpload}
                    onCheckedChange={(checked: boolean) => setSettings({ ...settings, requireCertificationUpload: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
