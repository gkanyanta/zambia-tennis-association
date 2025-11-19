import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Match } from '@/types/tournament'

interface MatchResultDialogProps {
  match: Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (result: { winner: string; score: string }) => Promise<void>
}

export function MatchResultDialog({ match, open, onOpenChange, onSubmit }: MatchResultDialogProps) {
  const [selectedWinner, setSelectedWinner] = useState<string>('')
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedWinner || !score) {
      alert('Please select a winner and enter a score')
      return
    }

    setLoading(true)
    try {
      await onSubmit({ winner: selectedWinner, score })
      // Reset form
      setSelectedWinner('')
      setScore('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting result:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!match || !match.player1 || !match.player2 || match.player1.isBye || match.player2.isBye) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Match Result</DialogTitle>
          <DialogDescription>
            Record the result for this match. Select the winner and enter the score.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Match Info */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Match</div>
              <div className="text-sm text-muted-foreground">
                Round {match.round} - Match #{match.matchNumber}
              </div>
            </div>

            {/* Winner Selection */}
            <div className="space-y-3">
              <Label>Select Winner</Label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => match.player1 && setSelectedWinner(match.player1.id)}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    match.player1 && selectedWinner === match.player1.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">{match.player1?.name}</div>
                  {match.player1?.seed && (
                    <div className="text-sm text-muted-foreground">Seed #{match.player1.seed}</div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => match.player2 && setSelectedWinner(match.player2.id)}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    match.player2 && selectedWinner === match.player2.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">{match.player2?.name}</div>
                  {match.player2?.seed && (
                    <div className="text-sm text-muted-foreground">Seed #{match.player2.seed}</div>
                  )}
                </button>
              </div>
            </div>

            {/* Score Input */}
            <div className="space-y-2">
              <Label htmlFor="score">Score</Label>
              <Input
                id="score"
                placeholder="e.g., 6-4 6-3 or 6-4 4-6 10-8"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the score in standard tennis format (e.g., 6-4 6-3)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedWinner || !score}>
              {loading ? 'Saving...' : 'Save Result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
