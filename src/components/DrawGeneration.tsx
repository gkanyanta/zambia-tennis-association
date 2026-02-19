import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Grid3x3, RefreshCw, Eye, AlertCircle, FileDown } from 'lucide-react'
import { DrawBracket } from '@/components/DrawBracket'
import { MixerRatingAssignment } from '@/components/MixerRatingAssignment'
import { MixerDrawView } from '@/components/MixerDrawView'
import { MatchResultDialog } from '@/components/MatchResultDialog'
import {
  generateSingleEliminationDraw,
  generateRoundRobinDraw,
  generateFeedInDraw,
  generateMixerDraw
} from '@/utils/drawGenerator'
import { tournamentService } from '@/services/tournamentService'
import type { TournamentCategory, Draw, Match, MixerRating } from '@/types/tournament'

interface DrawGenerationProps {
  category: TournamentCategory
  tournamentId?: string
  categoryId?: string
  onGenerateDraw: (draw: Draw) => Promise<void>
  onUpdateMatch?: (matchId: string, result: { winner: string; score: string }) => Promise<void>
  onRefresh?: () => Promise<void>
}

export function DrawGeneration({ category, tournamentId, categoryId, onGenerateDraw, onUpdateMatch, onRefresh }: DrawGenerationProps) {
  const [previewDraw, setPreviewDraw] = useState<Draw | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showMatchDialog, setShowMatchDialog] = useState(false)

  const acceptedEntries = category.entries.filter(e => e.status === 'accepted')
  const seededEntries = acceptedEntries.filter(e => e.seed).length
  const canGenerateDraw = acceptedEntries.length >= 4

  const mixerRatings = (category as any).mixerRatings as MixerRating[] | undefined
  const hasMixerRatings = mixerRatings && mixerRatings.length > 0
  const isMixer = category.drawType === 'mixer'
  const canGenerateMixer = isMixer && hasMixerRatings

  const handleSaveMixerRatings = async (ratings: MixerRating[]) => {
    if (!tournamentId || !categoryId) return
    await tournamentService.updateMixerRatings(tournamentId, categoryId, ratings)
    if (onRefresh) await onRefresh()
  }

  const handleMixerCourtResult = async (roundNumber: number, courtNumber: number, pair1GamesWon: number, pair2GamesWon: number) => {
    if (!tournamentId || !categoryId) return
    await tournamentService.updateMixerCourtResult(tournamentId, categoryId, roundNumber, courtNumber, { pair1GamesWon, pair2GamesWon })
    if (onRefresh) await onRefresh()
  }

  const handleGeneratePreview = () => {
    let draw: Draw

    switch (category.drawType) {
      case 'single_elimination':
        draw = generateSingleEliminationDraw(acceptedEntries)
        break
      case 'round_robin':
        draw = generateRoundRobinDraw(acceptedEntries)
        break
      case 'feed_in':
        draw = generateFeedInDraw(acceptedEntries)
        break
      case 'mixer':
        if (!mixerRatings) return
        draw = generateMixerDraw(acceptedEntries, mixerRatings)
        break
      default:
        return
    }

    setPreviewDraw(draw)
    setShowPreview(true)
  }

  const handleSaveDraw = async () => {
    if (!previewDraw) return

    setLoading(true)
    try {
      await onGenerateDraw(previewDraw)
      setShowPreview(false)
    } catch (error) {
      console.error('Error saving draw:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateDraw = async () => {
    const confirmed = confirm(
      'Are you sure you want to regenerate the draw? This will replace the existing draw and all match results will be lost.'
    )

    if (!confirmed) return

    handleGeneratePreview()
  }

  const handleMatchResultSubmit = async (result: { winner: string; score: string }) => {
    if (!selectedMatch || !onUpdateMatch) return

    try {
      const matchId = (selectedMatch as any)._id || selectedMatch.id
      await onUpdateMatch(matchId, result)
    } catch (error) {
      console.error('Error submitting match result:', error)
      throw error
    }
  }

  if (category.draw && !showPreview) {
    // Mixer draw has its own view
    if (category.draw.type === 'mixer') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Mixer Draw Generated</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generated on {new Date(category.draw.generatedAt).toLocaleString()}
                    {' '}&bull; {category.draw.mixerRounds?.length || 0} rounds
                  </p>
                </div>
                <Button variant="outline" onClick={handleRegenerateDraw}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Draw
                </Button>
              </div>
            </CardHeader>
          </Card>
          <MixerDrawView
            rounds={(category.draw as any).mixerRounds || []}
            standings={(category.draw as any).mixerStandings || []}
            finalized={category.draw.finalized}
            finalStandings={category.draw.standings as any}
            onCourtResult={handleMixerCourtResult}
          />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Draw Generated</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Generated on {new Date(category.draw.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                {tournamentId && categoryId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const apiUrl = import.meta.env.VITE_API_URL || ''
                      window.open(`${apiUrl}/api/tournaments/${tournamentId}/categories/${categoryId}/draw/pdf`, '_blank')
                    }}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                )}
                <Button variant="outline" onClick={handleRegenerateDraw}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Draw
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Draw Type:</span>
                <Badge variant="outline" className="ml-2">
                  {category.draw.type.replace('_', ' ')}
                </Badge>
              </div>
              {category.draw.bracketSize && (
                <div>
                  <span className="text-muted-foreground">Bracket Size:</span>
                  <Badge variant="outline" className="ml-2">
                    {category.draw.bracketSize} players
                  </Badge>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Total Matches:</span>
                <Badge variant="outline" className="ml-2">
                  {category.draw.matches.length}
                </Badge>
              </div>
            </div>
            <DrawBracket draw={category.draw} onMatchClick={(match) => {
              if (onUpdateMatch && match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye) {
                setSelectedMatch(match)
                setShowMatchDialog(true)
              }
            }} />
          </CardContent>
        </Card>

        <MatchResultDialog
          match={selectedMatch}
          open={showMatchDialog}
          onOpenChange={setShowMatchDialog}
          onSubmit={handleMatchResultSubmit}
        />
      </div>
    )
  }

  if (showPreview && previewDraw) {
    return (
      <div className="space-y-6">
        <Card className="border-primary">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{previewDraw.type === 'mixer' ? 'Mixer Draw Preview' : 'Draw Preview'}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDraw} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Draw'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Review the draw carefully before saving. Once saved, the draw will be published to players.
              </AlertDescription>
            </Alert>
            {previewDraw.type === 'mixer' ? (
              <MixerDrawView
                rounds={previewDraw.mixerRounds || []}
                standings={previewDraw.mixerStandings || []}
              />
            ) : (
              <DrawBracket draw={previewDraw} />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Draw Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{acceptedEntries.length}</div>
              <div className="text-sm text-muted-foreground">Accepted Entries</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{seededEntries}</div>
              <div className="text-sm text-muted-foreground">Seeded Players</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold capitalize">{category.drawType.replace('_', ' ')}</div>
              <div className="text-sm text-muted-foreground">Draw Type</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{category.maxEntries}</div>
              <div className="text-sm text-muted-foreground">Max Entries</div>
            </div>
          </div>

          {/* Mixer Rating Assignment */}
          {isMixer && canGenerateDraw && (
            <MixerRatingAssignment
              entries={category.entries}
              existingRatings={mixerRatings}
              onSave={handleSaveMixerRatings}
            />
          )}

          {!canGenerateDraw ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need at least 4 accepted entries to generate a draw. Currently have {acceptedEntries.length}.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Before generating the draw:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ensure all eligible entries have been accepted</li>
                  <li>Assign seeds to top players based on national rankings</li>
                  <li>Verify player information is correct</li>
                  <li>Check that the draw type is appropriate for the number of entries</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {seededEntries > 0 && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-3">Seeded Players</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {acceptedEntries
                  .filter(e => e.seed)
                  .sort((a, b) => (a.seed || 99) - (b.seed || 99))
                  .map(entry => (
                    <div key={entry.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="default">Seed {entry.seed}</Badge>
                      <span className="font-medium">{entry.playerName}</span>
                      {entry.ranking && (
                        <span className="text-muted-foreground">(Rank #{entry.ranking})</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleGeneratePreview}
              disabled={!canGenerateDraw || loading || (isMixer && !canGenerateMixer)}
              size="lg"
            >
              <Grid3x3 className="h-5 w-5 mr-2" />
              {isMixer ? 'Generate Mixer Draw' : 'Generate Draw'}
            </Button>
            <Button
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={!canGenerateDraw || (isMixer && !canGenerateMixer)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Draw
            </Button>
          </div>
          {isMixer && !hasMixerRatings && canGenerateDraw && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Assign A/B ratings to all players above before generating the mixer draw.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
