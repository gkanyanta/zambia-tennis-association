import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Save, CheckCircle2 } from 'lucide-react'
import { tournamentService } from '@/services/tournamentService'
import type { TournamentCategory, DrawType, CategoryType, Gender, AgeGroup } from '@/types/tournament'

// Standard junior categories
const JUNIOR_CATEGORIES = [
  { code: 'B10U', name: 'Boys 10 & Under', gender: 'boys' as const, ageGroup: 'U10' as const },
  { code: 'B12U', name: 'Boys 12 & Under', gender: 'boys' as const, ageGroup: 'U12' as const },
  { code: 'B14U', name: 'Boys 14 & Under', gender: 'boys' as const, ageGroup: 'U14' as const },
  { code: 'B16U', name: 'Boys 16 & Under', gender: 'boys' as const, ageGroup: 'U16' as const },
  { code: 'B18U', name: 'Boys 18 & Under', gender: 'boys' as const, ageGroup: 'U18' as const },
  { code: 'G10U', name: 'Girls 10 & Under', gender: 'girls' as const, ageGroup: 'U10' as const },
  { code: 'G12U', name: 'Girls 12 & Under', gender: 'girls' as const, ageGroup: 'U12' as const },
  { code: 'G14U', name: 'Girls 14 & Under', gender: 'girls' as const, ageGroup: 'U14' as const },
  { code: 'G16U', name: 'Girls 16 & Under', gender: 'girls' as const, ageGroup: 'U16' as const },
  { code: 'G18U', name: 'Girls 18 & Under', gender: 'girls' as const, ageGroup: 'U18' as const },
]

export function TournamentCreate() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
    city: '',
    province: '',
    entryDeadline: '',
    entryFee: 0,
    organizer: '',
    contactEmail: '',
    contactPhone: '',
    rules: '',
    prizes: ''
  })

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [drawType, setDrawType] = useState<DrawType>('single_elimination')
  const [maxEntries, setMaxEntries] = useState(32)
  const [customCategories, setCustomCategories] = useState<Partial<TournamentCategory>[]>([])
  const [showCustomCategoryForm, setShowCustomCategoryForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedCategories.size === 0 && customCategories.length === 0) {
      alert('Please select at least one category for the tournament')
      return
    }

    setLoading(true)

    try {
      // Calculate December 31st of tournament start year for age calculation
      const tournamentYear = new Date(formData.startDate).getFullYear()
      const dec31 = new Date(tournamentYear, 11, 31, 23, 59, 59)

      // Build categories from selected junior categories
      const juniorCats = Array.from(selectedCategories).map(code => {
        const cat = JUNIOR_CATEGORIES.find(c => c.code === code)!
        const ageNumber = cat.ageGroup.replace('U', '')

        return {
          categoryCode: cat.code,
          name: cat.name,
          type: 'junior' as const,
          gender: cat.gender,
          ageGroup: cat.ageGroup,
          maxAge: parseInt(ageNumber),
          ageCalculationDate: dec31.toISOString(),
          drawType,
          maxEntries,
          entries: []
        }
      })

      // Enhance custom categories
      const enhancedCustomCategories = customCategories.map(cat => {
        const enhanced = { ...cat }

        if (cat.type === 'junior' && cat.gender && cat.ageGroup) {
          const genderPrefix = cat.gender === 'boys' ? 'B' : 'G'
          const ageNumber = cat.ageGroup?.replace('U', '')
          enhanced.categoryCode = `${genderPrefix}${ageNumber}U`
          enhanced.ageCalculationDate = dec31.toISOString()
          enhanced.maxAge = parseInt(ageNumber || '0')
        }

        return enhanced
      })

      // Combine all categories
      const allCategories = [...juniorCats, ...enhancedCustomCategories]

      // Create tournament
      await tournamentService.createTournament({
        ...formData,
        categories: allCategories
      } as any)

      // Navigate back to tournament admin page on success
      navigate('/admin/tournaments')
    } catch (error: any) {
      console.error('Error creating tournament:', error)
      alert(error.message || 'Failed to create tournament. Please check all required fields.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (code: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(code)) {
      newSelected.delete(code)
    } else {
      newSelected.add(code)
    }
    setSelectedCategories(newSelected)
  }

  const selectAllBoys = () => {
    const newSelected = new Set(selectedCategories)
    JUNIOR_CATEGORIES.filter(c => c.gender === 'boys').forEach(c => newSelected.add(c.code))
    setSelectedCategories(newSelected)
  }

  const selectAllGirls = () => {
    const newSelected = new Set(selectedCategories)
    JUNIOR_CATEGORIES.filter(c => c.gender === 'girls').forEach(c => newSelected.add(c.code))
    setSelectedCategories(newSelected)
  }

  const selectAllCategories = () => {
    setSelectedCategories(new Set(JUNIOR_CATEGORIES.map(c => c.code)))
  }

  const clearAllCategories = () => {
    setSelectedCategories(new Set())
  }

  const addCustomCategory = (category: Partial<TournamentCategory>) => {
    setCustomCategories([...customCategories, category])
    setShowCustomCategoryForm(false)
  }

  const removeCustomCategory = (index: number) => {
    setCustomCategories(customCategories.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Create Tournament"
        description="Set up a new tournament with categories and entry rules"
        gradient
      />

      <section className="py-8">
        <div className="container-custom max-w-4xl">
          <Button variant="outline" onClick={() => navigate('/admin/tournaments')} className="mb-6">
            ← Back
          </Button>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Tournament Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tournament Name</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., National Championships 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Tournament description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue</label>
                    <Input
                      required
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="e.g., Lusaka Tennis Club"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <Input
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Lusaka"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Province</label>
                    <Input
                      required
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder="e.g., Lusaka"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Deadline</label>
                    <Input
                      type="date"
                      required
                      value={formData.entryDeadline}
                      onChange={(e) => setFormData({ ...formData, entryDeadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Fee (K)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Organizer Name</label>
                  <Input
                    required
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="e.g., Zambia Tennis Association"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Email</label>
                    <Input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="tournaments@zambiatennis.org"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Phone</label>
                    <Input
                      type="tel"
                      required
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="+260 xxx xxx xxx"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Junior Categories Selection */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Junior Categories</CardTitle>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllBoys}>
                      All Boys
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={selectAllGirls}>
                      All Girls
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={selectAllCategories}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={clearAllCategories}>
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which junior categories will compete in this tournament:
                </p>

                {/* Boys Categories */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Boys Categories</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {JUNIOR_CATEGORIES.filter(c => c.gender === 'boys').map(cat => (
                      <label
                        key={cat.code}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedCategories.has(cat.code)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat.code)}
                          onChange={() => toggleCategory(cat.code)}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-sm">{cat.code}</div>
                          <div className="text-xs text-muted-foreground">{cat.name}</div>
                        </div>
                        {selectedCategories.has(cat.code) && (
                          <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Girls Categories */}
                <div>
                  <h4 className="font-medium mb-3">Girls Categories</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {JUNIOR_CATEGORIES.filter(c => c.gender === 'girls').map(cat => (
                      <label
                        key={cat.code}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedCategories.has(cat.code)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat.code)}
                          onChange={() => toggleCategory(cat.code)}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-sm">{cat.code}</div>
                          <div className="text-xs text-muted-foreground">{cat.name}</div>
                        </div>
                        {selectedCategories.has(cat.code) && (
                          <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category Settings */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Category Settings (applies to all selected)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Draw Type</label>
                      <select
                        value={drawType}
                        onChange={(e) => setDrawType(e.target.value as DrawType)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="single_elimination">Single Elimination</option>
                        <option value="round_robin">Round Robin</option>
                        <option value="feed_in">Feed-in (Compass)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Entries per Category</label>
                      <Input
                        type="number"
                        min="4"
                        value={maxEntries}
                        onChange={(e) => setMaxEntries(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Categories Summary */}
                {selectedCategories.size > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      {selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'} selected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Categories (Optional) */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Additional Categories (Optional)</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add senior, madalas, or other custom categories
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setShowCustomCategoryForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customCategories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No custom categories added
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.type} • {category.gender} • {category.drawType?.replace('_', ' ')}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomCategory(index)}>
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tournament Rules</label>
                  <textarea
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Special rules or regulations"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Prizes</label>
                  <textarea
                    value={formData.prizes}
                    onChange={(e) => setFormData({ ...formData, prizes: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Prize information"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || (selectedCategories.size === 0 && customCategories.length === 0)}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Tournament'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/tournaments')}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </section>

      {showCustomCategoryForm && (
        <CategoryFormModal
          onClose={() => setShowCustomCategoryForm(false)}
          onSubmit={addCustomCategory}
        />
      )}
    </div>
  )
}

function CategoryFormModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (category: Partial<TournamentCategory>) => void
}) {
  const [formData, setFormData] = useState<Partial<TournamentCategory>>({
    name: '',
    type: 'junior',
    gender: 'boys',
    ageGroup: 'U10',
    drawType: 'single_elimination',
    maxEntries: 32,
    specialRules: []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category Name</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Boys U12 Singles"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as CategoryType })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="junior">Junior</option>
                  <option value="senior">Senior</option>
                  <option value="madalas">Madalas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                  <option value="mens">Mens</option>
                  <option value="womens">Womens</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            {formData.type === 'junior' && (
              <div>
                <label className="block text-sm font-medium mb-2">Age Group</label>
                <select
                  required
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value as AgeGroup })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="U10">U10</option>
                  <option value="U12">U12</option>
                  <option value="U14">U14</option>
                  <option value="U16">U16</option>
                  <option value="U18">U18</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Draw Type</label>
                <select
                  required
                  value={formData.drawType}
                  onChange={(e) => setFormData({ ...formData, drawType: e.target.value as DrawType })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="single_elimination">Single Elimination</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="feed_in">Feed-in (Compass)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Entries</label>
                <Input
                  type="number"
                  min="4"
                  required
                  value={formData.maxEntries}
                  onChange={(e) => setFormData({ ...formData, maxEntries: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit">Add Category</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
