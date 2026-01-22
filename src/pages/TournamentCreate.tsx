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
  { code: 'B10U', name: 'Boys 10 & Under', gender: 'boys' as const, maxAge: 10, type: 'junior' as const },
  { code: 'B12U', name: 'Boys 12 & Under', gender: 'boys' as const, maxAge: 12, type: 'junior' as const },
  { code: 'B14U', name: 'Boys 14 & Under', gender: 'boys' as const, maxAge: 14, type: 'junior' as const },
  { code: 'B16U', name: 'Boys 16 & Under', gender: 'boys' as const, maxAge: 16, type: 'junior' as const },
  { code: 'B18U', name: 'Boys 18 & Under', gender: 'boys' as const, maxAge: 18, type: 'junior' as const },
  { code: 'G10U', name: 'Girls 10 & Under', gender: 'girls' as const, maxAge: 10, type: 'junior' as const },
  { code: 'G12U', name: 'Girls 12 & Under', gender: 'girls' as const, maxAge: 12, type: 'junior' as const },
  { code: 'G14U', name: 'Girls 14 & Under', gender: 'girls' as const, maxAge: 14, type: 'junior' as const },
  { code: 'G16U', name: 'Girls 16 & Under', gender: 'girls' as const, maxAge: 16, type: 'junior' as const },
  { code: 'G18U', name: 'Girls 18 & Under', gender: 'girls' as const, maxAge: 18, type: 'junior' as const },
]

// Senior categories (Open age)
const SENIOR_CATEGORIES = [
  { code: 'MS', name: "Men's Singles", gender: 'mens' as const, type: 'senior' as const },
  { code: 'WS', name: "Women's Singles", gender: 'womens' as const, type: 'senior' as const },
  { code: 'MD', name: "Men's Doubles", gender: 'mens' as const, type: 'senior' as const },
  { code: 'WD', name: "Women's Doubles", gender: 'womens' as const, type: 'senior' as const },
  { code: 'XD', name: "Mixed Doubles", gender: 'mixed' as const, type: 'senior' as const },
]

// Madalas categories (Veterans 35+)
const MADALAS_CATEGORIES = [
  { code: 'M35S', name: "Men's 35+ Singles", gender: 'mens' as const, minAge: 35, type: 'madalas' as const },
  { code: 'M45S', name: "Men's 45+ Singles", gender: 'mens' as const, minAge: 45, type: 'madalas' as const },
  { code: 'M55S', name: "Men's 55+ Singles", gender: 'mens' as const, minAge: 55, type: 'madalas' as const },
  { code: 'M65S', name: "Men's 65+ Singles", gender: 'mens' as const, minAge: 65, type: 'madalas' as const },
  { code: 'W35S', name: "Women's 35+ Singles", gender: 'womens' as const, minAge: 35, type: 'madalas' as const },
  { code: 'W45S', name: "Women's 45+ Singles", gender: 'womens' as const, minAge: 45, type: 'madalas' as const },
  { code: 'W55S', name: "Women's 55+ Singles", gender: 'womens' as const, minAge: 55, type: 'madalas' as const },
  { code: 'M35D', name: "Men's 35+ Doubles", gender: 'mens' as const, minAge: 35, type: 'madalas' as const },
  { code: 'M45D', name: "Men's 45+ Doubles", gender: 'mens' as const, minAge: 45, type: 'madalas' as const },
  { code: 'M55D', name: "Men's 55+ Doubles", gender: 'mens' as const, minAge: 55, type: 'madalas' as const },
  { code: 'W35D', name: "Women's 35+ Doubles", gender: 'womens' as const, minAge: 35, type: 'madalas' as const },
  { code: 'W45D', name: "Women's 45+ Doubles", gender: 'womens' as const, minAge: 45, type: 'madalas' as const },
  { code: 'XD35', name: "Mixed Doubles 35+", gender: 'mixed' as const, minAge: 35, type: 'madalas' as const },
  { code: 'XD45', name: "Mixed Doubles 45+", gender: 'mixed' as const, minAge: 45, type: 'madalas' as const },
]

type TournamentType = 'junior' | 'senior' | 'madalas' | 'mixed'

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

  // Tournament type and categories
  const [tournamentType, setTournamentType] = useState<TournamentType>('junior')
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

  const getCurrentCategories = () => {
    switch (tournamentType) {
      case 'junior': return JUNIOR_CATEGORIES
      case 'senior': return SENIOR_CATEGORIES
      case 'madalas': return MADALAS_CATEGORIES
      case 'mixed': return [...JUNIOR_CATEGORIES, ...SENIOR_CATEGORIES, ...MADALAS_CATEGORIES]
      default: return JUNIOR_CATEGORIES
    }
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

  const selectAllMens = () => {
    const newSelected = new Set(selectedCategories)
    const cats = tournamentType === 'senior' ? SENIOR_CATEGORIES : MADALAS_CATEGORIES
    cats.filter(c => c.gender === 'mens').forEach(c => newSelected.add(c.code))
    setSelectedCategories(newSelected)
  }

  const selectAllWomens = () => {
    const newSelected = new Set(selectedCategories)
    const cats = tournamentType === 'senior' ? SENIOR_CATEGORIES : MADALAS_CATEGORIES
    cats.filter(c => c.gender === 'womens').forEach(c => newSelected.add(c.code))
    setSelectedCategories(newSelected)
  }

  const selectAll = () => {
    setSelectedCategories(new Set(getCurrentCategories().map(c => c.code)))
  }

  const clearAll = () => {
    setSelectedCategories(new Set())
  }

  // Clear selections when tournament type changes
  const handleTournamentTypeChange = (type: TournamentType) => {
    setTournamentType(type)
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

      const allCategories = [...JUNIOR_CATEGORIES, ...SENIOR_CATEGORIES, ...MADALAS_CATEGORIES]

      const categories = Array.from(selectedCategories).map(code => {
        const cat = allCategories.find(c => c.code === code)!

        // Build category object based on type
        const categoryData: any = {
          categoryCode: cat.code,
          name: cat.name,
          type: cat.type,
          gender: cat.gender,
          drawType,
          maxEntries,
          entries: []
        }

        // Add age-specific fields based on category type
        if (cat.type === 'junior' && 'maxAge' in cat) {
          categoryData.ageGroup = `U${cat.maxAge}`
          categoryData.maxAge = cat.maxAge
          categoryData.ageCalculationDate = dec31.toISOString()
        } else if (cat.type === 'madalas' && 'minAge' in cat) {
          categoryData.ageGroup = `${cat.minAge}+`
          categoryData.minAge = cat.minAge
        } else if (cat.type === 'senior') {
          categoryData.ageGroup = 'Open'
        }

        return categoryData
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
                Choose tournament type and select categories
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tournament Type Selector */}
              <div>
                <label className="block text-sm font-medium mb-3">Tournament Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'junior', label: 'Junior', desc: 'Age-based (U10-U18)', color: 'blue' },
                    { value: 'senior', label: 'Senior', desc: 'Open age categories', color: 'green' },
                    { value: 'madalas', label: 'Madalas', desc: 'Veterans (35+)', color: 'purple' },
                    { value: 'mixed', label: 'Mixed', desc: 'All categories', color: 'orange' },
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTournamentTypeChange(type.value as TournamentType)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        tournamentType === type.value
                          ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-950`
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={selectAll} size="sm" variant="secondary">
                  Select All
                </Button>
                {tournamentType === 'junior' && (
                  <>
                    <Button type="button" onClick={selectAllBoys} size="sm" variant="outline">
                      All Boys
                    </Button>
                    <Button type="button" onClick={selectAllGirls} size="sm" variant="outline">
                      All Girls
                    </Button>
                  </>
                )}
                {(tournamentType === 'senior' || tournamentType === 'madalas') && (
                  <>
                    <Button type="button" onClick={selectAllMens} size="sm" variant="outline">
                      All Men's
                    </Button>
                    <Button type="button" onClick={selectAllWomens} size="sm" variant="outline">
                      All Women's
                    </Button>
                  </>
                )}
                <Button type="button" onClick={clearAll} size="sm" variant="ghost">
                  Clear All
                </Button>
              </div>

              {/* Junior Categories */}
              {(tournamentType === 'junior' || tournamentType === 'mixed') && (
                <>
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
                </>
              )}

              {/* Senior Categories */}
              {(tournamentType === 'senior' || tournamentType === 'mixed') && (
                <div>
                  <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">Senior Categories (Open Age)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {SENIOR_CATEGORIES.map(cat => (
                      <label
                        key={cat.code}
                        className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedCategories.has(cat.code)
                            ? 'border-green-500 bg-green-50 dark:bg-green-950'
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
                          <div className="text-xl font-bold mb-1">{cat.code}</div>
                          <div className="text-xs text-muted-foreground">{cat.name}</div>
                        </div>
                        {selectedCategories.has(cat.code) && (
                          <div className="absolute top-2 right-2 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Madalas Categories */}
              {(tournamentType === 'madalas' || tournamentType === 'mixed') && (
                <>
                  <div>
                    <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400">Men's Madalas (Veterans)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {MADALAS_CATEGORIES.filter(c => c.gender === 'mens').map(cat => (
                        <label
                          key={cat.code}
                          className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedCategories.has(cat.code)
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
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
                            <div className="text-lg font-bold mb-1">{cat.code}</div>
                            <div className="text-xs text-muted-foreground">{cat.name}</div>
                          </div>
                          {selectedCategories.has(cat.code) && (
                            <div className="absolute top-2 right-2 h-5 w-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <svg className="h-3 w-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-pink-600 dark:text-pink-400">Women's & Mixed Madalas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {MADALAS_CATEGORIES.filter(c => c.gender === 'womens' || c.gender === 'mixed').map(cat => (
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
                            <div className="text-lg font-bold mb-1">{cat.code}</div>
                            <div className="text-xs text-muted-foreground">{cat.name}</div>
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
                </>
              )}

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
                      <option value="8">8 players/teams</option>
                      <option value="16">16 players/teams</option>
                      <option value="32">32 players/teams</option>
                      <option value="64">64 players/teams</option>
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
