import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Save } from 'lucide-react'
import type { TournamentEntry, MixerRating } from '@/types/tournament'

interface MixerRatingAssignmentProps {
  entries: TournamentEntry[]
  existingRatings?: MixerRating[]
  onSave: (ratings: MixerRating[]) => Promise<void>
}

export function MixerRatingAssignment({ entries, existingRatings, onSave }: MixerRatingAssignmentProps) {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')
  const [ratings, setRatings] = useState<Map<string, 'A' | 'B'>>(new Map())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existingRatings && existingRatings.length > 0) {
      const map = new Map<string, 'A' | 'B'>()
      existingRatings.forEach(r => map.set(r.playerId, r.rating))
      setRatings(map)
    }
  }, [existingRatings])

  const toggleRating = (playerId: string, rating: 'A' | 'B') => {
    const newRatings = new Map(ratings)
    if (newRatings.get(playerId) === rating) {
      newRatings.delete(playerId)
    } else {
      newRatings.set(playerId, rating)
    }
    setRatings(newRatings)
  }

  const aCount = Array.from(ratings.values()).filter(r => r === 'A').length
  const bCount = Array.from(ratings.values()).filter(r => r === 'B').length
  const allRated = ratings.size === acceptedEntries.length
  const isBalanced = Math.abs(aCount - bCount) <= 1

  const handleSave = async () => {
    const ratingsList: MixerRating[] = acceptedEntries
      .filter(e => ratings.has(e.playerId))
      .map(e => ({
        playerId: e.playerId,
        playerName: e.playerName,
        gender: e.gender,
        rating: ratings.get(e.playerId)!
      }))

    setSaving(true)
    try {
      await onSave(ratingsList)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign A/B Ratings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rate each player as A (stronger) or B (weaker). A and B players will be paired together for mixer doubles.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Badge variant={aCount > 0 ? 'default' : 'secondary'}>
            {aCount} A-rated
          </Badge>
          <Badge variant={bCount > 0 ? 'default' : 'secondary'}>
            {bCount} B-rated
          </Badge>
          <span className="text-sm text-muted-foreground">
            {acceptedEntries.length - ratings.size} unrated
          </span>
          {!isBalanced && ratings.size > 0 && (
            <Badge variant="destructive">Unbalanced</Badge>
          )}
        </div>

        {!isBalanced && ratings.size > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A and B groups should have roughly equal numbers. Currently {aCount} A vs {bCount} B.
            </AlertDescription>
          </Alert>
        )}

        {/* Players table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Player Name</th>
                <th className="px-4 py-3 text-left font-semibold">Gender</th>
                <th className="px-4 py-3 text-left font-semibold">Club</th>
                <th className="px-4 py-3 text-center font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {acceptedEntries.map(entry => {
                const currentRating = ratings.get(entry.playerId)
                return (
                  <tr key={entry.playerId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{entry.playerName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {entry.gender}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.clubName}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant={currentRating === 'A' ? 'default' : 'outline'}
                          className={currentRating === 'A' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                          onClick={() => toggleRating(entry.playerId, 'A')}
                        >
                          A
                        </Button>
                        <Button
                          size="sm"
                          variant={currentRating === 'B' ? 'default' : 'outline'}
                          className={currentRating === 'B' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                          onClick={() => toggleRating(entry.playerId, 'B')}
                        >
                          B
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={!allRated || !isBalanced || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Ratings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
