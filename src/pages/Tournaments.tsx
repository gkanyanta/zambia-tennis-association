import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { TournamentCard } from '@/components/TournamentCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { tournamentService, Tournament } from '@/services/tournamentService';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';

export function Tournaments() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    category: 'Open',
    status: 'upcoming',
    maxParticipants: 0,
    entryFee: 0
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournaments();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await tournamentService.updateTournament(editingId, formData);
        alert('Tournament updated successfully!');
      } else {
        await tournamentService.createTournament(formData);
        alert('Tournament created successfully!');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        date: '',
        location: '',
        category: 'Open',
        status: 'upcoming',
        maxParticipants: 0,
        entryFee: 0
      });
      await fetchTournaments();
    } catch (err: any) {
      alert(err.message || 'Failed to save tournament');
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setFormData({
      name: tournament.name,
      description: tournament.description,
      date: tournament.date,
      location: tournament.location,
      category: tournament.category,
      status: tournament.status,
      maxParticipants: tournament.maxParticipants || 0,
      entryFee: tournament.entryFee
    });
    setEditingId(tournament._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await tournamentService.deleteTournament(id);
      alert('Tournament deleted successfully!');
      await fetchTournaments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete tournament');
    }
  };

  const handleRegister = async (tournamentId: string, tournamentName: string) => {
    if (!isAuthenticated) {
      alert('Please login to register for tournaments');
      return;
    }

    const category = prompt('Enter your category (e.g., Men\'s Singles, Women\'s Singles):');
    if (!category) return;

    try {
      await tournamentService.registerForTournament(tournamentId, category);
      alert(`Successfully registered for ${tournamentName}! Check your email for confirmation.`);
      await fetchTournaments();
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    }
  };

  const upcomingTournaments = tournaments.filter(
    t => t.status === 'upcoming' || t.status === 'registration-open'
  );
  const completedTournaments = tournaments.filter(t => t.status === 'completed');

  return (
    <div className="flex flex-col">
      <Hero
        title="Tennis Tournaments"
        description="Compete in sanctioned tournaments across Zambia and climb the national rankings"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Admin Controls */}
          {isAdmin && (
            <div className="mb-8">
              <Button onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setEditingId(null);
                  setFormData({
                    name: '',
                    description: '',
                    date: '',
                    location: '',
                    category: 'Open',
                    status: 'upcoming',
                    maxParticipants: 0,
                    entryFee: 0
                  });
                }
              }}>
                <Plus className="h-4 w-4 mr-2" />
                {showForm ? 'Cancel' : 'Create Tournament'}
              </Button>
            </div>
          )}

          {/* Create/Edit Form */}
          {isAdmin && showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Tournament' : 'Create New Tournament'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tournament Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date *</label>
                      <Input
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        placeholder="e.g., March 15-20, 2025"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location *</label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      >
                        <option value="Open">Open</option>
                        <option value="Junior">Junior</option>
                        <option value="Madalas">Madalas</option>
                        <option value="Regional">Regional</option>
                        <option value="Circuit">Circuit</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="registration-open">Registration Open</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Max Participants</label>
                      <Input
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Entry Fee (K)</label>
                      <Input
                        type="number"
                        value={formData.entryFee}
                        onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description *</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingId ? 'Update Tournament' : 'Create Tournament'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Tournaments */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-3xl font-bold text-foreground">
                Upcoming Tournaments
              </h2>
              <Badge variant="success">{upcomingTournaments.length} Events</Badge>
            </div>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading tournaments...</div>
            ) : upcomingTournaments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No upcoming tournaments</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTournaments.map((tournament) => (
                  <div key={tournament._id}>
                    <TournamentCard
                      {...tournament}
                      participants={tournament.registrations?.length || 0}
                      onRegister={() => handleRegister(tournament._id, tournament.name)}
                    />
                    {isAdmin && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(tournament)} className="flex-1">
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(tournament._id)} className="flex-1">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tournament Calendar Info */}
          <div className="bg-muted/50 rounded-lg p-8 mb-16">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Tournament Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Registration</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Online registration available for open events</li>
                  <li>• Valid ZTA membership required</li>
                  <li>• Entry fees vary by tournament category</li>
                  <li>• Early bird discounts available</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tournament Categories</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Open: All skill levels welcome</li>
                  <li>• Junior: U12, U14, U16, U18 age groups</li>
                  <li>• Madalas: 35+, 45+, 55+ age categories</li>
                  <li>• Regional: Provincial championships</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Ranking Points</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• National events: Maximum points</li>
                  <li>• Regional events: Standard points</li>
                  <li>• Circuit events: Bonus accumulation</li>
                  <li>• Rankings updated bi-monthly</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Player Resources</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• View complete tournament calendar</li>
                  <li>• Download tournament regulations</li>
                  <li>• Check your ranking position</li>
                  <li>• Access past results</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Completed Tournaments */}
          {completedTournaments.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8">
                Recent Results
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTournaments.map((tournament) => (
                  <div key={tournament._id}>
                    <TournamentCard {...tournament} participants={tournament.registrations?.length || 0} />
                    {isAdmin && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(tournament)} className="flex-1">
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(tournament._id)} className="flex-1">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
