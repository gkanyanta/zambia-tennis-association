import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X, Save, Users } from 'lucide-react'
import { tournamentService, Tournament } from '@/services/tournamentService'
import { apiFetch } from '@/services/api'

interface Props {
  tournament: Tournament
  onRefresh: () => Promise<void>
}

interface PlayerResult {
  _id: string
  firstName: string
  lastName: string
  zpin?: string
}

export function UmpirePoolAdmin({ tournament, onRefresh }: Props) {
  const [pool, setPool] = useState<Array<{ userId: string; name: string }>>(
    () => (tournament as any).umpirePool || []
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlayerResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync pool when tournament data changes externally
  useEffect(() => {
    setPool((tournament as any).umpirePool || [])
    setDirty(false)
  }, [tournament])

  // Debounced player search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await apiFetch(`/users?role=player&search=${encodeURIComponent(searchQuery.trim())}`)
        setSearchResults(data.data || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery])

  const addPlayer = (player: PlayerResult) => {
    if (pool.some(p => p.userId === player._id)) return
    setPool(prev => [...prev, { userId: player._id, name: `${player.firstName} ${player.lastName}` }])
    setDirty(true)
    setSearchQuery('')
    setSearchResults([])
  }

  const removePlayer = (userId: string) => {
    setPool(prev => prev.filter(p => p.userId !== userId))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await tournamentService.updateUmpirePool(tournament._id, pool)
      setDirty(false)
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to save umpire pool')
    } finally {
      setSaving(false)
    }
  }

  // Filter out players already in the pool from search results
  const filteredResults = searchResults.filter(
    r => !pool.some(p => p.userId === r._id)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Umpire Pool
              <Badge variant="secondary">{pool.length} player{pool.length !== 1 ? 's' : ''}</Badge>
            </CardTitle>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select players who will umpire matches at this tournament. When starting a live match, the Chair Umpire dropdown will show only these players.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border rounded-md"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Searching...
              </span>
            )}
          </div>

          {/* Search Results */}
          {filteredResults.length > 0 && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {filteredResults.map(player => (
                <button
                  key={player._id}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-left text-sm border-b last:border-b-0"
                  onClick={() => addPlayer(player)}
                >
                  <span>{player.firstName} {player.lastName}</span>
                  <span className="text-xs text-muted-foreground">{player.zpin || 'No ZPIN'}</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim().length >= 2 && !searching && filteredResults.length === 0 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No players found</p>
          )}

          {/* Current Pool */}
          {pool.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No umpires added yet. Search for players above to add them to the pool.
            </div>
          ) : (
            <div className="space-y-2">
              {pool.map((umpire) => (
                <div
                  key={umpire.userId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium text-sm">{umpire.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    onClick={() => removePlayer(umpire.userId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
