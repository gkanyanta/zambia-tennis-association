import { useState } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react'
import { players } from '@/data/playerData'
import type { Player, PaymentStatus } from '@/types/player'

const getStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
    case 'overdue':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Overdue</Badge>
  }
}

export function Players() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'junior' | 'senior' | 'madalas'>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  const filteredPlayers = players.filter(player => {
    const matchesSearch =
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.zpin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.clubName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || player.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getPaymentSummary = () => {
    const summary = {
      totalPlayers: players.length,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      totalRevenue: 0,
    }

    players.forEach(player => {
      const currentYearPayment = player.zpinPayments.find(p => p.year === 2025)
      if (currentYearPayment) {
        if (currentYearPayment.status === 'paid') {
          summary.paidCount++
          summary.totalRevenue += currentYearPayment.amount
        } else if (currentYearPayment.status === 'pending') {
          summary.pendingCount++
        } else {
          summary.overdueCount++
        }
      }
    })

    return summary
  }

  const summary = getPaymentSummary()

  return (
    <div className="flex flex-col">
      <Hero
        title="Player Database"
        description="Manage player registrations and ZPIN (Zambia Player Identification Number) payments"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Players</p>
                    <p className="text-3xl font-bold">{summary.totalPlayers}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ZPIN Paid (2025)</p>
                    <p className="text-3xl font-bold text-primary">{summary.paidCount}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-3xl font-bold text-secondary">{summary.pendingCount}</p>
                  </div>
                  <Clock className="h-12 w-12 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-3xl font-bold text-destructive">{summary.overdueCount}</p>
                  </div>
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ZPIN, or club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'junior' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('junior')}
              >
                Juniors
              </Button>
              <Button
                variant={selectedCategory === 'senior' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('senior')}
              >
                Seniors
              </Button>
              <Button
                variant={selectedCategory === 'madalas' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('madalas')}
              >
                Madalas
              </Button>
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </div>

          {/* Players Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ZPIN</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Club</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">2025 ZPIN</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlayers.map((player) => {
                      const currentPayment = player.zpinPayments.find(p => p.year === 2025)
                      return (
                        <tr key={player.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium">{player.zpin}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{player.firstName} {player.lastName}</div>
                              <div className="text-sm text-muted-foreground">{player.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize">{player.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium">{player.clubName}</div>
                              <div className="text-muted-foreground">{player.city}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{player.phone}</td>
                          <td className="px-4 py-3 text-center">
                            {currentPayment ? (
                              <div className="flex flex-col items-center gap-1">
                                {getStatusBadge(currentPayment.status)}
                                <span className="text-xs text-muted-foreground">
                                  K{currentPayment.amount}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline">Not Set</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPlayer(player)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredPlayers.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No players found matching your search criteria
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Player Details Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
                <Badge className="capitalize">{selectedPlayer.category}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">ZPIN:</span>
                    <p className="font-mono font-medium">{selectedPlayer.zpin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <p className="font-medium">{new Date(selectedPlayer.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <p className="font-medium capitalize">{selectedPlayer.gender}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">National ID:</span>
                    <p className="font-medium">{selectedPlayer.nationalId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedPlayer.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedPlayer.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Club:</span>
                    <p className="font-medium">{selectedPlayer.clubName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{selectedPlayer.city}, {selectedPlayer.province}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="font-semibold mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedPlayer.emergencyContact}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedPlayer.emergencyPhone}</p>
                  </div>
                </div>
              </div>

              {/* ZPIN Payment History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  ZPIN Payment History
                </h4>
                <div className="space-y-2">
                  {selectedPlayer.zpinPayments
                    .sort((a, b) => b.year - a.year)
                    .map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">Year {payment.year}</div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                            {payment.paidDate && ` | Paid: ${new Date(payment.paidDate).toLocaleDateString()}`}
                          </div>
                          {payment.receiptNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              Receipt: {payment.receiptNumber}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">K{payment.amount}</div>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button variant="outline" onClick={() => setSelectedPlayer(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
