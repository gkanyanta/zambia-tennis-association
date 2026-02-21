import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Undo2, MoreVertical, Pause, Play, XCircle, Trophy, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScoreDisplay } from '@/components/live/ScoreDisplay'
import { useLiveMatch } from '@/hooks/useLiveMatch'
import { getScoreString } from '@/utils/tennisScoring'

export function LiveScoring() {
  const { tournamentId, liveMatchId } = useParams()
  const navigate = useNavigate()
  const { match, loading, error, awardPoint, undoPoint, suspendMatch, resumeMatch, endMatch } = useLiveMatch(liveMatchId)

  const [menuOpen, setMenuOpen] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [endReason, setEndReason] = useState<string>('retirement')
  const [endWinner, setEndWinner] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Match duration timer
  useEffect(() => {
    if (!match) return
    const startTime = match.startedAt || match.createdAt
    if (!startTime) return
    const isRunning = match.status === 'live' || match.status === 'warmup'

    const calcElapsed = () => Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
    setElapsed(calcElapsed())

    if (!isRunning) return
    const interval = setInterval(() => setElapsed(calcElapsed()), 1000)
    return () => clearInterval(interval)
  }, [match?.startedAt, match?.createdAt, match?.status])

  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleAwardPoint = async (playerIndex: 0 | 1) => {
    if (actionLoading) return
    setActionLoading(true)

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)

    try {
      await awardPoint(playerIndex)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUndo = async () => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await undoPoint()
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async () => {
    setMenuOpen(false)
    await suspendMatch()
  }

  const handleResume = async () => {
    setMenuOpen(false)
    await resumeMatch()
  }

  const handleEndMatch = async () => {
    if (!endWinner) return
    setActionLoading(true)
    try {
      await endMatch(endWinner, endReason)
      setEndDialogOpen(false)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="container-custom py-8">
        <p className="text-destructive">{error || 'Match not found'}</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    )
  }

  const isCompleted = match.status === 'completed'
  const isSuspended = match.status === 'suspended'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/tournaments/${tournamentId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center flex-1 mx-2">
            <div className="text-sm font-medium truncate">{match.tournamentName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {match.categoryName} - {match.roundName}
            </div>
          </div>
          <Badge variant={
            match.status === 'live' ? 'destructive' :
            match.status === 'suspended' ? 'outline' :
            match.status === 'completed' ? 'default' : 'secondary'
          }>
            {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-1">
          {match.court && <span>Court {match.court}</span>}
          {(match.startedAt || match.createdAt) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-mono font-medium text-foreground">{formatElapsed(elapsed)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Score Display */}
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <ScoreDisplay
              matchState={match.matchState}
              player1Name={match.player1.name}
              player2Name={match.player2.name}
              player1Seed={match.player1.seed}
              player2Seed={match.player2.seed}
            />
          </CardContent>
        </Card>
      </div>

      {/* Completed State */}
      {isCompleted && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Match Complete</h2>
            <p className="text-muted-foreground mb-1">
              {match.matchState.winner === 0 ? match.player1.name : match.player2.name} wins
            </p>
            <p className="font-mono text-lg">{getScoreString(match.matchState)}</p>
            <Button
              className="mt-6"
              onClick={() => navigate(`/admin/tournaments/${tournamentId}`)}
            >
              Back to Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Suspended State */}
      {isSuspended && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Match Suspended</h2>
            <Button onClick={handleResume} className="mt-4">
              <Play className="h-4 w-4 mr-2" /> Resume Match
            </Button>
          </div>
        </div>
      )}

      {/* Point Buttons - only when live or warmup */}
      {!isCompleted && !isSuspended && (
        <div className="flex-1 flex flex-col p-4 gap-4">
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            {/* Player 1 Button */}
            <button
              onClick={() => handleAwardPoint(0)}
              disabled={actionLoading}
              className="flex items-center justify-center rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 active:bg-primary/20 transition-colors min-h-[120px] disabled:opacity-50"
            >
              <div className="text-center px-2">
                <div className="text-lg font-bold leading-tight">{match.player1.name}</div>
                {match.player1.seed && (
                  <div className="text-sm text-muted-foreground">[{match.player1.seed}]</div>
                )}
              </div>
            </button>

            {/* Player 2 Button */}
            <button
              onClick={() => handleAwardPoint(1)}
              disabled={actionLoading}
              className="flex items-center justify-center rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 active:bg-primary/20 transition-colors min-h-[120px] disabled:opacity-50"
            >
              <div className="text-center px-2">
                <div className="text-lg font-bold leading-tight">{match.player2.name}</div>
                {match.player2.seed && (
                  <div className="text-sm text-muted-foreground">[{match.player2.seed}]</div>
                )}
              </div>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleUndo}
              disabled={actionLoading || !match.matchState.pointHistory?.length}
            >
              <Undo2 className="h-4 w-4 mr-2" /> Undo
            </Button>

            {/* Menu */}
            <div className="relative">
              <Button variant="outline" onClick={() => setMenuOpen(!menuOpen)}>
                <MoreVertical className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-background border z-50">
                    <div className="py-1">
                      <button
                        onClick={handleSuspend}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                      >
                        <Pause className="h-4 w-4 inline mr-2" /> Suspend Match
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setEndDialogOpen(true) }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted text-destructive"
                      >
                        <XCircle className="h-4 w-4 inline mr-2" /> End Match
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* End Match Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Match</DialogTitle>
            <DialogDescription>
              End this match early due to retirement, walkover, or default.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Winner</label>
              <select
                className="w-full mt-1 border rounded-md p-2 bg-background"
                value={endWinner}
                onChange={(e) => setEndWinner(e.target.value)}
              >
                <option value="">Select winner</option>
                <option value={match.player1.id}>{match.player1.name}</option>
                <option value={match.player2.id}>{match.player2.name}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <select
                className="w-full mt-1 border rounded-md p-2 bg-background"
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
              >
                <option value="retirement">Retirement</option>
                <option value="walkover">Walkover</option>
                <option value="default">Default</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndMatch}
              disabled={!endWinner || actionLoading}
            >
              End Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
