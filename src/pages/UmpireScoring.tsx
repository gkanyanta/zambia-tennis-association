import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Undo2, MoreVertical, Pause, Play, XCircle, Trophy, Clock, EyeOff, Eye, Settings } from 'lucide-react'
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

export function UmpireScoring() {
  const { liveMatchId } = useParams()
  const navigate = useNavigate()
  const { match, loading, error, setFirstServer, awardPoint, undoPoint, suspendMatch, resumeMatch, endMatch, cancelLiveScoring, updateSettings, toggleVisibility } = useLiveMatch(liveMatchId)

  const [menuOpen, setMenuOpen] = useState(false)
  const [firstServerConfirmed, setFirstServerConfirmed] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [endReason, setEndReason] = useState<string>('retirement')
  const [endWinner, setEndWinner] = useState<string>('')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
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

  const handleCancelLiveScoring = async () => {
    setActionLoading(true)
    try {
      await cancelLiveScoring()
      setCancelDialogOpen(false)
      navigate('/umpire')
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
        <Button variant="outline" onClick={() => navigate('/umpire')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    )
  }

  const isCompleted = match.status === 'completed'
  const isSuspended = match.status === 'suspended'
  const isWarmup = match.status === 'warmup'
  const hasNoPoints = !match.matchState.pointHistory?.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/umpire')}>
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
          {(match as any).hiddenFromScoreboard && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <EyeOff className="h-3 w-3 mr-1" /> Hidden from Scoreboard
            </Badge>
          )}
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
              onClick={() => navigate('/umpire')}
            >
              Back to Dashboard
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

      {/* First Server Selection - warmup with no points scored */}
      {isWarmup && hasNoPoints && !firstServerConfirmed && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1">Who serves first?</h2>
            <p className="text-sm text-muted-foreground">Select after the coin toss</p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button
              onClick={async () => { await setFirstServer(0) }}
              disabled={actionLoading}
              className={`flex items-center justify-center rounded-xl border-2 p-6 transition-colors min-h-[100px] ${
                match.matchState.server === 0
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
              }`}
            >
              <span className="text-lg font-bold text-center">{match.player1.name}</span>
            </button>
            <button
              onClick={async () => { await setFirstServer(1) }}
              disabled={actionLoading}
              className={`flex items-center justify-center rounded-xl border-2 p-6 transition-colors min-h-[100px] ${
                match.matchState.server === 1
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
              }`}
            >
              <span className="text-lg font-bold text-center">{match.player2.name}</span>
            </button>
          </div>
          <Button
            className="mt-6 w-full max-w-sm"
            size="lg"
            onClick={() => setFirstServerConfirmed(true)}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Scoring
          </Button>
        </div>
      )}

      {/* Point Buttons - when live, or warmup after confirming first server */}
      {!isCompleted && !isSuspended && (!isWarmup || firstServerConfirmed || !hasNoPoints) && (
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
                        onClick={() => { setMenuOpen(false); setSettingsDialogOpen(true) }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                      >
                        <Settings className="h-4 w-4 inline mr-2" /> Match Settings
                      </button>
                      <button
                        onClick={handleSuspend}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                      >
                        <Pause className="h-4 w-4 inline mr-2" /> Suspend Match
                      </button>
                      <button
                        onClick={async () => { setMenuOpen(false); await toggleVisibility() }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                      >
                        {(match as any)?.hiddenFromScoreboard
                          ? <><Eye className="h-4 w-4 inline mr-2" /> Show on Scoreboard</>
                          : <><EyeOff className="h-4 w-4 inline mr-2" /> Hide from Scoreboard</>
                        }
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setCancelDialogOpen(true) }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-muted text-orange-600"
                      >
                        <XCircle className="h-4 w-4 inline mr-2" /> Cancel Live Scoring
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
      {/* Cancel Live Scoring Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Live Scoring</DialogTitle>
            <DialogDescription>
              This will stop live scoring and remove it from the scoreboard. The match result in the draw will not be affected — you can score it manually instead.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelLiveScoring}
              disabled={actionLoading}
            >
              Cancel Live Scoring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Settings Dialog */}
      {match && (
        <MatchSettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          settings={match.matchState.settings}
          onSave={async (s) => {
            setActionLoading(true)
            try {
              await updateSettings(s)
              setSettingsDialogOpen(false)
            } finally {
              setActionLoading(false)
            }
          }}
          saving={actionLoading}
        />
      )}
    </div>
  )
}

function MatchSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
  saving
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: import('@/types/liveMatch').MatchSettings
  onSave: (settings: Partial<import('@/types/liveMatch').MatchSettings>) => Promise<void>
  saving: boolean
}) {
  const [bestOf, setBestOf] = useState(settings.bestOf)
  const [tiebreakAt, setTiebreakAt] = useState(settings.tiebreakAt)
  const [finalSetTiebreak, setFinalSetTiebreak] = useState(settings.finalSetTiebreak)
  const [finalSetTiebreakTo, setFinalSetTiebreakTo] = useState(settings.finalSetTiebreakTo)
  const [noAd, setNoAd] = useState(settings.noAd)

  // Sync local state when dialog opens with fresh settings
  useEffect(() => {
    if (open) {
      setBestOf(settings.bestOf)
      setTiebreakAt(settings.tiebreakAt)
      setFinalSetTiebreak(settings.finalSetTiebreak)
      setFinalSetTiebreakTo(settings.finalSetTiebreakTo)
      setNoAd(settings.noAd)
    }
  }, [open, settings])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Match Settings</DialogTitle>
          <DialogDescription>
            Update scoring rules for this match. Changes apply from the next point onwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Best Of</label>
            <select
              className="w-full mt-1 border rounded-md p-2 bg-background"
              value={bestOf}
              onChange={(e) => setBestOf(Number(e.target.value) as 3 | 5)}
            >
              <option value={1}>1 Set</option>
              <option value={3}>3 Sets</option>
              <option value={5}>5 Sets</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Games per Set (Tiebreak At)</label>
            <select
              className="w-full mt-1 border rounded-md p-2 bg-background"
              value={tiebreakAt}
              onChange={(e) => setTiebreakAt(Number(e.target.value))}
            >
              <option value={4}>4 (Short Sets)</option>
              <option value={6}>6 (Standard)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">No-Ad Scoring</label>
            <button
              type="button"
              role="switch"
              aria-checked={noAd}
              onClick={() => setNoAd(!noAd)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${noAd ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${noAd ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Final Set Match Tiebreak</label>
            <button
              type="button"
              role="switch"
              aria-checked={finalSetTiebreak}
              onClick={() => setFinalSetTiebreak(!finalSetTiebreak)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${finalSetTiebreak ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${finalSetTiebreak ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {finalSetTiebreak && (
            <div>
              <label className="text-sm font-medium">Match Tiebreak Points</label>
              <select
                className="w-full mt-1 border rounded-md p-2 bg-background"
                value={finalSetTiebreakTo}
                onChange={(e) => setFinalSetTiebreakTo(Number(e.target.value))}
              >
                <option value={7}>7 Points</option>
                <option value={10}>10 Points (Super Tiebreak)</option>
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ bestOf, tiebreakAt, finalSetTiebreak, finalSetTiebreakTo, noAd })}
            disabled={saving}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
