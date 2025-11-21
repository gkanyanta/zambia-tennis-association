import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Calendar, MapPin, Users, Phone, FileText, Trophy } from 'lucide-react'
import { tournamentService } from '@/services/tournamentService'

// Standard junior categories
const JUNIOR_CATEGORIES = [
  { code: 'B10U', name: 'Boys 10 & Under', gender: 'boys' as const, maxAge: 10 },
  { code: 'B12U', name: 'Boys 12 & Under', gender: 'boys' as const, maxAge: 12 },
  { code: 'B14U', name: 'Boys 14 & Under', gender: 'boys' as const, maxAge: 14 },
  { code: 'B16U', name: 'Boys 16 & Under', gender: 'boys' as const, maxAge: 16 },
  { code: 'B18U', name: 'Boys 18 & Under', gender: 'boys' as const, maxAge: 18 },
  { code: 'G10U', name: 'Girls 10 & Under', gender: 'girls' as const, maxAge: 10 },
  { code: 'G12U', name: 'Girls 12 & Under', gender: 'girls' as const, maxAge: 12 },
  { code: 'G14U', name: 'Girls 14 & Under', gender: 'girls' as const, maxAge: 14 },
  { code: 'G16U', name: 'Girls 16 & Under', gender: 'girls' as const, maxAge: 16 },
  { code: 'G18U', name: 'Girls 18 & Under', gender: 'girls' as const, maxAge: 18 },
]

export function TournamentCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // Form data
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [entryDeadline, setEntryDeadline] = useState('')
  const [entryFee, setEntryFee] = useState(0)
  const [organizer, setOrganizer] = useState('Zambia Tennis Association')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [rules, setRules] = useState('')
  const [prizes, setPrizes] = useState('')

  // Categories
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [drawType, setDrawType] = useState<'single_elimination' | 'round_robin' | 'feed_in'>('single_elimination')
  const [maxEntries, setMaxEntries] = useState(32)

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

  const selectAll = () => {
    setSelectedCategories(new Set(JUNIOR_CATEGORIES.map(c => c.code)))
  }

  const clearAll = () => {
    setSelectedCategories(new Set())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !description || !startDate || !endDate || !venue || !city || !province ||
        !entryDeadline || !organizer || !contactEmail || !contactPhone) {
      alert('Please fill in all required fields marked with *')
      return
    }

    if (selectedCategories.size === 0) {
      alert('Please select at least one category')
      return
    }

    setLoading(true)

    try {
      const tournamentYear = new Date(startDate).getFullYear()
      const dec31 = new Date(tournamentYear, 11, 31, 23, 59, 59)

      const categories = Array.from(selectedCategories).map(code => {
        const cat = JUNIOR_CATEGORIES.find(c => c.code === code)!
        return {
          categoryCode: cat.code,
          name: cat.name,
          type: 'junior' as const,
          gender: cat.gender,
          ageGroup: `U${cat.maxAge}` as any,
          maxAge: cat.maxAge,
          ageCalculationDate: dec31.toISOString(),
          drawType,
          maxEntries,
          entries: []
        }
      })

      await tournamentService.createTournament({
        name,
        description,
        startDate,
        endDate,
        venue,
        city,
        province,
        entryDeadline,
        entryFee,
        organizer,
        contactEmail,
        contactPhone,
        rules,
        prizes,
        categories
      } as any)

      alert('Tournament created successfully!')
      navigate('/admin/tournaments')
    } catch (error: any) {
      console.error('Error creating tournament:', error)
      alert(error.message || 'Failed to create tournament')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Hero
        title="Create New Tournament"
        description="Set up a new tennis tournament with categories and entry details"
        gradient
      />

      <div className="container-custom max-w-5xl py-8">
        <Button
          variant="outline"
          onClick={() => navigate('/admin/tournaments')}
          className="mb-6"
        >
          ← Back to Tournaments
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tournament Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tournament Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., ZTA National Junior Championships 2025"
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Brief description of the tournament..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dates & Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Entry Deadline <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={entryDeadline}
                    onChange={(e) => setEntryDeadline(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-t-4 border-t-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Tournament Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g., Lusaka Tennis Club"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Lusaka"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="e.g., Lusaka"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Entry Fee */}
          <Card className="border-t-4 border-t-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information & Entry Fee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Organizer <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="e.g., Zambia Tennis Association"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="tournaments@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+260 xxx xxx xxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Entry Fee (K)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories Selection */}
          <Card className="border-t-4 border-t-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Categories
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Choose which age categories will compete (age as of December 31st, {new Date(startDate || Date.now()).getFullYear()})
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={selectAll} size="sm" variant="secondary">
                  Select All 10 Categories
                </Button>
                <Button type="button" onClick={selectAllBoys} size="sm" variant="outline">
                  All Boys (5)
                </Button>
                <Button type="button" onClick={selectAllGirls} size="sm" variant="outline">
                  All Girls (5)
                </Button>
                <Button type="button" onClick={clearAll} size="sm" variant="ghost">
                  Clear All
                </Button>
              </div>

              {/* Boys Categories */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">Boys Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {JUNIOR_CATEGORIES.filter(c => c.gender === 'boys').map(cat => (
                    <label
                      key={cat.code}
                      className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedCategories.has(cat.code)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat.code)}
                        onChange={() => toggleCategory(cat.code)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-1">{cat.code}</div>
                        <div className="text-xs text-muted-foreground">{cat.maxAge} & Under</div>
                      </div>
                      {selectedCategories.has(cat.code) && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Girls Categories */}
              <div>
                <h4 className="font-semibold mb-3 text-pink-600 dark:text-pink-400">Girls Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {JUNIOR_CATEGORIES.filter(c => c.gender === 'girls').map(cat => (
                    <label
                      key={cat.code}
                      className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedCategories.has(cat.code)
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-950'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat.code)}
                        onChange={() => toggleCategory(cat.code)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-1">{cat.code}</div>
                        <div className="text-xs text-muted-foreground">{cat.maxAge} & Under</div>
                      </div>
                      {selectedCategories.has(cat.code) && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-pink-500 rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Selected Count */}
              {selectedCategories.size > 0 && (
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <svg className="h-5 w-5 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'} selected
                  </span>
                </div>
              )}

              {/* Category Settings */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <h4 className="font-semibold">Category Settings (applies to all selected)</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Draw Format</label>
                    <select
                      value={drawType}
                      onChange={(e) => setDrawType(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="single_elimination">Single Elimination (Knockout)</option>
                      <option value="round_robin">Round Robin (Everyone plays everyone)</option>
                      <option value="feed_in">Feed-in (Compass Draw)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Players per Category</label>
                    <select
                      value={maxEntries}
                      onChange={(e) => setMaxEntries(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="8">8 players</option>
                      <option value="16">16 players</option>
                      <option value="32">32 players</option>
                      <option value="64">64 players</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optional Details */}
          <Card className="border-t-4 border-t-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Additional Information (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tournament Rules</label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Any special rules or regulations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prizes</label>
                <textarea
                  value={prizes}
                  onChange={(e) => setPrizes(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Prize information..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end sticky bottom-4 bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/tournaments')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedCategories.size === 0}
              className="min-w-[200px]"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating Tournament...' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
