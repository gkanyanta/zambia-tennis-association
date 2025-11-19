import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Save } from 'lucide-react'
import type { TournamentCategory, DrawType, CategoryType, Gender, AgeGroup } from '@/types/tournament'

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

  const [categories, setCategories] = useState<Partial<TournamentCategory>[]>([])
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: API call to create tournament
      console.log('Creating tournament:', { ...formData, categories })
      // navigate('/admin/tournaments')
    } catch (error) {
      console.error('Error creating tournament:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCategory = (category: Partial<TournamentCategory>) => {
    setCategories([...categories, { ...category, id: `cat-${Date.now()}`, entries: [] }])
    setShowCategoryForm(false)
  }

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index))
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

            {/* Categories */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tournament Categories</CardTitle>
                  <Button type="button" onClick={() => setShowCategoryForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No categories added yet. Click "Add Category" to create one.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {categories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.type} • {category.gender} • {category.ageGroup || 'Open'} • {category.drawType?.replace('_', ' ')}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeCategory(index)}>
                          <X className="h-4 w-4" />
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
              <Button type="submit" disabled={loading || categories.length === 0}>
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

      {showCategoryForm && (
        <CategoryFormModal
          onClose={() => setShowCategoryForm(false)}
          onSubmit={addCategory}
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
