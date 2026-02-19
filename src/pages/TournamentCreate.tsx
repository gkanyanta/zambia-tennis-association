import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Calendar, MapPin, Users, Phone, FileText, Trophy, Settings } from 'lucide-react'
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

// Madalas categories (Veterans 35+) — all mixed gender
const MADALAS_CATEGORIES = [
  { code: '35S', name: "35+ Singles", gender: 'mixed' as const, minAge: 35, type: 'madalas' as const },
  { code: '45S', name: "45+ Singles", gender: 'mixed' as const, minAge: 45, type: 'madalas' as const },
  { code: '55S', name: "55+ Singles", gender: 'mixed' as const, minAge: 55, type: 'madalas' as const },
  { code: '65S', name: "65+ Singles", gender: 'mixed' as const, minAge: 65, type: 'madalas' as const },
  { code: '35D', name: "35+ Doubles", gender: 'mixed' as const, minAge: 35, type: 'madalas' as const },
  { code: '45D', name: "45+ Doubles", gender: 'mixed' as const, minAge: 45, type: 'madalas' as const },
  { code: '55D', name: "55+ Doubles", gender: 'mixed' as const, minAge: 55, type: 'madalas' as const },
  { code: 'XD35', name: "Mixed Doubles 35+", gender: 'mixed' as const, minAge: 35, type: 'madalas' as const },
  { code: 'XD45', name: "Mixed Doubles 45+", gender: 'mixed' as const, minAge: 45, type: 'madalas' as const },
]

type TournamentType = 'junior' | 'senior' | 'madalas' | 'mixed'

export function TournamentCreate() {
  const navigate = useNavigate()
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const isEditMode = !!tournamentId
  const [loading, setLoading] = useState(false)
  const [loadingTournament, setLoadingTournament] = useState(false)

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
  const [drawType, setDrawType] = useState<'single_elimination' | 'round_robin' | 'feed_in' | 'mixer'>('single_elimination')
  const [maxEntries, setMaxEntries] = useState(32)

  // Registration settings
  const [tournamentLevel, setTournamentLevel] = useState<'club' | 'regional' | 'national' | 'international'>('regional')
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true)
  const [allowMultipleCategories, setAllowMultipleCategories] = useState(false)
  const [requirePaymentUpfront, setRequirePaymentUpfront] = useState(false)

  // Fetch tournament data for edit mode
  useEffect(() => {
    if (!tournamentId) return
    const fetchTournament = async () => {
      setLoadingTournament(true)
      try {
        const t = await tournamentService.getTournament(tournamentId)
        setName(t.name)
        setDescription(t.description || '')
        setStartDate(t.startDate ? t.startDate.slice(0, 10) : '')
        setEndDate(t.endDate ? t.endDate.slice(0, 10) : '')
        setVenue(t.venue)
        setCity(t.city || '')
        setProvince(t.province || '')
        setEntryDeadline(t.entryDeadline ? t.entryDeadline.slice(0, 10) : '')
        setEntryFee(t.entryFee || 0)
        setOrganizer(t.organizer || 'Zambia Tennis Association')
        setContactEmail(t.contactEmail || '')
        setContactPhone(t.contactPhone || '')
        setRules((t as any).rules || '')
        setPrizes((t as any).prizes || '')
        setTournamentLevel((t as any).tournamentLevel || 'regional')
        setAllowPublicRegistration((t as any).allowPublicRegistration ?? true)
        setAllowMultipleCategories((t as any).allowMultipleCategories ?? false)
        setRequirePaymentUpfront((t as any).requirePaymentUpfront ?? false)

        // Determine tournament type from categories
        if (t.categories?.length > 0) {
          const types = new Set(t.categories.map((c: any) => c.type))
          if (types.size > 1) {
            setTournamentType('mixed')
          } else {
            const type = t.categories[0].type as TournamentType
            setTournamentType(type || 'junior')
          }

          // Pre-select categories by matching codes
          const allCats = [...JUNIOR_CATEGORIES, ...SENIOR_CATEGORIES, ...MADALAS_CATEGORIES]
          const codes = new Set<string>()
          t.categories.forEach((c: any) => {
            const match = allCats.find(ac => ac.code === c.categoryCode)
            if (match) codes.add(match.code)
          })
          setSelectedCategories(codes)

          // Use draw settings from first category
          if (t.categories[0].drawType) setDrawType(t.categories[0].drawType as any)
          if (t.categories[0].maxEntries) setMaxEntries(t.categories[0].maxEntries)
        }
      } catch (error: any) {
        console.error('Error fetching tournament:', error)
        alert('Failed to load tournament for editing')
        navigate('/admin/tournaments')
      } finally {
        setLoadingTournament(false)
      }
    }
    fetchTournament()
  }, [tournamentId])

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
    SENIOR_CATEGORIES.filter(c => c.gender === 'mens').forEach(c => newSelected.add(c.code))
    setSelectedCategories(newSelected)
  }

  const selectAllWomens = () => {
    const newSelected = new Set(selectedCategories)
    SENIOR_CATEGORIES.filter(c => c.gender === 'womens').forEach(c => newSelected.add(c.code))
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

      const tournamentData = {
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
        categories,
        // Registration settings
        tournamentLevel,
        allowPublicRegistration,
        allowMultipleCategories,
        requirePaymentUpfront
      } as any

      if (isEditMode) {
        await tournamentService.updateTournament(tournamentId!, tournamentData)
        alert('Tournament updated successfully!')
      } else {
        await tournamentService.createTournament(tournamentData)
        alert('Tournament created successfully!')
      }
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
        title={isEditMode ? 'Edit Tournament' : 'Create New Tournament'}
        description={isEditMode ? 'Update tournament details and categories' : 'Set up a new tennis tournament with categories and entry details'}
        gradient
      />

      <div className="container-custom max-w-5xl py-8">
        <Button
          variant="outline"
          onClick={() => navigate(isEditMode ? `/admin/tournaments/${tournamentId}` : '/admin/tournaments')}
          className="mb-6"
        >
          {isEditMode ? '← Back to Tournament' : '← Back to Tournaments'}
        </Button>

        {loadingTournament ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading tournament...</span>
          </div>
        ) : (
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
                {tournamentType === 'senior' && (
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

              {/* Madalas Categories (Veterans) */}
              {(tournamentType === 'madalas' || tournamentType === 'mixed') && (
                <div>
                  <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400">Madalas Categories (Veterans)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MADALAS_CATEGORIES.map(cat => (
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
                      {(tournamentType === 'madalas' || tournamentType === 'mixed') && (
                        <option value="mixer">Mixer (Social Doubles with A/B Pairs)</option>
                      )}
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

          {/* Registration Settings */}
          <Card className="border-t-4 border-t-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Registration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tournament Level */}
              <div>
                <label className="block text-sm font-medium mb-2">Tournament Level</label>
                <select
                  value={tournamentLevel}
                  onChange={(e) => setTournamentLevel(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="club">Club Level</option>
                  <option value="regional">Regional</option>
                  <option value="national">National</option>
                  <option value="international">International</option>
                </select>
              </div>

              {/* Registration Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Allow Public Registration</div>
                    <div className="text-sm text-muted-foreground">
                      Anyone can register players without logging in
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPublicRegistration}
                      onChange={(e) => setAllowPublicRegistration(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Allow Multiple Categories per Player</div>
                    <div className="text-sm text-muted-foreground">
                      Players can enter more than one category (recommended for regional tournaments)
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowMultipleCategories}
                      onChange={(e) => setAllowMultipleCategories(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Require Payment Upfront</div>
                    <div className="text-sm text-muted-foreground">
                      Entries must be paid during registration (otherwise pay later allowed)
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePaymentUpfront}
                      onChange={(e) => setRequirePaymentUpfront(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* Info about registration flow */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Registration Flow</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>1. Users search and select players from the database</li>
                  <li>2. Select categories for each player</li>
                  <li>3. {requirePaymentUpfront ? 'Pay entry fees to complete registration' : 'Register now, pay later (entries marked as pending payment)'}</li>
                  <li>4. Admin reviews and approves entries</li>
                </ul>
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
              {loading
                ? (isEditMode ? 'Saving Changes...' : 'Creating Tournament...')
                : (isEditMode ? 'Save Changes' : 'Create Tournament')}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
